---
title: Do you even need an agent?
lesson: 7
---

# Epilogue · Do you even need an agent?

You can build an agent now. Before you do, check whether the feature needs one.

An agent is the right tool when **you can't write the steps down in advance.** "Fix whatever is making the tests fail" is like that. You don't know which file, how many reads, or whether the bug is in the code or the test.

Most AI features in apps aren't like that. "Suggest a title for this post", "summarise these 40 survey answers", "turn this email into a support ticket" have known steps. For those, a **workflow** is better: your code decides the steps, and the model does the parts that need judgment.

| | Workflow | Agent |
| --- | --- | --- |
| Who picks the next step | your code | the model |
| Number of model calls | known | depends on the task |
| Cost and speed | predictable | varies |
| Testing | each step on its own | whole runs, many times |
| Good for | features inside products | open-ended tasks, tools for developers |

## The shapes most workflows take

You don't need an agent loop for any of these:

- **A chain.** Step 1's output is step 2's input. *Extract the key facts → write the summary → check it against the facts.*
- **A router.** One small call classifies the input, then your code picks the path. *Is this a billing, login or bug report? Each gets its own prompt and tools.*
- **Fan-out.** Same prompt over many items in parallel, then combine. *Summarise each of 40 feedback answers, then group the summaries.*
- **Writer and checker.** One call writes, another checks against a clear rule, and you retry if it fails. *Draft the reply → check it doesn't promise refunds → send or redo.*

Each step is a single `model.ask(...)`, the thing you wrote in lesson 1. Your code holds the control flow. You can test every step, log every step, and the bill is the same every time.

## A quick checklist

Reach for the agent loop only if you answer yes to all four:

1. **I can't list the steps in advance.** They depend on what turns up along the way.
2. **The result is worth the extra cost and time.** An agent might take 3 turns or 30.
3. **The model can actually do it.** Try it by hand in a chat first.
4. **Mistakes can be caught.** There are tests, a review, an approval step or an undo.

If any answer is no, start with one model call. Add steps only when you can show they make the result better. "It feels like it should have a planner agent and a reviewer agent" isn't evidence.

## Start simple, then measure

The most useful habit in all of this: **decide how you'll know it works before you build it.** Ten real examples and what a good answer looks like is enough to start. Then you can try a prompt change, a second step, or a different model, and see whether it helped. Without that, you're judging by how convincing the output sounds. Models are very good at sounding convincing.

## Where to go next

- Anthropic, [*Building effective agents*](https://www.anthropic.com/engineering/building-effective-agents). The clearest write-up of workflows vs agents.
- Simon Willison's writing on agents and tool use at [simonwillison.net](https://simonwillison.net/).
- The Claude docs on [tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview), for the details these lessons skipped: streaming, parallel calls, the SDK's built-in tool runner.

That's the lot. Six lessons, one loop. If this helped, tell me what you built on X: [@georgehanu](https://x.com/georgehanu).
