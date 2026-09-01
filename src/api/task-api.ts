import { createTaskResponseSchema, parseTaskGraph } from "../model/task-graph";
import type { CreateTaskInput, Task, TaskGraph } from "../model/task-graph";

interface CreateTaskResult {
  graph: TaskGraph;
  task: Task;
}

async function readError(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status})`;
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      return body.error;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

export async function loadTaskGraph(signal: AbortSignal): Promise<TaskGraph> {
  const response = await fetch("/api/graph", { signal });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return parseTaskGraph(await response.json());
}

export async function createTask(
  input: CreateTaskInput,
): Promise<CreateTaskResult> {
  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return createTaskResponseSchema.parse(await response.json());
}
