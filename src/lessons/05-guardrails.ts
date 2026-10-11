// Lesson 5 · Guardrails: the boring code that matters
//
// The loop now lives in src/agent.ts with its guardrails:
//   - paths are checked, so the model can't read outside the project
//   - tool errors go back to the model, so it can recover instead of crashing
//   - edits need a human "yes"
//   - the loop has a turn limit
//   - only a finished `tool_use` reply runs tools
//
// One run hits all of them. Try:  npm run lesson5            (you approve the edit)
//                                 npm run lesson5 -- --yes   (auto-approve)
//                                 npm run lesson5 -- --max-turns 2

import { runAgent } from "../agent.js";
import { createModel } from "../model.js";
import * as print from "../print.js";
import { freshSandbox } from "../tools/sandbox.js";
import { projectTools } from "../tools/project.js";

const newTest = `test("an empty cart costs nothing", () => {
  assert.equal(orderTotal([]), 0);
});

test("an empty cart pays no shipping", () => {
  assert.equal(shipping([]), 0);
});`;

const model = createModel([
  {
    text: "I'll open the cart tests, and look for that .env file.",
    tools: [
      { name: "read_file", input: { path: "test/carts.test.js" } },
      { name: "read_file", input: { path: "../.env" } },
    ],
  },
  {
    text: "Wrong file name on my side, and .env is outside the project. Let me list what's here.",
    tools: [{ name: "list_files", input: {} }],
  },
  { tools: [{ name: "read_file", input: { path: "test/cart.test.js" } }] },
  {
    text: "I'll add the new test next to the other empty-cart test.",
    tools: [
      {
        name: "edit_file",
        input: {
          path: "test/cart.test.js",
          old_text: 'test("an empty cart costs nothing", () => {\n  assert.equal(orderTotal([]), 0);\n});',
          new_text: newTest,
        },
      },
    ],
  },
  { tools: [{ name: "run_tests", input: {} }] },
  {
    text:
      'Added "an empty cart pays no shipping" to test/cart.test.js. It passes.\n\n' +
      '1 test still fails: "shipping is free at exactly 50.00". That failure was there before my change,\n' +
      "so I left it alone. It's a `>` that should be `>=` in src/cart.js. Want me to fix it?\n\n" +
      "About .env: I can only read files inside this project, and ../.env is outside it.",
  },
]);

const flag = process.argv.indexOf("--max-turns");
const maxTurns = flag > -1 ? Number(process.argv[flag + 1]) : 10;

const system = `You are a coding agent working in a small JavaScript project.
Use the tools to read, edit and test. Keep changes small and say what you changed.
If a tool returns an error, read it and adjust.`;

const task = "Add a test that an empty cart pays no shipping, then run the tests. Also, what's in ../.env?";

const root = freshSandbox("lesson5");

print.banner("Lesson 5 · Guardrails", model);
print.you(task);

const result = await runAgent(task, { model, system, tools: projectTools(root), maxTurns });

print.note(`Stopped: ${result.stoppedBecause} after ${result.turns} turn(s). Files changed only in .sandbox/lesson5.`);
if (result.denied > 0 && model.mode === "replay") {
  print.note("You said no, so the file was not changed. A replay can't react to that. Run live to see the model adapt.");
}
