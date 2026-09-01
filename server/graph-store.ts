import { randomUUID } from "node:crypto";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  createTaskInputSchema,
  parseTaskGraph,
  taskSchema,
} from "../src/model/task-graph.js";
import type { Task, TaskGraph } from "../src/model/task-graph.js";

interface GraphStoreDependencies {
  createId: () => string;
  now: () => Date;
}

interface CreateTaskResult {
  graph: TaskGraph;
  task: Task;
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

  createTask(input: unknown): Promise<CreateTaskResult> {
    // oxlint-disable-next-line promise/prefer-await-to-then -- each operation starts after the previous write settles.
    const operation = this.#writeQueue.then(async () => {
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
    // oxlint-disable-next-line promise/prefer-await-to-then -- a settled promise tail serializes future writes without poisoning the queue.
    this.#writeQueue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }
}
