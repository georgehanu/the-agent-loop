---
title: Text in, text out
lesson: 1
code: src/lessons/01-text-in-text-out.ts
run: npm run lesson1
---

# Lesson 1 · Text in, text out

You've watched a coding agent read your files, run your tests and fix a bug. It feels like the model is *doing* things.

It isn't. A model takes text in and gives text out. That's the whole job.

So where does the "doing" come from? From the code around the model. Let's prove it with no tools API at all.

## The trick

We tell the model, in plain English:

```text
You cannot see the files. If you need one, reply with exactly one line and nothing else:
READ <path>
```

Then we ask: *"How much does shipping cost in this project, and when is it free?"*

The model can't answer without seeing the code, so it replies:

```text
READ src/cart.js
```

That's just a string. Our code looks at it, and if it matches, our code reads the file:

```ts
const request = text.match(/^READ (\S+)$/);
if (request) {
  const file = readFileSync(`playground/${request[1]}`, "utf8");
  messages.push({ role: "assistant", content: text });
  messages.push({ role: "user", content: `Contents of ${request[1]}:\n\n${file}` });
  reply = await model.ask({ system, messages });
}
```

Second request, now with the file in the conversation, and the model answers the question. A good answer also spots something odd: the code charges shipping on an order of exactly 50.00, while the README says shipping is free from 50.00. Keep that in mind. We'll fix it in lesson 6.

## Run it

```bash
npm run lesson1
```

No API key? It still runs. Every lesson has a **replay mode** that uses pre-written model replies. The loop, the file reads and the messages are all real. Add `ANTHROPIC_API_KEY` to `.env` and the same code talks to Claude.

## What just happened

1. We **described an ability** in the prompt ("you can ask for a file").
2. The model **chose to use it** by writing the agreed text.
3. **Our code** noticed, did the work, and sent the result back.
4. The model **continued** with more information than it had before.

That's tool calling. Every agent you use, including the big ones, is a sturdier version of this pattern.

## Why this matters

When an agent does something strange, this picture tells you where to look:

- **It used the wrong tool or the wrong input?** That's the model's output. Look at the prompt and the tool description.
- **The tool did the wrong thing?** That's your code. Debug it like any other function.
- **It never stopped, or stopped too early?** That's the loop. You'll write it in lesson 3.

## Why not stop here?

Parsing `READ (\S+)` works until it doesn't. What if the model writes `Read: src/cart.js`, or adds a polite sentence first, or wants two files? You'd end up writing a fragile parser for every tool.

Real tool calling fixes exactly this. You describe the tool with a schema, and the API gives you structured data instead of a sentence to guess at. That's lesson 2.

## Try this

- Change the question to something the README answers. Does the model still ask for a file? Which one?
- Add a second "ability" to the system prompt, like `LIST` to list files. Handle it with a second `if`. Notice how quickly this gets messy.
