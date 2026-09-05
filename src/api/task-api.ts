import {
  createRequiredForResponseSchema,
  createSubtaskResponseSchema,
  createTaskResponseSchema,
  deleteRelationshipsResponseSchema,
  deleteTaskResponseSchema,
  parseTaskGraph,
  updateTaskResponseSchema,
} from "../model/task-graph";
import type {
  CreateRequiredForInput,
  CreateTaskInput,
  DeleteRelationshipsInput,
  Relationship,
  Task,
  TaskGraph,
  UpdateTaskBody,
} from "../model/task-graph";

interface CreateTaskResult {
  graph: TaskGraph;
  task: Task;
}

interface CreateRequiredForResult {
  graph: TaskGraph;
  relationship: Relationship;
}

interface CreateSubtaskResult extends CreateTaskResult {
  relationship: Relationship;
}

interface UpdateTaskResult {
  graph: TaskGraph;
  task: Task;
}

interface DeleteRelationshipsResult {
  graph: TaskGraph;
  deletedRelationshipIds: string[];
}

interface DeleteTaskResult extends DeleteRelationshipsResult {
  deletedTaskId: string;
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

export async function createSubtask(
  parentTaskId: string,
  input: CreateTaskInput,
): Promise<CreateSubtaskResult> {
  const response = await fetch(
    `/api/tasks/${encodeURIComponent(parentTaskId)}/subtasks`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return createSubtaskResponseSchema.parse(await response.json());
}

export async function createRequiredFor(
  input: CreateRequiredForInput,
): Promise<CreateRequiredForResult> {
  const response = await fetch("/api/relationships/is-required-for", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return createRequiredForResponseSchema.parse(await response.json());
}

export async function updateTask(
  taskId: string,
  input: UpdateTaskBody,
): Promise<UpdateTaskResult> {
  const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return updateTaskResponseSchema.parse(await response.json());
}

export async function deleteRelationships(
  input: DeleteRelationshipsInput,
): Promise<DeleteRelationshipsResult> {
  const response = await fetch("/api/relationships", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return deleteRelationshipsResponseSchema.parse(await response.json());
}

export async function deleteTask(taskId: string): Promise<DeleteTaskResult> {
  const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return deleteTaskResponseSchema.parse(await response.json());
}
