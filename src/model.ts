// One small wrapper around "ask the model".
//
// Live mode calls Claude through the official Anthropic SDK.
// Replay mode returns pre-written replies, so you can run every lesson without an API key.
// Everything else (the loop, the tools, the messages array) is the same real code in both modes.

import Anthropic from "@anthropic-ai/sdk";

export type Message = Anthropic.Beta.BetaMessage;
export type MessageParam = Anthropic.Beta.BetaMessageParam;
export type Tool = Anthropic.Beta.BetaTool;
export type ToolUseBlock = Anthropic.Beta.BetaToolUseBlock;
export type ToolResult = Anthropic.Beta.BetaToolResultBlockParam;

export interface ModelRequest {
  system?: string;
  messages: MessageParam[];
  tools?: Tool[];
}

export interface Model {
  mode: "live" | "replay";
  name: string;
  ask(request: ModelRequest): Promise<Message>;
}

/** One pre-written model turn: some text, some tool calls, or both. */
export interface Reply {
  text?: string;
  tools?: { name: string; input: Record<string, unknown> }[];
}

try {
  process.loadEnvFile();
} catch {
  // No .env file. That's fine.
}

const DEFAULT_MODEL = "claude-opus-5-5";

export function createModel(replay: Reply[]): Model {
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  const forceReplay = process.argv.includes("--replay");
  return hasKey && !forceReplay ? liveModel() : replayModel(replay);
}

function liveModel(): Model {
  const client = new Anthropic();
  const name = process.env.AGENT_MODEL || DEFAULT_MODEL;
  return {
    mode: "live",
    name,
    ask: ({ system, messages, tools }) =>
      client.beta.messages.create({
        model: name,
        max_tokens: 16000,
        system,
        messages,
        tools,
        output_config: { effort: "medium" },
        // If a request is declined by a safety classifier, retry it on Anthropic's recommended fallback model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      }),
  };
}

function replayModel(script: Reply[]): Model {
  let turn = 0;
  return {
    mode: "replay",
    name: "replay",
    async ask({ messages }) {
      checkToolResults(messages);
      const reply = script[turn++];
      if (!reply) throw new Error("The replay script has no more replies. Add your API key to run live.");

      const content: Anthropic.Beta.BetaContentBlock[] = [];
      if (reply.text) content.push({ type: "text", text: reply.text, citations: null });
      for (const call of reply.tools ?? []) {
        content.push({
          type: "tool_use",
          id: `toolu_replay_${String(turn).padStart(2, "0")}_${content.length}`,
          name: call.name,
          input: call.input,
        });
      }
      const usesTools = content.some((block) => block.type === "tool_use");
      return {
        id: `msg_replay_${turn}`,
        type: "message",
        role: "assistant",
        model: "replay",
        content,
        stop_reason: usesTools ? "tool_use" : "end_turn",
        stop_sequence: null,
      } as unknown as Message;
    },
  };
}

// The real API rejects a conversation where a tool_use has no matching tool_result
// in the very next user message. Replay mode enforces the same rule, so mistakes fail the same way.
function checkToolResults(messages: MessageParam[]) {
  messages.forEach((message, index) => {
    if (message.role !== "assistant" || typeof message.content === "string") return;
    const callIds = message.content.flatMap((block) => (block.type === "tool_use" ? [block.id] : []));
    if (callIds.length === 0) return;

    const next = messages[index + 1];
    if (!next) return; // the last assistant turn, nothing to check yet
    const answered = new Set(
      typeof next.content === "string"
        ? []
        : next.content.flatMap((block) => (block.type === "tool_result" ? [block.tool_use_id] : [])),
    );
    const missing = callIds.filter((id) => !answered.has(id));
    if (missing.length > 0) {
      throw new Error(
        `400 invalid_request_error: messages.${index + 1}: tool_use ids were found without ` +
          `tool_result blocks immediately after: ${missing.join(", ")}`,
      );
    }
  });
}

/** All the text blocks of a reply, joined. */
export function textOf(message: Message): string {
  return message.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("\n")
    .trim();
}

/** All the tool calls of a reply. */
export function toolCallsOf(message: Message): ToolUseBlock[] {
  return message.content.filter((block): block is ToolUseBlock => block.type === "tool_use");
}
