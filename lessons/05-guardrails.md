---
title: "Guardrails: the boring code that matters"
lesson: 5
code: src/agent.ts
run: npm run lesson5
---

# Lesson 5 · Guardrails: the boring code that matters

So far the loop trusts the model completely. Whatever it asks for, we do. That's fine for reading three files in a sample project. It's not fine once tools can change things.

The fix isn't a smarter model. It's ordinary code in the loop, the same checks you'd write for any input from the internet. Because that's what tool input is: **text produced by a model, so treat it as untrusted.**

The guarded loop lives in [`src/agent.ts`](../src/agent.ts). One run of lesson 5 hits every guardrail:

```bash
npm run lesson5
```

## 1. Paths stay inside the project

```ts
function insideProject(path: string): string {
  const full = resolve(root, path);
  const rel = relative(root, full);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new ToolError(`"${path}" is outside the project. Use a path relative to the project root.`);
  }
  return full;
}
```

In the run, the user asks *"what's in ../.env?"*. The model tries. The tool says no. **It doesn't matter whether the model "should" refuse.** The code decides. A prompt asks the model to behave. Code makes sure it does.

## 2. Errors go back to the model

```ts
try {
  const output = agentTool.run(input);
  results.push({ type: "tool_result", tool_use_id: call.id, content: output });
} catch (error) {
  if (!(error instanceof ToolError)) throw error;
  results.push({ type: "tool_result", tool_use_id: call.id, content: error.message, is_error: true });
}
```

In turn 1, the model asks for `test/carts.test.js`. That file doesn't exist. Lesson 3's code would have crashed. Now the model receives:

```text
No file at "test/carts.test.js". Call list_files to see what exists.
```

…and in turn 2, it does exactly that. **Write error messages for the model the way you'd write them for a junior developer:** what went wrong and what to do next. "ENOENT" helps nobody.

Note the split: a `ToolError` is the model's mistake, so it goes back to the model. Any other exception is *your* bug, so the program crashes loudly. Don't feed your own bugs to the model and hope it works around them.

## 3. A human approves changes

```ts
if (agentTool?.needsApproval && !(await approve(call.name, input))) {
  results.push(errorResult(call.id, "The user declined this change. Ask them what they want instead."));
  continue;
}
```

Before `edit_file` runs, you see the diff and get a `[y/N]`. Say no, and the model gets a result telling it so, so it can ask you what to do instead of carrying on blindly. With no terminal attached (CI, a pipe), the default answer is **no**.

Reading is approved automatically. Changing things isn't. Where you draw that line is a product decision, not a technical one.

## 4. The loop has a limit

```ts
for (let turn = 1; turn <= maxTurns; turn++) { … }
```

Lesson 3's `while` would happily run forever. Every turn costs money and resends the whole conversation. A turn limit is the simplest budget there is:

```bash
npm run lesson5 -- --yes --max-turns 2
```

## 5. Only finished tool calls run

```ts
if (reply.stop_reason !== "tool_use") {
  return { answer: textOf(reply), stoppedBecause: … };
}
```

A reply can stop for other reasons: it hit `max_tokens` halfway through writing a tool call, or the model declined the request (`refusal`). In those cases the tool input may be cut off. So we only run tools when `stop_reason` is exactly `"tool_use"`, and report anything else.

## 6. Narrow tools beat powerful tools

There's no `run_command` tool. There's `run_tests`, which always runs the same fixed command:

```ts
spawnSync(process.execPath, ["--test", "--test-reporter=spec"], { cwd: root, timeout: 30_000 });
```

A shell tool would be more flexible. It would also accept `rm -rf`. Give the model the smallest tool that does the job. You can add more later. Taking power away from tools people rely on is much harder.

And everything runs on a **fresh copy** of the playground in `.sandbox/`. The cheapest undo is never touching the original.

## The pattern

None of this is AI code. It's input validation, error handling, permissions, timeouts and least privilege. The model is new. Everything around it is the same backend work you already know.

## Try this

- Make `edit_file` refuse to touch anything under `test/`. What does the model do when it thinks a test is wrong?
- Add a cost guard: stop when the total of `reply.usage.output_tokens` passes a limit.
