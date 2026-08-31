import { describe, expect, it } from "vitest";

import fixture from "./fixtures/issues.json";
import { importGithubIssues } from "./github-import";
import type { Relationship, Task } from "../model/task-graph";

const importedAt = "2026-08-31T12:00:00Z";

function findById<Item extends { id: string }>(
  items: readonly Item[],
  id: string,
): Item {
  const item = items.find((candidate) => candidate.id === id);
  if (item === undefined) {
    throw new Error(`Fixture item ${id} is missing`);
  }
  return item;
}

describe("importGithubIssues", () => {
  it("maps GitHub-owned issue fields and closing pull requests", () => {
    const graph = importGithubIssues({
      existing: undefined,
      repository: "acme/roadmap",
      input: fixture,
      importedAt,
    });
    const task = findById<Task>(graph.tasks, "github:acme/roadmap#2");

    expect(task).toMatchObject({
      title: "Build the graph",
      description: "Render the imported issues.",
      createdAt: "2026-08-02T10:00:00Z",
      status: "completed",
      createdBy: { login: "hubot" },
      duration: 1,
      executionType: "internal",
      metadata: {},
      pullRequests: [
        {
          number: 42,
          title: "Build interactive graph",
          url: "https://github.com/acme/roadmap/pull/42",
          status: "merged",
        },
      ],
    });
    expect(findById<Task>(graph.tasks, "github:acme/roadmap#3")).toMatchObject({
      description: "",
      status: "not-planned",
      createdBy: { login: "ghost" },
    });
  });

  it("imports parent, sub-issue, blocked-by, and blocking relationships once", () => {
    const graph = importGithubIssues({
      existing: undefined,
      repository: "acme/roadmap",
      input: fixture,
      importedAt,
    });

    expect(graph.relationships.map(({ id }) => id).toSorted()).toEqual([
      "depends-on:github:acme/roadmap#2->github:acme/roadmap#3",
      "depends-on:github:acme/roadmap#3->github:acme/roadmap#1",
      "subtask-of:github:acme/roadmap#2->github:acme/roadmap#1",
    ]);
  });

  it("preserves project-local task and relationship metadata on re-import", () => {
    const existing = importGithubIssues({
      existing: undefined,
      repository: "acme/roadmap",
      input: fixture,
      importedAt,
    });
    const task = findById<Task>(existing.tasks, "github:acme/roadmap#2");
    task.duration = 8;
    task.executionType = "external";
    task.metadata = { owner: "platform", estimateSource: "planning" };
    const relationship = findById<Relationship>(
      existing.relationships,
      "depends-on:github:acme/roadmap#2->github:acme/roadmap#3",
    );
    relationship.metadata = { confidence: 0.6 };

    const refreshed = importGithubIssues({
      existing,
      repository: "acme/roadmap",
      input: fixture,
      importedAt: "2026-08-31T13:00:00Z",
    });

    expect(
      findById<Task>(refreshed.tasks, "github:acme/roadmap#2"),
    ).toMatchObject({
      duration: 8,
      executionType: "external",
      metadata: { owner: "platform", estimateSource: "planning" },
    });
    expect(
      findById<Relationship>(refreshed.relationships, relationship.id).metadata,
    ).toEqual({ confidence: 0.6 });
  });

  it("rejects malformed GitHub CLI output at the boundary", () => {
    expect(() =>
      importGithubIssues({
        existing: undefined,
        repository: "acme/roadmap",
        input: [{ number: "one" }],
        importedAt,
      }),
    ).toThrow();
  });
});
