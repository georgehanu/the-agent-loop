// Lesson 4 · Give it a to-do list
//
// The loop from lesson 3, plus one tool: update_todos.
// The tool does almost nothing. It stores a list and prints it.
// But a model that writes its plan down tends to follow it, and now you can watch it think in steps.

import { createModel, textOf, toolCallsOf, type MessageParam, type ToolResult } from "../model.js";
import * as print from "../print.js";
import { freshSandbox } from "../tools/sandbox.js";
import { projectTools } from "../tools/project.js";
import { todoList } from "../tools/todos.js";

const model = createModel([
  {
    text: "I'll plan this first.",
    tools: [
      {
        name: "update_todos",
        input: {
          todos: [
            { task: "Read the cart module", status: "in_progress" },
            { task: "Read its tests", status: "pending" },
            { task: "Run the test suite", status: "pending" },
            { task: "Write the review", status: "pending" },
          ],
        },
      },
    ],
  },
  {
    tools: [
      { name: "read_file", input: { path: "src/cart.js" } },
      { name: "read_file", input: { path: "test/cart.test.js" } },
      {
        name: "update_todos",
        input: {
          todos: [
            { task: "Read the cart module", status: "done" },
            { task: "Read its tests", status: "done" },
            { task: "Run the test suite", status: "in_progress" },
            { task: "Write the review", status: "pending" },
          ],
        },
      },
    ],
  },
  {
    tools: [
      { name: "run_tests", input: {} },
      {
        name: "update_todos",
        input: {
          todos: [
            { task: "Read the cart module", status: "done" },
            { task: "Read its tests", status: "done" },
            { task: "Run the test suite", status: "done" },
            { task: "Write the review", status: "in_progress" },
          ],
        },
      },
    ],
  },
  {
    text:
      "Review of src/cart.js\n\n" +
      "1. Bug: free shipping uses `>`, so an order of exactly 50.00 pays 4.99.\n" +
      "   The README and the failing test both say free shipping starts at 50.00. Use `>=`.\n" +
      "2. No input checks: a negative quantity or price lowers the subtotal instead of failing.\n" +
      "3. shipping() recalculates the subtotal. Fine at this size, worth knowing if carts get big.\n\n" +
      "5 of 6 tests pass. Only #1 needs fixing now.",
  },
]);

const system = `You are a careful code reviewer working in a small JavaScript project.
Before you start, write a short plan with update_todos. Keep it updated as you work.
Do not change any files.`;

const question = "Review src/cart.js for bugs and missing edge cases. Keep the report short.";

const root = freshSandbox("lesson4");
const todos = todoList();
const agentTools = [...projectTools(root).filter((t) => t.tool.name !== "edit_file"), todos.tool];
const tools = agentTools.map((t) => t.tool);

print.banner("Lesson 4 · Give it a to-do list", model);
print.you(question);

const messages: MessageParam[] = [{ role: "user", content: question }];
let turn = 1;
print.turn(turn);
let reply = await model.ask({ system, messages, tools });
print.modelSays(textOf(reply));

while (reply.stop_reason === "tool_use") {
  messages.push({ role: "assistant", content: reply.content });

  const results: ToolResult[] = [];
  for (const call of toolCallsOf(reply)) {
    const agentTool = agentTools.find((t) => t.tool.name === call.name);
    if (call.name !== "update_todos") print.toolCall(call.name, call.input);
    const output = agentTool ? agentTool.run(call.input as Record<string, string>) : `Unknown tool: ${call.name}`;
    if (call.name !== "update_todos") print.toolResult(output);
    results.push({ type: "tool_result", tool_use_id: call.id, content: output });
  }
  messages.push({ role: "user", content: results });

  print.turn(++turn);
  reply = await model.ask({ system, messages, tools });
  print.modelSays(textOf(reply));
}

print.note("Same loop as lesson 3. The plan lives in the conversation, so the model can see its own progress.");
