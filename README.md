# The Agent Loop

**Build a mini coding agent in TypeScript. No framework, six short lessons.**

By George Hanu · [@georgehanu](https://x.com/georgehanu) · [Read it as a website](https://georgehanu.github.io/the-agent-loop/)

You watch Claude Code or Codex read files, run tests and fix bugs every day. This repo shows what's happening underneath by having you build a small version yourself. By the end you'll have an agent that plans, investigates, asks before it edits, and checks its own work. The loop and all its tools come to about 250 lines.

```text
you    The tests are failing. Find out why and fix it.

── turn 1 ──
   ◐ Run the tests and find the failure
   ○ Read the code under test
   ○ Fix the bug
   ○ Run the tests again
── turn 2 ──
tool → run_tests({})
tool ← exit code 1 · 5 pass, 1 fail: "shipping is free at exactly 50.00"
── turn 4 ──
model  The README says free *from* 50.00, so the test is right and the code is wrong.
tool → edit_file(src/cart.js)
       - return subtotal(items) > FREE_SHIPPING_FROM ? 0 : SHIPPING_COST;
       + return subtotal(items) >= FREE_SHIPPING_FROM ? 0 : SHIPPING_COST;
       Allow edit_file on src/cart.js? [y/N] y
── turn 5 ──
tool → run_tests({})
tool ← exit code 0 · 6 pass
```

## The lessons

| # | Lesson | You'll learn | Run |
| --- | --- | --- | --- |
| 1 | [Text in, text out](lessons/01-text-in-text-out.md) | Tool calling with no tools API, just a prompt and an `if` | `npm run lesson1` |
| 2 | [Your first real tool call](lessons/02-first-tool-call.md) | Schemas, `tool_use`, `tool_result`, and where one round runs out | `npm run lesson2` |
| 3 | [Keep going until it's done](lessons/03-the-loop.md) | The agent loop: the model decides when it's finished | `npm run lesson3` |
| 4 | [Give it a to-do list](lessons/04-todo-list.md) | The checklist trick from coding agents, in one tool | `npm run lesson4` |
| 5 | [Guardrails](lessons/05-guardrails.md) | Sandboxed paths, recoverable errors, approvals, limits | `npm run lesson5` |
| 6 | [A mini coding agent](lessons/06-mini-coding-agent.md) | All of it together, fixing a real failing test | `npm run agent` |
| + | [Do you even need an agent?](lessons/07-do-you-need-an-agent.md) | Workflows vs agents, and a 4-question checklist | |

Each lesson takes 5 to 10 minutes to read and a few seconds to run.

## Quick start

You need Node.js 20 or newer.

```bash
git clone https://github.com/georgehanu/the-agent-loop.git
cd the-agent-loop
npm install
npm run lesson1
```

**No API key needed to start.** Without a key, every lesson runs in *replay mode*: the model's replies are pre-written, but everything else is real. The loop runs, the tools read and edit files, and the tests actually execute.

**To run against Claude**, copy `.env.example` to `.env` and add your key from the [Claude Console](https://platform.claude.com/):

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

The lessons use `claude-opus-5-5` by default. Set `AGENT_MODEL` in `.env` to try another model.

## What's inside

```text
lessons/          the six lessons and the epilogue (start here)
src/lessons/      one runnable file per lesson
src/agent.ts      the agent loop with guardrails
src/tools/        file tools, test runner, to-do list, sandbox
src/model.ts      live Claude calls + replay mode
playground/       tiny-shop, a small project with one bug for the agent to fix
```

The agent never touches `playground/` directly. Every run works on a fresh copy in `.sandbox/`, so you can run the lessons as often as you like.

## Who it's for

Developers who use AI coding tools and want to understand them well enough to build their own. You should be comfortable with JavaScript or TypeScript and running things in a terminal. No AI or ML background needed.

## License

MIT. Use the code in your own projects, workshops or teaching. A link back is appreciated.
