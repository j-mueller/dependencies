// @vitest-environment node

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "./app.js";

const emptyGraph = {
  schemaVersion: 2,
  project: { name: "Test roadmap" },
  tasks: [],
  relationships: [],
} as const;

const temporaryDirectories: string[] = [];

async function createFixture(contents: unknown = emptyGraph): Promise<{
  dataPath: string;
  staticRoot: string;
}> {
  const directory = await mkdtemp(join(tmpdir(), "task-atlas-api-"));
  temporaryDirectories.push(directory);
  const dataPath = join(directory, "tasks.json");
  const staticRoot = join(directory, "dist");
  await writeFile(dataPath, `${JSON.stringify(contents)}\n`);
  await mkdir(staticRoot);
  await writeFile(join(staticRoot, "index.html"), "<main>Task Atlas</main>");
  return { dataPath, staticRoot };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

describe("Task Atlas API", () => {
  it("serves the current graph", async () => {
    const fixture = await createFixture();
    const app = await buildApp(fixture);

    const response = await app.inject({ method: "GET", url: "/api/graph" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(emptyGraph);
    await app.close();
  });

  it("creates a task and returns the persisted graph", async () => {
    const fixture = await createFixture();
    const app = await buildApp(fixture);

    const response = await app.inject({
      method: "POST",
      url: "/api/tasks",
      payload: {
        title: "Write release notes",
        description: "Summarize the delivered changes.",
        status: "open",
        createdBy: "jann",
        duration: 0.5,
        executionType: "internal",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      task: {
        title: "Write release notes",
        source: { provider: "local" },
      },
      graph: { tasks: [{ title: "Write release notes" }] },
    });
    expect(JSON.parse(await readFile(fixture.dataPath, "utf8"))).toMatchObject({
      tasks: [{ title: "Write release notes" }],
    });
    await app.close();
  });

  it("creates a subtask and relationship through one API request", async () => {
    const fixture = await createFixture();
    const app = await buildApp(fixture);
    const parentResponse = await app.inject({
      method: "POST",
      url: "/api/tasks",
      payload: {
        title: "Prepare release",
        description: "",
        status: "open",
        createdBy: "jann",
        duration: 1,
        executionType: "internal",
      },
    });
    const parentId = parentResponse.json().task.id as string;

    const response = await app.inject({
      method: "POST",
      url: `/api/tasks/${encodeURIComponent(parentId)}/subtasks`,
      payload: {
        title: "Write release notes",
        description: "Summarize the changes.",
        status: "open",
        createdBy: "jann",
        duration: 0.5,
        executionType: "internal",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      task: { title: "Write release notes" },
      relationship: {
        kind: "subtask-of",
        source: response.json().task.id,
        target: parentId,
      },
      graph: {
        tasks: [{ id: parentId }, { title: "Write release notes" }],
        relationships: [{ kind: "subtask-of", target: parentId }],
      },
    });
    expect(JSON.parse(await readFile(fixture.dataPath, "utf8"))).toEqual(
      response.json().graph,
    );
    await app.close();
  });

  it("returns a validation error without writing invalid input", async () => {
    const fixture = await createFixture();
    const original = await readFile(fixture.dataPath, "utf8");
    const app = await buildApp(fixture);

    const response = await app.inject({
      method: "POST",
      url: "/api/tasks",
      payload: { title: "", duration: -1 },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "Invalid task" });
    expect(await readFile(fixture.dataPath, "utf8")).toBe(original);
    await app.close();
  });

  it("marks a task completed through the API", async () => {
    const fixture = await createFixture();
    const app = await buildApp(fixture);
    const created = await app.inject({
      method: "POST",
      url: "/api/tasks",
      payload: {
        title: "Ship release",
        description: "",
        status: "open",
        createdBy: "jann",
        duration: 1,
        executionType: "internal",
      },
    });
    const taskId = created.json().task.id as string;

    const response = await app.inject({
      method: "PATCH",
      url: `/api/tasks/${encodeURIComponent(taskId)}`,
      payload: { status: "completed" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      task: { id: taskId, status: "completed", title: "Ship release" },
      graph: { tasks: [{ id: taskId, status: "completed" }] },
    });
    expect(JSON.parse(await readFile(fixture.dataPath, "utf8"))).toMatchObject({
      tasks: [{ id: taskId, status: "completed" }],
    });
    await app.close();
  });

  it("changes a task execution type through the API", async () => {
    const fixture = await createFixture();
    const app = await buildApp(fixture);
    const created = await app.inject({
      method: "POST",
      url: "/api/tasks",
      payload: {
        title: "Wait for approval",
        description: "Keep the request ready.",
        status: "open",
        createdBy: "jann",
        duration: 1,
        executionType: "internal",
      },
    });
    const taskId = created.json().task.id as string;

    const response = await app.inject({
      method: "PATCH",
      url: `/api/tasks/${encodeURIComponent(taskId)}`,
      payload: { executionType: "external" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      task: {
        id: taskId,
        executionType: "external",
        status: "open",
        title: "Wait for approval",
      },
      graph: { tasks: [{ id: taskId, executionType: "external" }] },
    });
    expect(JSON.parse(await readFile(fixture.dataPath, "utf8"))).toMatchObject({
      tasks: [{ id: taskId, executionType: "external" }],
    });
    await app.close();
  });

  it("creates an is-required-for relationship and returns the persisted graph", async () => {
    const fixture = await createFixture();
    const app = await buildApp(fixture);
    const create = (title: string) =>
      app.inject({
        method: "POST",
        url: "/api/tasks",
        payload: {
          title,
          description: "",
          status: "open",
          createdBy: "jann",
          duration: 1,
          executionType: "internal",
        },
      });
    const prerequisiteResponse = await create("Approve release");
    const dependentResponse = await create("Ship release");
    const prerequisite = prerequisiteResponse.json().task.id as string;
    const dependent = dependentResponse.json().task.id as string;

    const response = await app.inject({
      method: "POST",
      url: "/api/relationships/is-required-for",
      payload: { source: prerequisite, target: dependent },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      relationship: {
        kind: "is-required-for",
        source: prerequisite,
        target: dependent,
      },
      graph: { relationships: [{ source: prerequisite, target: dependent }] },
    });
    expect(JSON.parse(await readFile(fixture.dataPath, "utf8"))).toMatchObject({
      relationships: [{ source: prerequisite, target: dependent }],
    });
    await app.close();
  });

  it("returns a validation error without writing an invalid required-for link", async () => {
    const fixture = await createFixture();
    const original = await readFile(fixture.dataPath, "utf8");
    const app = await buildApp(fixture);

    const response = await app.inject({
      method: "POST",
      url: "/api/relationships/is-required-for",
      payload: { source: "missing", target: "also-missing" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "Invalid required-for link",
    });
    expect(await readFile(fixture.dataPath, "utf8")).toBe(original);
    await app.close();
  });

  it("deletes relationships through the API", async () => {
    const fixture = await createFixture();
    const app = await buildApp(fixture);
    const missingId = "is-required-for:missing->also-missing";

    const response = await app.inject({
      method: "DELETE",
      url: "/api/relationships",
      payload: { ids: [missingId] },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: `Relationship not found: ${missingId}`,
    });
    await app.close();
  });

  it("deletes a task and its incident relationships through the API", async () => {
    const fixture = await createFixture();
    const app = await buildApp(fixture);
    const created = await app.inject({
      method: "POST",
      url: "/api/tasks",
      payload: {
        title: "Delete me",
        description: "",
        status: "open",
        createdBy: "jann",
        duration: 1,
        executionType: "internal",
      },
    });
    const taskId = created.json().task.id as string;

    const response = await app.inject({
      method: "DELETE",
      url: `/api/tasks/${encodeURIComponent(taskId)}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      deletedTaskId: taskId,
      deletedRelationshipIds: [],
      graph: { tasks: [] },
    });
    expect(JSON.parse(await readFile(fixture.dataPath, "utf8"))).toMatchObject({
      tasks: [],
    });
    await app.close();
  });

  it("deletes URL-encoded GitHub task IDs", async () => {
    const taskId = "github:acme/roadmap#3";
    const fixture = await createFixture({
      ...emptyGraph,
      tasks: [
        {
          id: taskId,
          source: {
            provider: "github",
            repository: "acme/roadmap",
            issueNumber: 3,
            url: "https://github.com/acme/roadmap/issues/3",
          },
          title: "Delete me",
          description: "",
          createdAt: "2026-09-01T08:00:00Z",
          status: "open",
          createdBy: { login: "jann" },
          pullRequests: [],
          duration: 1,
          executionType: "internal",
          metadata: {},
        },
      ],
    });
    const app = await buildApp(fixture);

    const response = await app.inject({
      method: "DELETE",
      url: `/api/tasks/${encodeURIComponent(taskId)}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ deletedTaskId: taskId });
    await app.close();
  });

  it("returns 400 for malformed deletion input", async () => {
    const fixture = await createFixture();
    const original = await readFile(fixture.dataPath, "utf8");
    const app = await buildApp(fixture);

    const response = await app.inject({
      method: "DELETE",
      url: "/api/relationships",
      payload: { ids: [] },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "Invalid deletion" });
    expect(await readFile(fixture.dataPath, "utf8")).toBe(original);
    await app.close();
  });

  it("does not expose filesystem or validation details in server errors", async () => {
    const fixture = await createFixture();
    await writeFile(fixture.dataPath, "not json");
    const app = await buildApp(fixture);

    const response = await app.inject({ method: "GET", url: "/api/graph" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "Could not access task graph" });
    await app.close();
  });

  it("serves the SPA entry point for client routes", async () => {
    const fixture = await createFixture();
    const app = await buildApp(fixture);

    const response = await app.inject({ method: "GET", url: "/tasks/local:1" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("Task Atlas");
    await app.close();
  });
});
