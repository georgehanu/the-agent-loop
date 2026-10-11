// Lesson 6 · A mini coding agent
//
// Everything together: the loop, five tools, a to-do list, and the guardrails.
// Give it a failing test suite and it plans, investigates, asks before it edits, and checks its work.
//
//   npm run agent                          the default task, on a fresh copy of the playground
//   npm run agent -- "your task"           your own task (live mode)
//   npm run agent -- --dir ../my-project   point it at another Node project (live mode, use a copy!)

import { resolve } from "node:path";
import { runAgent } from "../agent.js";
import { createModel, type Reply } from "../model.js";
import * as print from "../print.js";
import { freshSandbox } from "../tools/sandbox.js";
import { projectTools } from "../tools/project.js";
import { todoList } from "../tools/todos.js";

const DEFAULT_TASK = "The tests are failing. Find out why and fix it.";

const system = `You are a small coding agent working inside one JavaScript project.

How you work:
- Start by writing a short plan with update_todos. Keep exactly one item in_progress and update the list as you go.
- Look before you change anything: run the tests, read the relevant files.
- Make the smallest change that fixes the problem. Prefer fixing the code over changing a test,
  unless the test is clearly wrong. Never delete a test to make the suite pass.
- After an edit, run the tests again.
- Finish with a short summary: what was wrong, what you changed, and the test result.`;

// ── settings from the command line ──────────────────────────────────────────
const args = process.argv.slice(2);
const dirFlag = args.indexOf("--dir");
const ownDir = dirFlag > -1 ? resolve(args[dirFlag + 1]) : undefined;
const dirValue = dirFlag > -1 ? dirFlag + 1 : -1;
const customTask = args.find((arg, i) => !arg.startsWith("--") && i !== dirValue);
const task = customTask ?? DEFAULT_TASK;

const model = createModel(customTask || ownDir ? [] : replay());
if (model.mode === "replay" && (customTask || ownDir)) {
  console.error("Custom tasks and --dir need live mode. Set ANTHROPIC_API_KEY (see .env.example).");
  process.exit(1);
}

const root = ownDir ?? freshSandbox("agent");
const todos = todoList();

print.banner("Lesson 6 · A mini coding agent", model);
console.log(print.dim(`working in ${root}\n`));
print.you(task);

const result = await runAgent(task, {
  model,
  system,
  tools: [...projectTools(root), todos.tool],
  maxTurns: 25,
  quiet: ["update_todos"],
});

print.note(`Stopped: ${result.stoppedBecause} after ${result.turns} turn(s).`);
if (result.denied > 0 && model.mode === "replay") {
  print.note("You declined the edit, so nothing changed. A replay can't adapt to that. Run live to see the model ask what you want instead.");
}

// ── the pre-written replies for replay mode ─────────────────────────────────
function replay(): Reply[] {
  const plan = (statuses: ("pending" | "in_progress" | "done")[]) => ({
    name: "update_todos",
    input: {
      todos: [
        "Run the tests and find the failure",
        "Read the code under test",
        "Fix the bug",
        "Run the tests again",
      ].map((task, i) => ({ task, status: statuses[i] })),
    },
  });

  return [
    {
      text: "Plan first.",
      tools: [plan(["in_progress", "pending", "pending", "pending"])],
    },
    { tools: [{ name: "run_tests", input: {} }] },
    {
      text: '"shipping is free at exactly 50.00" fails: expected 0, got 499. Reading the code.',
      tools: [
        plan(["done", "in_progress", "pending", "pending"]),
        { name: "read_file", input: { path: "src/cart.js" } },
        { name: "read_file", input: { path: "README.md" } },
      ],
    },
    {
      text:
        "Found it. shipping() uses `>`, so 5000 cents is not free. The README says free *from* 50.00,\n" +
        "so the test is right and the code is wrong. One character to change.",
      tools: [
        plan(["done", "done", "in_progress", "pending"]),
        {
          name: "edit_file",
          input: {
            path: "src/cart.js",
            old_text: "return subtotal(items) > FREE_SHIPPING_FROM ? 0 : SHIPPING_COST;",
            new_text: "return subtotal(items) >= FREE_SHIPPING_FROM ? 0 : SHIPPING_COST;",
          },
        },
      ],
    },
    {
      tools: [plan(["done", "done", "done", "in_progress"]), { name: "run_tests", input: {} }],
    },
    {
      tools: [plan(["done", "done", "done", "done"])],
    },
    {
      text:
        "Fixed.\n\n" +
        "What was wrong: free shipping used `subtotal > 5000`, so an order of exactly 50.00 still paid 4.99.\n" +
        "What I changed: `>` to `>=` in shipping(), src/cart.js. No tests changed.\n" +
        "Result: 6 of 6 tests pass.",
    },
  ];
}
