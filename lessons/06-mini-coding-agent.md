---
title: A mini coding agent
lesson: 6
code: src/lessons/06-mini-coding-agent.ts
run: npm run agent
---

# Lesson 6 · A mini coding agent

Everything together: the loop from lesson 3, the to-do list from lesson 4, the guardrails from lesson 5, and five tools.

| Tool | What it does | Approval |
| --- | --- | --- |
| `list_files` | Lists the project's files | no |
| `read_file` | Reads one file | no |
| `edit_file` | Replaces one exact piece of text | **yes** |
| `run_tests` | Runs the test suite, fixed command | no |
| `update_todos` | Writes the plan | no |

The task: *"The tests are failing. Find out why and fix it."*

```bash
npm run agent
```

## What a good run looks like

```text
── turn 1 ──  plan
   ◐ Run the tests and find the failure
   ○ Read the code under test
   ○ Fix the bug
   ○ Run the tests again

── turn 2 ──  run_tests → 5 pass, 1 fail: "shipping is free at exactly 50.00"
── turn 3 ──  read src/cart.js and README.md
── turn 4 ──  "the test is right and the code is wrong"  →  edit_file  [y/N]
       - return subtotal(items) > FREE_SHIPPING_FROM ? 0 : SHIPPING_COST;
       + return subtotal(items) >= FREE_SHIPPING_FROM ? 0 : SHIPPING_COST;
── turn 5 ──  run_tests → 6 pass
── turn 7 ──  summary: what was wrong, what changed, test result
```

The bug from lesson 1, fixed with one character, and checked.

## Three design choices worth stealing

### `edit_file`, not `write_file`

The model sends the exact text to replace and the new text. The tool refuses if the old text isn't found, or is found more than once:

```ts
if (count === 0) throw new ToolError(`old_text was not found in ${path}. Read the file and copy it exactly.`);
if (count > 1) throw new ToolError(`old_text appears ${count} times in ${path}. Include more context.`);
```

Why not let it rewrite the whole file? A whole-file rewrite can quietly drop a function the model forgot about. An exact-match edit can only change what the model has actually seen. It also gives you a tiny, readable diff to approve. Most coding agents edit this way for the same reasons.

### The system prompt describes a way of working, not a personality

```text
- Look before you change anything: run the tests, read the relevant files.
- Make the smallest change that fixes the problem. Prefer fixing the code over changing a test,
  unless the test is clearly wrong. Never delete a test to make the suite pass.
- After an edit, run the tests again.
- Finish with a short summary: what was wrong, what you changed, and the test result.
```

No "You are a world-class senior engineer". Just the habits you'd want from a colleague. "Never delete a test to make the suite pass" is there because a test suite going green is also what you'd see if a test got deleted.

### Tests are the agent's eyes

Without `run_tests`, the model can only *believe* the fix works. With it, the model checks, and so do you: the last tool result is real test output, not the model's opinion. If you build agents for your own work, find the equivalent: a type checker, a linter, a dry run, a preview build. **An agent is only as good as what it can check.**

## Use it on your own project

With an API key, the agent is a real (small) tool:

```bash
npm run agent -- "Add a test for orderTotal with two items"
npm run agent -- --dir ../some-node-project "Why does the date test fail?"
```

`--dir` points it at another Node project. It works **in place**, so use a copy or a clean git branch. The guardrails still apply: paths stay inside that folder, and edits need your yes.

## How small is it?

| File | What | Lines |
| --- | --- | --- |
| `src/agent.ts` | the loop + guardrails | 109 |
| `src/tools/project.ts` | four project tools | 125 |
| `src/tools/todos.ts` | to-do list | 61 |
| `src/lessons/06-mini-coding-agent.ts` | prompt, wiring, replay script | 122 |

Without comments, the loop and all five tools come to about 250 lines. The products you use add a lot on top: streaming, context compaction for long sessions, sub-agents, permission modes, many more tools. But the core still has this shape: **a model, some tools, and a loop.**

## Try this

- Break a second thing in the playground (say, `formatPrice` rounding) and run the agent. Does the plan change?
- Add a `search` tool (find a string across files). Watch how the model uses it instead of reading everything.
- Delete the "Never delete a test" line. Give it a test that's genuinely wrong. Then put the line back.
