// Terminal output for the lessons. No dependencies, just ANSI colours.

import type { Model } from "./model.js";

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: number) => (text: string) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);

export const dim = paint(2);
export const bold = paint(1);
export const green = paint(32);
export const yellow = paint(33);
export const blue = paint(34);
export const magenta = paint(35);
export const cyan = paint(36);
export const red = paint(31);
export const strike = paint(9);

export function banner(title: string, model: Model) {
  console.log(`\n${bold(title)}`);
  const how =
    model.mode === "live"
      ? `live · ${model.name}`
      : "replay · pre-written model replies, real code. Add ANTHROPIC_API_KEY to run live.";
  console.log(dim(how) + "\n");
}

export function you(text: string) {
  console.log(`${bold(blue("you"))}    ${text}`);
}

export function turn(n: number) {
  console.log(dim(`\n── turn ${n} ${"─".repeat(40)}`));
}

export function modelSays(text: string) {
  if (!text) return;
  console.log(`${bold(magenta("model"))}  ${indent(text, 7)}`);
}

export function toolCall(name: string, input: unknown) {
  console.log(`${bold(cyan("tool →"))} ${name}(${dim(short(JSON.stringify(input)))})`);
}

export function toolResult(text: string, isError = false) {
  const label = isError ? red("tool ✗") : green("tool ←");
  console.log(`${bold(label)} ${dim(short(text.replace(/\s+/g, " ")))}`);
}

export function note(text: string) {
  console.log(yellow(`\n${text}`));
}

function short(text: string, max = 110) {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function indent(text: string, spaces: number) {
  return text.split("\n").join("\n" + " ".repeat(spaces));
}
