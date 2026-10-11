// Lesson 2 · Your first real tool call
//
// Same idea as lesson 1, but structured: we describe the tool with a JSON schema,
// and the API hands us typed `tool_use` blocks instead of a line of text to parse.
// This code does exactly one round of tools, then expects an answer.
//
//   npm run lesson2                 one round is enough
//   npm run lesson2 -- --follow-up  the model needs a second round, and this code can't give it one

import { readFileSync } from "node:fs";
import { createModel, textOf, toolCallsOf, type MessageParam, type Tool, type ToolResult } from "../model.js";
import * as print from "../print.js";

const followUp = process.argv.includes("--follow-up");

const model = createModel(
  followUp
    ? [
        { text: "I'll start with the tests.", tools: [{ name: "read_file", input: { path: "test/cart.test.js" } }] },
        {
          text: 'My guess is "shipping is free at exactly 50.00", but I need to see shipping() to be sure.',
          tools: [{ name: "read_file", input: { path: "src/cart.js" } }],
        },
      ]
    : [
        { tools: [{ name: "read_file", input: { path: "src/money.js" } }] },
        { text: 'formatPrice(1749) returns the string "17.49". It divides by 100 and keeps two decimals.' },
      ],
);

// The tool, described for the model. The description is a prompt. Write it like one.
const readFileTool: Tool = {
  name: "read_file",
  description: "Read a text file from the project. Paths are relative to the project root, e.g. src/cart.js.",
  strict: true,
  input_schema: {
    type: "object",
    properties: { path: { type: "string", description: "Relative path of the file to read." } },
    required: ["path"],
    additionalProperties: false,
  },
};

// The tool, implemented by us. The model never runs this. We do.
function readFile(path: string) {
  return readFileSync(new URL(`../../playground/${path}`, import.meta.url), "utf8");
}

const question = followUp ? "Which test in this project fails, and why?" : "What does formatPrice return for 1749?";

print.banner("Lesson 2 · Your first real tool call", model);
print.you(question);

const tools = [readFileTool];
const messages: MessageParam[] = [{ role: "user", content: question }];

let reply = await model.ask({ messages, tools });
print.modelSays(textOf(reply));

if (reply.stop_reason === "tool_use") {
  // A reply can hold several tool calls. Answer every one, all in a single message.
  const results: ToolResult[] = [];
  for (const call of toolCallsOf(reply)) {
    const input = call.input as { path: string };
    print.toolCall(call.name, input);
    const content = readFile(input.path);
    print.toolResult(content);
    results.push({ type: "tool_result", tool_use_id: call.id, content });
  }

  // Send back the model's own turn, then the results, linked by tool_use_id.
  messages.push({ role: "assistant", content: reply.content });
  messages.push({ role: "user", content: results });

  reply = await model.ask({ messages, tools });
  print.modelSays(textOf(reply));
}

if (reply.stop_reason === "tool_use") {
  const wanted = toolCallsOf(reply).map((call) => `${call.name}(${JSON.stringify(call.input)})`);
  print.note(
    `The model wants another round: ${wanted.join(", ")}.\n` +
      "This code stops after one, so there's no answer. Lesson 3 lets the model take as many rounds as it needs.",
  );
} else {
  print.note("One question, one round of tools, two requests. The model chose the tool. Our code ran it.");
}
