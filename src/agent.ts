// The agent loop from lesson 3, with the guardrails from lesson 5.
// This is the harness. The model is the brain, but this file decides what actually happens.

import { createInterface } from "node:readline/promises";
import { textOf, toolCallsOf, type MessageParam, type Model, type ToolResult } from "./model.js";
import * as print from "./print.js";
import { ToolError, type AgentTool } from "./tools/project.js";

export interface AgentOptions {
  model: Model;
  system: string;
  tools: AgentTool[];
  /** Hard stop, whatever the model wants. */
  maxTurns?: number;
  /** Tool names whose calls are not printed (e.g. the to-do list, which prints itself). */
  quiet?: string[];
}

export interface AgentResult {
  answer: string;
  turns: number;
  stoppedBecause: "done" | "max_turns" | "max_tokens" | "refusal" | "other";
  denied: number;
}

export async function runAgent(task: string, options: AgentOptions): Promise<AgentResult> {
  const { model, system, tools, maxTurns = 20, quiet = [] } = options;
  const definitions = tools.map((t) => t.tool);
  const messages: MessageParam[] = [{ role: "user", content: task }];
  let denied = 0;

  for (let turn = 1; turn <= maxTurns; turn++) {
    print.turn(turn);
    const reply = await model.ask({ system, messages, tools: definitions });
    print.modelSays(textOf(reply));

    // Guardrail: only run tools when the model actually finished asking for them.
    // A reply cut off by max_tokens or a refusal can contain a half-written tool call.
    if (reply.stop_reason !== "tool_use") {
      const stoppedBecause =
        reply.stop_reason === "end_turn"
          ? "done"
          : reply.stop_reason === "max_tokens" || reply.stop_reason === "refusal"
            ? reply.stop_reason
            : "other";
      return { answer: textOf(reply), turns: turn, stoppedBecause, denied };
    }

    messages.push({ role: "assistant", content: reply.content });
    const results: ToolResult[] = [];

    for (const call of toolCallsOf(reply)) {
      const input = call.input as Record<string, string>;
      const agentTool = tools.find((t) => t.tool.name === call.name);
      if (!quiet.includes(call.name)) print.toolCall(call.name, input);

      // Guardrail: a person approves anything that changes files.
      if (agentTool?.needsApproval && !(await approve(call.name, input))) {
        denied++;
        print.toolResult("declined by the user", true);
        results.push(errorResult(call.id, "The user declined this change. Ask them what they want instead."));
        continue;
      }

      // Guardrail: tool failures go back to the model as errors it can read and recover from.
      try {
        if (!agentTool) throw new ToolError(`Unknown tool "${call.name}".`);
        const output = agentTool.run(input);
        if (!quiet.includes(call.name)) print.toolResult(output);
        results.push({ type: "tool_result", tool_use_id: call.id, content: output });
      } catch (error) {
        if (!(error instanceof ToolError)) throw error; // our bug, not the model's. Crash loudly.
        print.toolResult(error.message, true);
        results.push(errorResult(call.id, error.message));
      }
    }

    messages.push({ role: "user", content: results });
  }

  // Guardrail: a loop that never ends is a bill that never ends.
  print.note(`Stopped after ${maxTurns} turns.`);
  return { answer: "", turns: maxTurns, stoppedBecause: "max_turns", denied };
}

function errorResult(id: string, message: string): ToolResult {
  return { type: "tool_result", tool_use_id: id, content: message, is_error: true };
}

async function approve(name: string, input: Record<string, string>): Promise<boolean> {
  if (process.argv.includes("--yes")) return true;
  if (!process.stdin.isTTY) return false; // nobody to ask, so the answer is no

  if (name === "edit_file") {
    console.log(print.red(prefixLines(input.old_text, "- ")));
    console.log(print.green(prefixLines(input.new_text, "+ ")));
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(print.bold(print.yellow(`       Allow ${name} on ${input.path}? [y/N] `)));
  rl.close();
  return answer.trim().toLowerCase().startsWith("y");
}

function prefixLines(text: string, prefix: string) {
  return text
    .split("\n")
    .map((line) => `       ${prefix}${line}`)
    .join("\n");
}
