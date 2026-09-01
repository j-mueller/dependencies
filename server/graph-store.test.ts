// @vitest-environment node

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { GraphStore } from "./graph-store.js";

const emptyGraph = {
  schemaVersion: 2,
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

async function createGraphFile(
  contents: unknown = emptyGraph,
): Promise<string> {
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
  it("persists a version 1 graph in the current format", async () => {
    const path = await createGraphFile({
      schemaVersion: 1,
      project: emptyGraph.project,
      tasks: [],
      relationships: [],
    });
    const store = new GraphStore(path);

    const graph = await store.migrate();

    expect(graph.schemaVersion).toBe(2);
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual(graph);
  });

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

  it("atomically marks a task completed without changing its other fields", async () => {
    const path = await createGraphFile();
    const store = new GraphStore(path, {
      createId: () => "9ca29d0a-c37d-49f7-98ed-4d8379776c69",
      now: () => new Date("2026-09-01T08:00:00Z"),
    });
    const created = await store.createTask(input);

    const result = await store.updateTask({
      id: created.task.id,
      status: "completed",
    });

    expect(result.task).toEqual({ ...created.task, status: "completed" });
    expect(result.graph.tasks).toEqual([result.task]);
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual(result.graph);
  });

  it("atomically changes a task execution type without changing its other fields", async () => {
    const path = await createGraphFile();
    const store = new GraphStore(path, {
      createId: () => "9ca29d0a-c37d-49f7-98ed-4d8379776c69",
      now: () => new Date("2026-09-01T08:00:00Z"),
    });
    const created = await store.createTask(input);

    const result = await store.updateTask({
      id: created.task.id,
      executionType: "external",
    });

    expect(result.task).toEqual({
      ...created.task,
      executionType: "external",
    });
    expect(result.graph.tasks).toEqual([result.task]);
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual(result.graph);
  });

  it("rejects a stale task status update without changing the graph", async () => {
    const path = await createGraphFile();
    const original = await readFile(path, "utf8");
    const store = new GraphStore(path);

    await expect(
      store.updateTask({ id: "missing", status: "completed" }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(await readFile(path, "utf8")).toBe(original);
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

  it("creates and persists a validated is-required-for relationship", async () => {
    const path = await createGraphFile();
    let nextId = 0;
    const store = new GraphStore(path, {
      createId: () => `00000000-0000-4000-8000-00000000000${++nextId}`,
      now: () => new Date("2026-09-01T08:00:00Z"),
    });
    const prerequisite = await store.createTask({
      ...input,
      title: "Approve release",
    });
    const dependent = await store.createTask(input);

    const { graph, relationship } = await store.createRequiredFor({
      source: prerequisite.task.id,
      target: dependent.task.id,
    });

    expect(relationship).toEqual({
      id: `is-required-for:${prerequisite.task.id}->${dependent.task.id}`,
      kind: "is-required-for",
      source: prerequisite.task.id,
      target: dependent.task.id,
      metadata: {},
    });
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual(graph);
  });

  it("rejects invalid and duplicate dependencies without changing the graph", async () => {
    const path = await createGraphFile();
    let nextId = 0;
    const store = new GraphStore(path, {
      createId: () => `00000000-0000-4000-8000-00000000000${++nextId}`,
      now: () => new Date("2026-09-01T08:00:00Z"),
    });
    const first = await store.createTask(input);
    const second = await store.createTask({ ...input, title: "Second task" });
    await store.createRequiredFor({
      source: first.task.id,
      target: second.task.id,
    });
    const original = await readFile(path, "utf8");

    await expect(
      store.createRequiredFor({
        source: second.task.id,
        target: first.task.id,
      }),
    ).rejects.toThrow(/cycle/iu);
    await expect(
      store.createRequiredFor({
        source: first.task.id,
        target: second.task.id,
      }),
    ).rejects.toThrow(/duplicate/iu);
    await expect(
      store.createRequiredFor({ source: first.task.id, target: "missing" }),
    ).rejects.toThrow(/unknown target/iu);
    expect(await readFile(path, "utf8")).toBe(original);
  });

  it("deletes selected relationships atomically", async () => {
    const path = await createGraphFile();
    let nextId = 0;
    const store = new GraphStore(path, {
      createId: () => `00000000-0000-4000-8000-00000000000${++nextId}`,
      now: () => new Date("2026-09-01T08:00:00Z"),
    });
    const first = await store.createTask(input);
    const second = await store.createTask({ ...input, title: "Second task" });
    const created = await store.createRequiredFor({
      source: first.task.id,
      target: second.task.id,
    });

    const result = await store.deleteRelationships({
      ids: [created.relationship.id],
    });

    expect(result.deletedRelationshipIds).toEqual([created.relationship.id]);
    expect(result.graph.relationships).toEqual([]);
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual(result.graph);
  });

  it("deletes a task and all of its incident relationships atomically", async () => {
    const path = await createGraphFile();
    let nextId = 0;
    const store = new GraphStore(path, {
      createId: () => `00000000-0000-4000-8000-00000000000${++nextId}`,
      now: () => new Date("2026-09-01T08:00:00Z"),
    });
    const first = await store.createTask(input);
    const second = await store.createTask({ ...input, title: "Second task" });
    const created = await store.createRequiredFor({
      source: first.task.id,
      target: second.task.id,
    });

    const result = await store.deleteTask({ id: second.task.id });

    expect(result.deletedTaskId).toBe(second.task.id);
    expect(result.deletedRelationshipIds).toEqual([created.relationship.id]);
    expect(result.graph.tasks).toEqual([first.task]);
    expect(result.graph.relationships).toEqual([]);
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual(result.graph);
  });

  it("rejects stale deletions without changing the graph", async () => {
    const path = await createGraphFile();
    const original = await readFile(path, "utf8");
    const store = new GraphStore(path);

    await expect(store.deleteTask({ id: "missing" })).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(
      store.deleteRelationships({ ids: ["missing"] }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(await readFile(path, "utf8")).toBe(original);
  });
});
