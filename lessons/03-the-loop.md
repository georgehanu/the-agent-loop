---
title: Keep going until it's done
lesson: 3
code: src/lessons/03-the-loop.ts
run: npm run lesson3
---

# Lesson 3 · Keep going until it's done

Lesson 2 gave the model one round of tools. Some questions need one. Some need five. You can't know which in advance, but the model can tell when it has seen enough. So we let it decide.

## The shape of an agent

```text
ask the model ──► wants tools? ──no──► that's the answer
      ▲               │ yes
      │               ▼
      └──── run them, send the results back
```

In code:

```ts
let reply = await model.ask({ messages, tools });

while (reply.stop_reason === "tool_use") {
  messages.push({ role: "assistant", content: reply.content });
  messages.push({ role: "user", content: runAll(toolCallsOf(reply)) }); // every call, one message (lesson 2)
  reply = await model.ask({ messages, tools });
}

// the model replied without asking for a tool: that's the answer
```

Each pass is a **turn**: the model asks, we run, we report back, it looks again. Nothing in this code knows what the task is or how many steps it takes. **The model decides when the job is done.**

That's the difference from a normal program. You don't write "read the tests, then the code, then answer". You hand over the tools and the question, and the path through the task comes from the model.

## Run it

```bash
npm run lesson3
```

```text
── turn 1 ──────────────────────────
model  Let me see what's in the project first.
tool → list_files({})

── turn 2 ──────────────────────────
model  I'll read the cart module and its tests side by side.
tool → read_file({"path":"src/cart.js"})
tool → read_file({"path":"test/cart.test.js"})

── turn 3 ──────────────────────────
model  The test "shipping is free at exactly 50.00" fails. …
```

Three turns. Nobody told it to list the files first. It chose to, because it didn't know the test file's name. That's the "agent" part: the path through the task comes from the model, not from your code.

## The messages array is the memory

After the run, `messages` holds everything: the question, each model turn, each batch of tool results. The model has no memory between requests. **You send the entire conversation every time.** That's why the model in turn 3 "remembers" the file it read in turn 2: it's right there in the request.

Two practical consequences:

- **Cost grows with every turn.** Turn 10 pays for turns 1 to 9 again as input. (Prompt caching softens this a lot. It's worth turning on once you go beyond experiments.)
- **What's in the array is all the model knows.** If a tool returns 5,000 lines of logs, those lines now ride along in every later turn. Keep tool output short. Lesson 5's tools clip it.

## A definition you can use

Simon Willison puts it well: an agent is a model that runs tools in a loop to achieve a goal. You've now written every piece of that sentence:

- **model**: `model.ask(...)`
- **tools**: the schemas, plus `runTool()`
- **in a loop**: `while (reply.stop_reason === "tool_use")`
- **goal**: the user's question, and the model deciding when it's met

Frameworks give you this loop with extras: retries, streaming, tracing. Worth using once you know what they're doing. Now you do.

## Try this

- Add a `console.log(JSON.stringify(messages, null, 2))` after the loop. Read the whole conversation once. It's the best 2 minutes you'll spend on agents.
- What happens if the model keeps asking for tools forever? Nothing stops it yet. Keep that thought for lesson 5.
