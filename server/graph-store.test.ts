// @vitest-environment node

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { GraphStore } from "./graph-store.js";

const emptyGraph = {
  schemaVersion: 1,
  project: { name: "Test roadmap" },
  tasks: [],
  relationships: [],
} as const;

const input = {
  title: "Write release notes",
  description: "Summarize the delivered changes.",
  status: "open",
  createdBy: "jann",
  duration: 0.5,
  executionType: "internal",
} as const;

const temporaryDirectories: string[] = [];

async function createGraphFile(contents = emptyGraph): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "task-atlas-"));
  temporaryDirectories.push(directory);
  const path = join(directory, "tasks.json");
  await writeFile(path, `${JSON.stringify(contents, null, 2)}\n`);
  return path;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

describe("GraphStore", () => {
  it("creates and atomically persists a validated local task", async () => {
    const path = await createGraphFile();
    const store = new GraphStore(path, {
      createId: () => "9ca29d0a-c37d-49f7-98ed-4d8379776c69",
      now: () => new Date("2026-09-01T08:00:00Z"),
    });

    const { graph, task } = await store.createTask(input);

    expect(task).toMatchObject({
      id: "local:9ca29d0a-c37d-49f7-98ed-4d8379776c69",
      source: { provider: "local" },
      createdAt: "2026-09-01T08:00:00.000Z",
      createdBy: { login: "jann" },
      title: input.title,
    });
    expect(graph.tasks).toHaveLength(1);
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual(graph);
  });

  it("serializes concurrent creates so neither task is lost", async () => {
    const path = await createGraphFile();
    let nextId = 0;
    const store = new GraphStore(path, {
      createId: () => `00000000-0000-4000-8000-00000000000${++nextId}`,
      now: () => new Date("2026-09-01T08:00:00Z"),
    });

    await Promise.all([
      store.createTask(input),
      store.createTask({ ...input, title: "Publish release notes" }),
    ]);

    const graph = await store.read();
    expect(graph.tasks.map(({ title }) => title)).toEqual([
      "Write release notes",
      "Publish release notes",
    ]);
  });

  it("rejects invalid input without changing the graph file", async () => {
    const path = await createGraphFile();
    const original = await readFile(path, "utf8");
    const store = new GraphStore(path);

    await expect(
      store.createTask({ ...input, title: "", duration: -1 }),
    ).rejects.toThrow();
    expect(await readFile(path, "utf8")).toBe(original);
  });
});
