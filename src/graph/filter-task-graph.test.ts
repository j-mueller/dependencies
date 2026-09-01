import { describe, expect, it } from "vitest";

import { filterTaskGraph } from "./filter-task-graph";
import { projectVisibleGraph } from "./project-visible-graph";
import type { Task, TaskGraph } from "../model/task-graph";

function task(id: string, status: Task["status"]): Task {
  return {
    id,
    source: { provider: "local" },
    title: id,
    description: "",
    createdAt: "2026-09-01T10:00:00Z",
    status,
    createdBy: { login: "jann" },
    pullRequests: [],
    duration: 1,
    executionType: "internal",
    metadata: {},
  };
}

const graph: TaskGraph = {
  schemaVersion: 2,
  project: { name: "Filter test" },
  tasks: [
    task("completed-parent", "completed"),
    task("cancelled-task", "cancelled"),
    task("open-child", "open"),
    task("open-prerequisite", "open"),
  ],
  relationships: [
    {
      id: "subtask-of:open-child->completed-parent",
      kind: "subtask-of",
      source: "open-child",
      target: "completed-parent",
      metadata: {},
    },
    {
      id: "is-required-for:open-prerequisite->open-child",
      kind: "is-required-for",
      source: "open-prerequisite",
      target: "open-child",
      metadata: {},
    },
  ],
};

describe("filterTaskGraph", () => {
  it("removes completed and cancelled tasks and incident relationships", () => {
    const filtered = filterTaskGraph(graph, true);

    expect(filtered.tasks.map(({ id }) => id)).toEqual([
      "open-child",
      "open-prerequisite",
    ]);
    expect(filtered.relationships.map(({ id }) => id)).toEqual([
      "is-required-for:open-prerequisite->open-child",
    ]);
  });

  it("promotes an unfinished child when its completed parent is hidden", () => {
    const projected = projectVisibleGraph(
      filterTaskGraph(graph, true),
      new Set(),
    );

    expect(projected.tasks.map(({ id }) => id)).toEqual([
      "open-child",
      "open-prerequisite",
    ]);
  });

  it("returns the original graph when completed tasks are shown", () => {
    expect(filterTaskGraph(graph, false)).toBe(graph);
  });
});
