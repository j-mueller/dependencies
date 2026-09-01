import { describe, expect, it } from "vitest";

import { parseTaskGraph } from "./task-graph";

function itemAt<Item>(items: readonly Item[], index: number): Item {
  const item = items.at(index);
  if (item === undefined) {
    throw new Error(`Fixture item ${index} is missing`);
  }
  return item;
}

const task = {
  id: "github:acme/roadmap#1",
  source: {
    provider: "github",
    repository: "acme/roadmap",
    issueNumber: 1,
    url: "https://github.com/acme/roadmap/issues/1",
  },
  title: "Ship the roadmap",
  description: "Make dependencies visible.",
  createdAt: "2026-08-01T10:00:00Z",
  status: "open",
  createdBy: {
    login: "octocat",
    url: "https://github.com/octocat",
  },
  pullRequests: [],
  duration: 2,
  executionType: "internal",
  metadata: { priority: "high" },
} as const;

const validGraph = {
  schemaVersion: 2,
  project: {
    name: "Acme roadmap",
    sourceRepository: "acme/roadmap",
  },
  tasks: [
    task,
    {
      ...task,
      id: "github:acme/roadmap#2",
      source: {
        ...task.source,
        issueNumber: 2,
        url: "https://github.com/acme/roadmap/issues/2",
      },
      title: "Design the roadmap",
    },
  ],
  relationships: [
    {
      id: "is-required-for:github:acme/roadmap#1->github:acme/roadmap#2",
      kind: "is-required-for",
      source: "github:acme/roadmap#1",
      target: "github:acme/roadmap#2",
      metadata: { confidence: 0.8 },
    },
  ],
} as const;

describe("parseTaskGraph", () => {
  it("accepts a valid version 2 task graph", () => {
    const result = parseTaskGraph(validGraph);

    expect(result).toEqual(validGraph);
  });

  it("migrates version 1 dependencies by reversing their endpoints", () => {
    const legacyGraph = {
      ...validGraph,
      schemaVersion: 1,
      relationships: [
        {
          id: "depends-on:dependent->prerequisite",
          kind: "depends-on",
          source: "github:acme/roadmap#1",
          target: "github:acme/roadmap#2",
          metadata: { confidence: 0.8 },
        },
      ],
    };

    expect(parseTaskGraph(legacyGraph)).toMatchObject({
      schemaVersion: 2,
      relationships: [
        {
          id: "is-required-for:github:acme/roadmap#2->github:acme/roadmap#1",
          kind: "is-required-for",
          source: "github:acme/roadmap#2",
          target: "github:acme/roadmap#1",
          metadata: { confidence: 0.8 },
        },
      ],
    });
  });

  it("accepts a locally-created task without a GitHub identity", () => {
    const graph = parseTaskGraph(validGraph);
    graph.tasks.push({
      id: "local:9ca29d0a-c37d-49f7-98ed-4d8379776c69",
      source: { provider: "local" },
      title: "Write release notes",
      description: "Summarize the delivered changes.",
      createdAt: "2026-09-01T08:00:00Z",
      status: "open",
      createdBy: { login: "jann" },
      pullRequests: [],
      duration: 0.5,
      executionType: "internal",
      metadata: {},
    });

    expect(parseTaskGraph(graph).tasks.at(-1)?.source).toEqual({
      provider: "local",
    });
  });

  it("accepts cancelled tasks", () => {
    const cancelledGraph = {
      ...validGraph,
      tasks: [{ ...task, status: "cancelled" }],
      relationships: [],
    } as const;

    expect(parseTaskGraph(cancelledGraph).tasks[0]?.status).toBe("cancelled");
  });

  it("rejects negative durations", () => {
    const graph = parseTaskGraph(validGraph);
    itemAt(graph.tasks, 0).duration = -1;

    expect(() => parseTaskGraph(graph)).toThrow(/duration/iu);
  });

  it("rejects links with executable URL schemes", () => {
    const graph = parseTaskGraph(validGraph);
    const { source } = itemAt(graph.tasks, 0);
    if (source.provider !== "github") {
      throw new Error("Expected a GitHub task fixture");
    }
    // oxlint-disable-next-line no-script-url -- this unsafe scheme is the regression input.
    source.url = "javascript:alert(1)";

    expect(() => parseTaskGraph(graph)).toThrow(/http/iu);
  });

  it("rejects duplicate task IDs", () => {
    const graph = parseTaskGraph(validGraph);
    itemAt(graph.tasks, 1).id = itemAt(graph.tasks, 0).id;

    expect(() => parseTaskGraph(graph)).toThrow(/duplicate task id/iu);
  });

  it("rejects relationships with missing endpoints", () => {
    const graph = parseTaskGraph(validGraph);
    itemAt(graph.relationships, 0).target = "github:acme/roadmap#99";

    expect(() => parseTaskGraph(graph)).toThrow(/unknown target/iu);
  });

  it.each(["is-required-for", "subtask-of"] as const)(
    "rejects %s cycles",
    (kind) => {
      const graph = parseTaskGraph(validGraph);
      const baseRelationship = itemAt(graph.relationships, 0);
      graph.relationships = [
        {
          ...baseRelationship,
          id: `${kind}:1->2`,
          kind,
        },
        {
          ...baseRelationship,
          id: `${kind}:2->1`,
          kind,
          source: itemAt(graph.tasks, 1).id,
          target: itemAt(graph.tasks, 0).id,
        },
      ];

      expect(() => parseTaskGraph(graph)).toThrow(
        new RegExp(`${kind} cycle`, "iu"),
      );
    },
  );
});
