// Lesson 1 · Text in, text out
//
// No tools API yet. We tell the model, in plain English, that it can ask for a file
// by replying "READ <path>". Our code spots that line, reads the file, and sends it back.
// That's the whole trick behind tool calling. The next lessons just make it sturdier.

import { readFileSync } from "node:fs";
import { createModel, textOf, type MessageParam } from "../model.js";
import * as print from "../print.js";

const model = createModel([
  { text: "READ src/cart.js" },
  {
    text:
      "Shipping costs 4.99. It becomes free when the subtotal is over 50.00.\n" +
      "One thing to check: the code uses `>`, so an order of exactly 50.00 still pays shipping.\n" +
      "The README says free shipping starts *from* 50.00, so one of them is wrong.",
  },
]);

const system = `You help a developer understand a small JavaScript project.
You cannot see the files. If you need one, reply with exactly one line and nothing else:
READ <path>
Otherwise, answer the question in a few sentences.`;

const question = "How much does shipping cost in this project, and when is it free?";

print.banner("Lesson 1 · Text in, text out", model);
print.you(question);

const messages: MessageParam[] = [{ role: "user", content: question }];

// First call. The model can only answer with text.
let reply = await model.ask({ system, messages });
let text = textOf(reply);
print.modelSays(text);

// Our code decides what that text means. This `if` is the "tool call".
const request = text.match(/^READ (\S+)$/);
if (request) {
  const path = request[1];
  const file = readFileSync(new URL(`../../playground/${path}`, import.meta.url), "utf8");
  print.toolResult(`read ${path} (${file.length} chars)`);

  messages.push({ role: "assistant", content: text });
  messages.push({ role: "user", content: `Contents of ${path}:\n\n${file}` });

  reply = await model.ask({ system, messages });
  print.modelSays(textOf(reply));
}

print.note(
  "The model never touched the file system. It wrote 'READ src/cart.js' and our code did the rest.",
);
