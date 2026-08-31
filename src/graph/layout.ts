import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode } from "elkjs/lib/elk.bundled.js";

export interface LayoutNodeInput {
  id: string;
  width: number;
  height: number;
}

export interface LayoutEdgeInput {
  id: string;
  source: string;
  target: string;
}

export interface LayoutPosition {
  x: number;
  y: number;
}

export interface LayoutResult {
  positions: Map<string, LayoutPosition>;
  width: number;
  height: number;
}

const elk = new ELK();

const layoutOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.layered.spacing.nodeNodeBetweenLayers": "120",
  "elk.padding": "[top=40,left=40,bottom=40,right=40]",
  "elk.spacing.nodeNode": "64",
};

export async function layoutGraph(
  nodes: readonly LayoutNodeInput[],
  edges: readonly LayoutEdgeInput[],
): Promise<LayoutResult> {
  if (nodes.length === 0) {
    return { positions: new Map(), width: 0, height: 0 };
  }

  const graph: ElkNode = {
    id: "task-graph",
    layoutOptions,
    children: nodes.map((node) => ({ ...node })),
    edges: edges.map(({ id, source, target }) => ({
      id,
      sources: [source],
      targets: [target],
    })),
  };
  const layout = await elk.layout(graph);
  const positions = new Map<string, LayoutPosition>();
  for (const node of layout.children ?? []) {
    if (node.x === undefined || node.y === undefined) {
      throw new Error(`ELK returned no position for node ${node.id}`);
    }
    positions.set(node.id, { x: node.x, y: node.y });
  }

  return {
    positions,
    width: layout.width ?? 0,
    height: layout.height ?? 0,
  };
}
