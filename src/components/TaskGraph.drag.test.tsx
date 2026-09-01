import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type {
  Node,
  NodeChange,
  ReactFlow as ReactFlowComponent,
} from "@xyflow/react";

import { TaskGraph } from "./TaskGraph";
import type { TaskGraph as TaskGraphModel } from "../model/task-graph";

type ReactFlowProps = ComponentProps<typeof ReactFlowComponent>;

const flowCapture = vi.hoisted(() => ({
  props: undefined as ReactFlowProps | undefined,
}));

vi.mock("@xyflow/react", () => ({
  applyNodeChanges: (changes: NodeChange[], nodes: Node[]) => {
    const changedNodes: Node[] = [];
    for (const node of nodes) {
      const change = changes.find(
        (candidate) =>
          candidate.type === "position" && candidate.id === node.id,
      );
      changedNodes.push(
        change?.type === "position" && change.position !== undefined
          ? { ...node, position: change.position }
          : node,
      );
    }
    return changedNodes;
  },
  Background: () => null,
  BackgroundVariant: { Dots: "dots" },
  Controls: () => null,
  Handle: () => null,
  MarkerType: { ArrowClosed: "arrowclosed" },
  MiniMap: () => null,
  Position: { Left: "left", Right: "right" },
  ReactFlow: (props: ReactFlowProps) => {
    flowCapture.props = props;
    const position = props.nodes?.[0]?.position;
    return (
      <p>
        {position === undefined ? "missing" : `${position.x},${position.y}`}
      </p>
    );
  },
}));

vi.mock("../graph/layout", () => ({
  layoutGraph: () =>
    Promise.resolve({
      positions: new Map([["task-a", { x: 0, y: 0 }]]),
      width: 280,
      height: 162,
    }),
}));

const graph: TaskGraphModel = {
  schemaVersion: 2,
  project: { name: "Drag test" },
  tasks: [
    {
      id: "task-a",
      source: { provider: "local" },
      title: "Task A",
      description: "",
      createdAt: "2026-09-01T10:00:00Z",
      status: "open",
      createdBy: { login: "jann" },
      pullRequests: [],
      duration: 1,
      executionType: "internal",
      metadata: {},
    },
  ],
  relationships: [],
};

describe("TaskGraph dragging", () => {
  it("updates a controlled node while the pointer moves", async () => {
    render(
      <TaskGraph
        graph={graph}
        hideCompleted={false}
        expandedTaskIds={new Set()}
        selectedTaskId={undefined}
        selectedRelationshipId={undefined}
        onSelect={vi.fn()}
        onSelectRelationship={vi.fn()}
        onClearSelection={vi.fn()}
        onToggle={vi.fn()}
        onCreateRequiredFor={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText("0,0")).toBeVisible());
    const node = flowCapture.props?.nodes?.[0];
    if (node === undefined) {
      throw new Error("Expected a rendered task node");
    }

    act(() => {
      flowCapture.props?.onNodesChange?.([
        {
          id: node.id,
          type: "position",
          position: { x: 48, y: 24 },
          dragging: true,
        },
      ]);
    });

    expect(screen.getByText("48,24")).toBeVisible();
  });
});
