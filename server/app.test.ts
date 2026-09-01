// @vitest-environment node

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "./app.js";

const emptyGraph = {
  schemaVersion: 1,
  project: { name: "Test roadmap" },
  tasks: [],
  relationships: [],
} as const;

const temporaryDirectories: string[] = [];

async function createFixture(): Promise<{
  dataPath: string;
  staticRoot: string;
}> {
  const directory = await mkdtemp(join(tmpdir(), "task-atlas-api-"));
  temporaryDirectories.push(directory);
  const dataPath = join(directory, "tasks.json");
  const staticRoot = join(directory, "dist");
  await writeFile(dataPath, `${JSON.stringify(emptyGraph)}\n`);
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
