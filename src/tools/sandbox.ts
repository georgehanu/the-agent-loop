// Each run works on a fresh copy of the playground in .sandbox/<name>.
// The agent can break the copy as much as it likes. The original stays untouched.

import { cpSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function freshSandbox(name: string): string {
  const source = fileURLToPath(new URL("../../playground/", import.meta.url));
  const target = fileURLToPath(new URL(`../../.sandbox/${name}/`, import.meta.url));
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
  return target;
}
