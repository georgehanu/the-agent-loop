---
title: Give it a to-do list
lesson: 4
code: src/lessons/04-todo-list.ts
run: npm run lesson4
---

# Lesson 4 · Give it a to-do list

You know the moment in Claude Code or Codex when a checklist appears, and items get ticked off one by one? It looks like a big feature. It's one tool.

## The tool

(Trimmed for reading. The full version, with `strict` and `additionalProperties`, is in [`src/tools/todos.ts`](../src/tools/todos.ts).)

```ts
{
  name: "update_todos",
  description:
    "Write your to-do list for the current task. Send the whole list every time. " +
    "Plan before you start, keep exactly one item in_progress, and mark items done as you finish them.",
  input_schema: {
    type: "object",
    properties: {
      todos: {
        type: "array",
        items: {
          type: "object",
          properties: {
            task: { type: "string" },
            status: { type: "string", enum: ["pending", "in_progress", "done"] },
          },
          required: ["task", "status"],
        },
      },
    },
    required: ["todos"],
  },
}
```

And the code behind it stores the list and prints it:

```ts
run: (input) => {
  todos = input.todos;
  render();
  return `Saved. ${left} item(s) left.`;
}
```

That's all. It doesn't run anything, check anything or decide anything.

## Why "send the whole list every time"?

You could design it as `add_todo`, `complete_todo(index)` and so on. Then you'd have to handle "complete item 7" when there are 5 items, items added twice, and indexes that shift.

With one tool that always takes the full list, the latest call **is** the state. Nothing to keep in sync, no index to get wrong. When a tool is used by a model, fewer ways to get it wrong usually beats fewer tokens.

## Run it

```bash
npm run lesson4
```

```text
── turn 1 ──────────────────────────
model  I'll plan this first.
   ◐ Read the cart module
   ○ Read its tests
   ○ Run the test suite
   ○ Write the review

── turn 2 ──────────────────────────
tool → read_file({"path":"src/cart.js"})
tool → read_file({"path":"test/cart.test.js"})
   ● Read the cart module
   ● Read its tests
   ◐ Run the test suite
   ○ Write the review
```

Same loop as lesson 3, line for line. Only the tool list changed.

## Why such a small tool helps

**For you:** you can see the plan *before* the work happens. A plan that says "rewrite the cart module" for a one-line bug is your cue to stop the run early. That's cheaper than reviewing a big diff later.

**For the model:** the plan sits in the conversation. Every turn, the model sees what it said it would do and what's left. On long tasks, that's often the difference between finishing and wandering off after step 3.

**For your prompt:** "keep exactly one item in_progress" is a small rule that gives the work a rhythm: one thing at a time, then update the list.

There's no magic here. Writing a plan down helps people for the same reasons.

## Where to put the instruction

Two places, on purpose:

- The **tool description** says *how* to use the tool (whole list, one in progress).
- The **system prompt** says *when*: "Before you start, write a short plan with update_todos."

Tool descriptions are for the tool. The system prompt is for the job.

## Try this

- Remove the "write a short plan" line from the system prompt and run live. Does the model still plan? How often?
- Add a `"blocked"` status for steps that need a human. Then the list can also report problems.
