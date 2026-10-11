// The tools a small coding agent needs, each with two halves:
//   `tool`  what the model sees (a name, a description, a JSON schema)
//   `run`   what our code does when the model asks for it
//
// Every path goes through `insideProject()`. The model's input is untrusted text,
// so we check it the same way we'd check a form field from the internet.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import type { Tool } from "../model.js";

export interface AgentTool {
  tool: Tool;
  run(input: Record<string, string>): string;
  /** A human must say yes before this runs. */
  needsApproval?: boolean;
}

/** Thrown by a tool when the request is wrong. The loop sends the message back to the model. */
export class ToolError extends Error {}

const MAX_OUTPUT = 4000;

export function projectTools(root: string): AgentTool[] {
  function insideProject(path: string): string {
    const full = resolve(root, path);
    const rel = relative(root, full);
    if (rel.startsWith("..") || isAbsolute(rel)) {
      throw new ToolError(`"${path}" is outside the project. Use a path relative to the project root.`);
    }
    if (rel.split(/[\\/]/).includes("node_modules")) {
      throw new ToolError("node_modules is off limits.");
    }
    return full;
  }

  return [
    {
      tool: {
        name: "list_files",
        description: "List every file in the project, one relative path per line.",
        strict: true,
        input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
      },
      run: () =>
        readdirSync(root, { recursive: true, withFileTypes: true })
          .filter((entry) => entry.isFile() && !entry.parentPath.includes("node_modules"))
          .map((entry) => relative(root, join(entry.parentPath, entry.name)).replaceAll("\\", "/"))
          .sort()
          .join("\n"),
    },
    {
      tool: {
        name: "read_file",
        description: "Read a text file. Paths are relative to the project root, e.g. src/cart.js.",
        strict: true,
        input_schema: {
          type: "object",
          properties: { path: { type: "string", description: "Relative path of the file to read." } },
          required: ["path"],
          additionalProperties: false,
        },
      },
      run: ({ path }) => {
        const full = insideProject(path);
        if (!existsSync(full)) throw new ToolError(`No file at "${path}". Call list_files to see what exists.`);
        return clip(readFileSync(full, "utf8"));
      },
    },
    {
      tool: {
        name: "edit_file",
        description:
          "Replace one exact piece of text in a file. old_text must appear exactly once, " +
          "so include enough surrounding code to make it unique. Read the file first.",
        strict: true,
        input_schema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Relative path of the file to edit." },
            old_text: { type: "string", description: "The exact text to replace, copied from the file." },
            new_text: { type: "string", description: "The text to put in its place." },
          },
          required: ["path", "old_text", "new_text"],
          additionalProperties: false,
        },
      },
      needsApproval: true,
      run: ({ path, old_text, new_text }) => {
        const full = insideProject(path);
        if (!existsSync(full)) throw new ToolError(`No file at "${path}".`);
        const text = readFileSync(full, "utf8");
        const count = text.split(old_text).length - 1;
        if (count === 0) throw new ToolError(`old_text was not found in ${path}. Read the file and copy it exactly.`);
        if (count > 1) throw new ToolError(`old_text appears ${count} times in ${path}. Include more context.`);
        writeFileSync(full, text.replace(old_text, () => new_text));
        return `Edited ${path}.`;
      },
    },
    {
      tool: {
        name: "run_tests",
        description: "Run the project's test suite and return the results.",
        strict: true,
        input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
      },
      // A fixed command, not a shell. The model can ask for tests, not for `rm -rf`.
      run: () => {
        const result = spawnSync(process.execPath, ["--test", "--test-reporter=spec"], {
          cwd: root,
          encoding: "utf8",
          timeout: 30_000,
          env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
        });
        const output = (result.stdout + result.stderr).replace(/^\s+at .*\n/gm, "");
        return clip(`exit code ${result.status}\n${output}`);
      },
    },
  ];
}

function clip(text: string) {
  return text.length > MAX_OUTPUT ? text.slice(0, MAX_OUTPUT) + `\n…(${text.length - MAX_OUTPUT} more chars)` : text;
}
