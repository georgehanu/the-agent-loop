// Lesson 3 · Keep going until it's done
//
// Lesson 2 allowed one round of tools. Here the model gets as many rounds as it needs:
// ask, run whatever it asked for, report back, and repeat until it answers without a tool.

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createModel, textOf, toolCallsOf, type MessageParam, type Tool, type ToolResult } from "../model.js";
import * as print from "../print.js";

const model = createModel([
  { text: "Let me see what's in the project first.", tools: [{ name: "list_files", input: {} }] },
  {
    text: "I'll read the cart module and its tests side by side.",
    tools: [
      { name: "read_file", input: { path: "src/cart.js" } },
      { name: "read_file", input: { path: "test/cart.test.js" } },
    ],
  },
  {
    text:
      'The test "shipping is free at exactly 50.00" fails.\n\n' +
      "The cart in that test is 2 × 12.50 + 25.00 = 50.00, so the subtotal is 5000 cents.\n" +
      "`shipping()` checks `subtotal(items) > FREE_SHIPPING_FROM`, and 5000 > 5000 is false,\n" +
      "so it charges 4.99. Changing `>` to `>=` matches the test and the README.",
  },
]);

const root = new URL("../../playground/", import.meta.url);

const tools: Tool[] = [
  {
    name: "list_files",
    description: "List every file in the project, one relative path per line.",
    strict: true,
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    name: "read_file",
    description: "Read a text file from the project. Paths are relative to the project root, e.g. src/cart.js.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { path: { type: "string", description: "Relative path of the file to read." } },
      required: ["path"],
      additionalProperties: false,
    },
  },
];

// One function that maps a tool name to our code.
function runTool(name: string, input: Record<string, string>): string {
  switch (name) {
    case "list_files":
      return readdirSync(root, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => relative(fileURLToPath(root), join(entry.parentPath, entry.name)).replaceAll("\\", "/"))
        .join("\n");
    case "read_file":
      return readFileSync(new URL(input.path, root), "utf8");
    default:
      return `Unknown tool: ${name}`;
  }
}

const question = "Compare src/cart.js with its tests. Which test fails, and why?";

print.banner("Lesson 3 · Keep going until it's done", model);
print.you(question);

const messages: MessageParam[] = [{ role: "user", content: question }];
let turn = 1;
print.turn(turn);
let reply = await model.ask({ messages, tools });
print.modelSays(textOf(reply));

// Keep going for as long as the model asks for tools. It decides when it's done.
while (reply.stop_reason === "tool_use") {
  messages.push({ role: "assistant", content: reply.content });

  // Every tool call in this turn, all results in one message (lesson 2).
  const results: ToolResult[] = [];
  for (const call of toolCallsOf(reply)) {
    print.toolCall(call.name, call.input);
    const output = runTool(call.name, call.input as Record<string, string>);
    print.toolResult(output);
    results.push({ type: "tool_result", tool_use_id: call.id, content: output });
  }
  messages.push({ role: "user", content: results });

  print.turn(++turn);
  reply = await model.ask({ messages, tools });
  print.modelSays(textOf(reply));
}

print.note(
  `${turn} turns, ${messages.length + 1} messages. The model decided when it was done.\n` +
    "That's an agent: a model, some tools, and a loop that runs until the job is done.",
);
