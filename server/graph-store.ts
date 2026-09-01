import { randomUUID } from "node:crypto";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  createRequiredForInputSchema,
  createTaskInputSchema,
  deleteRelationshipsInputSchema,
  deleteTaskInputSchema,
  parseTaskGraph,
  relationshipSchema,
  taskSchema,
  updateTaskInputSchema,
} from "../src/model/task-graph.js";
import type { Relationship, Task, TaskGraph } from "../src/model/task-graph.js";
import { GraphEntityNotFoundError } from "./graph-errors.js";

interface GraphStoreDependencies {
  createId: () => string;
  now: () => Date;
}

interface CreateTaskResult {
  graph: TaskGraph;
  task: Task;
}

interface UpdateTaskResult {
  graph: TaskGraph;
  task: Task;
}

interface CreateRequiredForResult {
  graph: TaskGraph;
  relationship: Relationship;
}

interface DeleteRelationshipsResult {
  graph: TaskGraph;
  deletedRelationshipIds: string[];
}

interface DeleteTaskResult extends DeleteRelationshipsResult {
  deletedTaskId: string;
}

const defaultDependencies: GraphStoreDependencies = {
  createId: randomUUID,
  now: () => new Date(),
};

async function writeAtomically(path: string, graph: TaskGraph): Promise<void> {
  const temporaryPath = join(
    dirname(path),
    `.${randomUUID()}-${process.pid}.tmp`,
  );
  try {
    await writeFile(temporaryPath, `${JSON.stringify(graph, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    await rename(temporaryPath, path);
  } catch (error) {
    try {
      await unlink(temporaryPath);
    } catch {
      // The temporary file may not exist when creation itself failed.
    }
    throw error;
  }
}

export class GraphStore {
  readonly #path: string;
  readonly #dependencies: GraphStoreDependencies;
  #writeQueue: Promise<void> = Promise.resolve();

  constructor(
    path: string,
    dependencies: GraphStoreDependencies = defaultDependencies,
  ) {
    this.#path = path;
    this.#dependencies = dependencies;
  }

  async read(): Promise<TaskGraph> {
    return parseTaskGraph(JSON.parse(await readFile(this.#path, "utf8")));
  }

  migrate(): Promise<TaskGraph> {
    return this.#enqueue(async () => {
      const graph = await this.read();
      await writeAtomically(this.#path, graph);
      return graph;
    });
  }

  #enqueue<Result>(update: () => Promise<Result>): Promise<Result> {
    // oxlint-disable-next-line promise/prefer-await-to-then -- each operation starts after the previous write settles.
    const operation = this.#writeQueue.then(update);
    // oxlint-disable-next-line promise/prefer-await-to-then -- a settled promise tail serializes future writes without poisoning the queue.
    this.#writeQueue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  createTask(input: unknown): Promise<CreateTaskResult> {
    return this.#enqueue(async () => {
      const values = createTaskInputSchema.parse(input);
      const task = taskSchema.parse({
        id: `local:${this.#dependencies.createId()}`,
        source: { provider: "local" },
        title: values.title,
        description: values.description,
        createdAt: this.#dependencies.now().toISOString(),
        status: values.status,
        createdBy: { login: values.createdBy },
        pullRequests: [],
        duration: values.duration,
        executionType: values.executionType,
        metadata: {},
      });
      const current = await this.read();
      const graph = parseTaskGraph({
        ...current,
        tasks: [...current.tasks, task],
      });
      await writeAtomically(this.#path, graph);
      return { graph, task };
    });
  }

  createRequiredFor(input: unknown): Promise<CreateRequiredForResult> {
    return this.#enqueue(async () => {
      const values = createRequiredForInputSchema.parse(input);
      const relationship = relationshipSchema.parse({
        id: `is-required-for:${values.source}->${values.target}`,
        kind: "is-required-for",
        source: values.source,
        target: values.target,
        metadata: {},
      });
      const current = await this.read();
      const graph = parseTaskGraph({
        ...current,
        relationships: [...current.relationships, relationship],
      });
      await writeAtomically(this.#path, graph);
      return { graph, relationship };
    });
  }

  updateTask(input: unknown): Promise<UpdateTaskResult> {
    return this.#enqueue(async () => {
      const values = updateTaskInputSchema.parse(input);
      const current = await this.read();
      const existing = current.tasks.find(({ id }) => id === values.id);
      if (existing === undefined) {
        throw new GraphEntityNotFoundError(`Task not found: ${values.id}`);
      }
      const task = taskSchema.parse({
        ...existing,
        ...(values.status === undefined ? {} : { status: values.status }),
        ...(values.executionType === undefined
          ? {}
          : { executionType: values.executionType }),
      });
      const graph = parseTaskGraph({
        ...current,
        tasks: current.tasks.map((candidate) =>
          candidate.id === task.id ? task : candidate,
        ),
      });
      await writeAtomically(this.#path, graph);
      return { graph, task };
    });
  }

  deleteRelationships(input: unknown): Promise<DeleteRelationshipsResult> {
    return this.#enqueue(async () => {
      const values = deleteRelationshipsInputSchema.parse(input);
      const relationshipIds = [...new Set(values.ids)];
      const current = await this.read();
      const existingIds = new Set(current.relationships.map(({ id }) => id));
      const missingId = relationshipIds.find((id) => !existingIds.has(id));
      if (missingId !== undefined) {
        throw new GraphEntityNotFoundError(
          `Relationship not found: ${missingId}`,
        );
      }
      const deletingIds = new Set(relationshipIds);
      const graph = parseTaskGraph({
        ...current,
        relationships: current.relationships.filter(
          ({ id }) => !deletingIds.has(id),
        ),
      });
      await writeAtomically(this.#path, graph);
      return { graph, deletedRelationshipIds: relationshipIds };
    });
  }

  deleteTask(input: unknown): Promise<DeleteTaskResult> {
    return this.#enqueue(async () => {
      const { id } = deleteTaskInputSchema.parse(input);
      const current = await this.read();
      if (!current.tasks.some((task) => task.id === id)) {
        throw new GraphEntityNotFoundError(`Task not found: ${id}`);
      }
      const deletedRelationshipIds = current.relationships
        .filter(({ source, target }) => source === id || target === id)
        .map((relationship) => relationship.id);
      const deletingRelationshipIds = new Set(deletedRelationshipIds);
      const graph = parseTaskGraph({
        ...current,
        tasks: current.tasks.filter((task) => task.id !== id),
        relationships: current.relationships.filter(
          (relationship) => !deletingRelationshipIds.has(relationship.id),
        ),
      });
      await writeAtomically(this.#path, graph);
      return { graph, deletedTaskId: id, deletedRelationshipIds };
    });
  }
}
