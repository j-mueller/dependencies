import { describe, expect, it } from "vitest";

import type { Relationship, Task, TaskGraph } from "../model/task-graph";
import { projectVisibleGraph } from "./project-visible-graph";

const makeTask = (id: string, issueNumber: number): Task => ({
  id,
  source: {
    provider: "github",
    repository: "acme/roadmap",
    issueNumber,
    url: `https://github.com/acme/roadmap/issues/${issueNumber}`,
  },
  title: id,
  description: "",
  createdAt: "2026-08-01T10:00:00Z",
  status: "open",
  createdBy: {
    login: "octocat",
    url: "https://github.com/octocat",
  },
  pullRequests: [],
  duration: 1,
  executionType: "internal",
  metadata: {},
});

const makeRelationship = (
  kind: Relationship["kind"],
  source: string,
  target: string,
): Relationship => ({
  id: `${kind}:${source}->${target}`,
  kind,
  source,
  target,
  metadata: {},
});

const graph: TaskGraph = {
  schemaVersion: 1,
  project: { name: "Projection fixture" },
  tasks: [
    makeTask("parent", 1),
    makeTask("child-a", 2),
    makeTask("child-b", 3),
    makeTask("grandchild", 4),
    makeTask("external", 5),
  ],
  relationships: [
    makeRelationship("subtask-of", "child-a", "parent"),
    makeRelationship("subtask-of", "child-b", "parent"),
    makeRelationship("subtask-of", "grandchild", "child-b"),
    makeRelationship("depends-on", "child-a", "external"),
    makeRelationship("depends-on", "grandchild", "external"),
  ],
};

describe("projectVisibleGraph", () => {
  it("shows only top-level tasks when every parent is collapsed", () => {
    const projected = projectVisibleGraph(graph, new Set());

    expect(projected.tasks.map(({ id }) => id)).toEqual(["parent", "external"]);
  });

  it("accrues and deduplicates hidden child dependencies", () => {
    const projected = projectVisibleGraph(graph, new Set());

    expect(projected.relationships).toEqual([
      {
        id: "projected:depends-on:parent->external",
        kind: "depends-on",
        source: "parent",
        target: "external",
        relationshipIds: [
          "depends-on:child-a->external",
          "depends-on:grandchild->external",
        ],
        aggregatedCount: 2,
      },
    ]);
  });

  it("shows direct children and their applicable relationships", () => {
    const projected = projectVisibleGraph(graph, new Set(["parent"]));

    expect(projected.tasks.map(({ id }) => id)).toEqual([
      "parent",
      "child-a",
      "child-b",
      "external",
    ]);
    expect(
      projected.relationships.map(({ kind, source, target }) => ({
        kind,
        source,
        target,
      })),
    ).toEqual([
      { kind: "subtask-of", source: "child-a", target: "parent" },
      { kind: "subtask-of", source: "child-b", target: "parent" },
      { kind: "depends-on", source: "child-a", target: "external" },
      { kind: "depends-on", source: "child-b", target: "external" },
    ]);
  });

  it("expands nested parents independently", () => {
    const projected = projectVisibleGraph(
      graph,
      new Set(["parent", "child-b"]),
    );

    expect(projected.tasks.map(({ id }) => id)).toEqual([
      "parent",
      "child-a",
      "child-b",
      "grandchild",
      "external",
    ]);
    expect(projected.childrenByParent.get("parent")).toEqual([
      "child-a",
      "child-b",
    ]);
    expect(projected.childrenByParent.get("child-b")).toEqual(["grandchild"]);
  });
});
