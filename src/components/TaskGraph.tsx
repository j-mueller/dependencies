import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
} from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import type { Edge, NodeTypes, ReactFlowInstance } from "@xyflow/react";

import { layoutGraph } from "../graph/layout";
import type { LayoutPosition } from "../graph/layout";
import { projectVisibleGraph } from "../graph/project-visible-graph";
import type { TaskGraph as TaskGraphModel } from "../model/task-graph";
import { TaskNode } from "./TaskNode";
import type { TaskFlowNode } from "./TaskNode";

interface TaskGraphProps {
  graph: TaskGraphModel;
  expandedTaskIds: ReadonlySet<string>;
  selectedTaskId: string | undefined;
  onSelect: (taskId: string) => void;
  onToggle: (taskId: string) => void;
}

const nodeTypes: NodeTypes = { task: TaskNode };
const nodeWidth = 280;
const nodeHeight = 162;

export function TaskGraph({
  graph,
  expandedTaskIds,
  selectedTaskId,
  onSelect,
  onToggle,
}: TaskGraphProps) {
  const projected = useMemo(
    () => projectVisibleGraph(graph, expandedTaskIds),
    [expandedTaskIds, graph],
  );
  const [positions, setPositions] = useState<Map<string, LayoutPosition>>(
    new Map(),
  );
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance>();

  const edges = useMemo<Edge[]>(
    () =>
      projected.relationships.map((relationship) => {
        const dependency = relationship.kind === "depends-on";
        return {
          id: relationship.id,
          source: relationship.source,
          target: relationship.target,
          type: "smoothstep",
          ...(relationship.aggregatedCount > 1
            ? { label: `${relationship.aggregatedCount} dependencies` }
            : {}),
          animated: dependency,
          ...(dependency
            ? { markerEnd: { type: MarkerType.ArrowClosed } }
            : {}),
          style: {
            stroke: dependency ? "#4f46e5" : "#a855f7",
            ...(dependency ? {} : { strokeDasharray: "6 5" }),
            strokeWidth: dependency ? 2.2 : 1.8,
          },
          labelStyle: { fill: "#4338ca", fontSize: 11, fontWeight: 600 },
        };
      }),
    [projected.relationships],
  );

  const nodes = useMemo<TaskFlowNode[]>(
    () =>
      projected.tasks.map((task) => ({
        id: task.id,
        type: "task",
        position: positions.get(task.id) ?? { x: 0, y: 0 },
        initialWidth: nodeWidth,
        initialHeight: nodeHeight,
        data: {
          task,
          hasChildren: projected.childrenByParent.has(task.id),
          expanded: expandedTaskIds.has(task.id),
          selected: selectedTaskId === task.id,
          onSelect,
          onToggle,
        },
        draggable: false,
      })),
    [expandedTaskIds, onSelect, onToggle, positions, projected, selectedTaskId],
  );

  useEffect(() => {
    let active = true;
    const inputs = projected.tasks.map(({ id }) => ({
      id,
      width: nodeWidth,
      height: nodeHeight,
    }));
    const updateLayout = async (): Promise<void> => {
      const result = await layoutGraph(inputs, edges);
      if (active) {
        setPositions(result.positions);
      }
    };
    void updateLayout();
    return () => {
      active = false;
    };
  }, [edges, projected.tasks]);

  useEffect(() => {
    if (flowInstance !== undefined && positions.size > 0) {
      void flowInstance.fitView({ padding: 0.16 });
    }
  }, [flowInstance, positions]);

  return (
    <div
      className="h-full min-h-[32rem] w-full"
      aria-label="Task relationship graph"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={setFlowInstance}
        fitView
        fitViewOptions={{ padding: 0.16 }}
        minZoom={0.25}
        maxZoom={1.5}
        nodesConnectable={false}
        nodesFocusable
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color="#cbd5e1"
          gap={24}
          size={1.2}
          variant={BackgroundVariant.Dots}
        />
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) => {
            const { task } = node.data;
            return typeof task === "object" &&
              task !== null &&
              "executionType" in task &&
              task.executionType === "external"
              ? "#f59e0b"
              : "#6366f1";
          }}
          maskColor="rgba(248, 250, 252, 0.78)"
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
