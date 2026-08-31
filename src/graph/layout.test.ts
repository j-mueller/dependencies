import { describe, expect, it } from "vitest";

import { layoutGraph } from "./layout";

const nodes = [
  { id: "dependent", width: 280, height: 160 },
  { id: "prerequisite", width: 280, height: 160 },
];

const edges = [
  {
    id: "depends-on:dependent->prerequisite",
    source: "dependent",
    target: "prerequisite",
  },
];

describe("layoutGraph", () => {
  it("lays dependency edges out from left to right", async () => {
    const result = await layoutGraph(nodes, edges);
    const dependent = result.positions.get("dependent");
    const prerequisite = result.positions.get("prerequisite");

    expect(dependent).toBeDefined();
    expect(prerequisite).toBeDefined();
    expect(prerequisite?.x).toBeGreaterThan(
      dependent?.x ?? Number.POSITIVE_INFINITY,
    );
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it("returns deterministic coordinates", async () => {
    const first = await layoutGraph(nodes, edges);
    const second = await layoutGraph(nodes, edges);

    expect(second).toEqual(first);
  });

  it("handles an empty graph without invoking a layout", async () => {
    await expect(layoutGraph([], [])).resolves.toEqual({
      positions: new Map(),
      width: 0,
      height: 0,
    });
  });
});
