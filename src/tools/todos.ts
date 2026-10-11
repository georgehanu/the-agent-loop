// A to-do list the model keeps for itself.
//
// One tool, and it always takes the whole list. That keeps the state simple:
// the latest call *is* the plan. Our code only stores it and draws it.

import type { AgentTool } from "./project.js";
import { dim, green, strike, yellow } from "../print.js";

type Status = "pending" | "in_progress" | "done";
interface Todo {
  task: string;
  status: Status;
}

export function todoList() {
  let todos: Todo[] = [];

  function render() {
    const icon = { pending: dim("○"), in_progress: yellow("◐"), done: green("●") };
    const line = (todo: Todo) =>
      `   ${icon[todo.status]} ${todo.status === "done" ? dim(strike(todo.task)) : todo.task}`;
    console.log(todos.map(line).join("\n"));
  }

  const tool: AgentTool = {
    tool: {
      name: "update_todos",
      description:
        "Write your to-do list for the current task. Send the whole list every time. " +
        "Plan before you start, keep exactly one item in_progress, and mark items done as you finish them.",
      strict: true,
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
              additionalProperties: false,
            },
          },
        },
        required: ["todos"],
        additionalProperties: false,
      },
    },
    run: (input) => {
      todos = (input as unknown as { todos: Todo[] }).todos;
      render();
      const left = todos.filter((todo) => todo.status !== "done").length;
      return left === 0 ? "All items done." : `Saved. ${left} item(s) left.`;
    },
  };

  return { tool, all: () => todos };
}
