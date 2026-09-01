import { describe, expect, it } from "vitest";

import { buildRelationshipEdges } from "./TaskGraph";
import type { ProjectedRelationship } from "../graph/project-visible-graph";

const requiredFor: ProjectedRelationship = {
  id: "projected:is-required-for:a->b",
  kind: "is-required-for",
  source: "a",
  target: "b",
  relationshipIds: ["is-required-for:a->b"],
  aggregatedCount: 1,
};

const subtask: ProjectedRelationship = {
  id: "projected:subtask-of:b->a",
  kind: "subtask-of",
  source: "b",
  target: "a",
  relationshipIds: ["subtask-of:b->a"],
  aggregatedCount: 1,
};

describe("buildRelationshipEdges", () => {
  it("renders required-for edges as solid and subtask edges as dashed", () => {
    const [requiredForEdge, subtaskEdge] = buildRelationshipEdges(
      [requiredFor, subtask],
      undefined,
    );

    expect(requiredForEdge?.animated).not.toBe(true);
    expect(requiredForEdge?.style).not.toHaveProperty("strokeDasharray");
    expect(subtaskEdge?.style).toMatchObject({ strokeDasharray: "6 5" });
  });
});
