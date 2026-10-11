---
title: Your first real tool call
lesson: 2
code: src/lessons/02-first-tool-call.ts
run: npm run lesson2
---

# Lesson 2 · Your first real tool call

Same idea as lesson 1, minus the guesswork. Instead of "reply with `READ <path>`", we describe the tool with a JSON schema and let the API do the formatting.

## A tool has two halves

**What the model sees**: a name, a description and an input schema.

```ts
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
```

**What our code does**: a normal function.

```ts
function readFile(path: string) {
  return readFileSync(`playground/${path}`, "utf8");
}
```

The model never sees the function, only the description. So the description *is* a prompt. "Paths are relative to the project root, e.g. src/cart.js" saves you a round of the model guessing `/src/cart.js` or `./cart.js`.

`strict: true` asks the API to guarantee that the input matches the schema. One less thing to check.

## What comes back

When the model wants the tool, the reply looks like this (trimmed):

```json
{
  "stop_reason": "tool_use",
  "content": [
    { "type": "tool_use", "id": "toolu_01…", "name": "read_file", "input": { "path": "src/money.js" } }
  ]
}
```

No regex needed. `stop_reason: "tool_use"` means "I've stopped because I want a tool". The `tool_use` block says which tool and with what input.

## Sending the results back

A reply can contain **several** `tool_use` blocks. A good model asks for two files in one go when it knows it needs both, which saves a whole round. So we answer every call, and put all the results in **one** message:

```ts
const results: ToolResult[] = [];
for (const call of toolCallsOf(reply)) {
  const content = readFile(call.input.path);
  results.push({ type: "tool_result", tool_use_id: call.id, content });
}

messages.push({ role: "assistant", content: reply.content }); // the model's own turn, unchanged
messages.push({ role: "user", content: results });            // every result, together
```

Two rules the API enforces:

- **Every `tool_use` gets a `tool_result`**, matched by `tool_use_id`. Skip one and the request is rejected.
- **They all go in the next message.** Spreading them over several messages works badly: the model learns that asking for several things at once doesn't pay off, and stops doing it.

Then we ask again, and the model answers with the files in hand.

Notice the role: the tool results go in a **user** message. As far as the API is concerned, there are only two parties. Anything that isn't the model is "the user", including your code.

## Run it

```bash
npm run lesson2
```

## Where one round runs out

```bash
npm run lesson2 -- --follow-up
```

This time the question is *"Which test in this project fails, and why?"* The model reads the tests and forms a guess. But a careful answer needs the code under test too, and it only knows *which* code after reading the tests. So its second reply isn't an answer. It's another request:

```text
model  My guess is "shipping is free at exactly 50.00", but I need to see shipping() to be sure.
tool → read_file({"path":"src/cart.js"})
```

Our code has done its one round and stops. No answer.

You could add a second round, then a third. But you can't know in advance how many a question needs: one, two, or eight. Only the model knows when it has seen enough. Lesson 3 hands that decision to the model.

## Try this

- Make the tool description vague ("Reads stuff"). Run live. Does the model still pass good paths?
- Ask a question that needs no files, like "What's 17.49 in cents?". What's the `stop_reason`?
