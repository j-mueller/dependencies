import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  applyNodeChanges,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Edge,
  NodeTypes,
  OnConnect,
  OnNodesChange,
  ReactFlowInstance,
} from "@xyflow/react";

import { layoutGraph } from "../graph/layout";
import { filterTaskGraph } from "../graph/filter-task-graph";
import { projectVisibleGraph } from "../graph/project-visible-graph";
import type { ProjectedRelationship } from "../graph/project-visible-graph";
import type { TaskGraph as TaskGraphModel } from "../model/task-graph";
import { TaskNode } from "./TaskNode";
import type { TaskFlowNode } from "./TaskNode";

interface TaskGraphProps {
  graph: TaskGraphModel;
  hideCompleted: boolean;
  expandedTaskIds: ReadonlySet<string>;
  selectedTaskId: string | undefined;
  selectedRelationshipId: string | undefined;
  onSelect: (taskId: string) => void;
  onSelectRelationship: (relationship: ProjectedRelationship) => void;
  onClearSelection: () => void;
  onToggle: (taskId: string) => void;
  onCreateRequiredFor: (source: string, target: string) => void;
}

const nodeTypes: NodeTypes = { task: TaskNode };
const nodeWidth = 280;
const nodeHeight = 162;

function edgeStrokeWidth(isSelected: boolean, isRequiredFor: boolean): number {
  if (isSelected) {
    return 4;
  }
  return isRequiredFor ? 2.2 : 1.8;
}

export function buildRelationshipEdges(
  relationships: readonly ProjectedRelationship[],
  selectedRelationshipId: string | undefined,
): Edge[] {
  return relationships.map((relationship) => {
    const isRequiredFor = relationship.kind === "is-required-for";
    return {
      id: relationship.id,
      source: relationship.source,
      target: relationship.target,
      type: "smoothstep",
      selected: selectedRelationshipId === relationship.id,
      ariaLabel: `${relationship.kind} relationship from ${relationship.source} to ${relationship.target}`,
      interactionWidth: 24,
      ...(relationship.aggregatedCount > 1
        ? { label: `${relationship.aggregatedCount} required-for links` }
        : {}),
      ...(isRequiredFor ? { markerEnd: { type: MarkerType.ArrowClosed } } : {}),
      style: {
        stroke: isRequiredFor ? "#4f46e5" : "#a855f7",
        ...(isRequiredFor ? {} : { strokeDasharray: "6 5" }),
        strokeWidth: edgeStrokeWidth(
          selectedRelationshipId === relationship.id,
          isRequiredFor,
        ),
      },
      labelStyle: { fill: "#4338ca", fontSize: 11, fontWeight: 600 },
    };
  });
}

export function TaskGraph({
  graph,
  hideCompleted,
  expandedTaskIds,
  selectedTaskId,
  selectedRelationshipId,
  onSelect,
  onSelectRelationship,
  onClearSelection,
  onToggle,
  onCreateRequiredFor,
}: TaskGraphProps) {
  const displayedGraph = useMemo(
    () => filterTaskGraph(graph, hideCompleted),
    [graph, hideCompleted],
  );
  const projected = useMemo(
    () => projectVisibleGraph(displayedGraph, expandedTaskIds),
    [displayedGraph, expandedTaskIds],
  );
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [flowInstance, setFlowInstance] =
    useState<ReactFlowInstance<TaskFlowNode, Edge>>();

  const edges = useMemo<Edge[]>(
    () =>
      buildRelationshipEdges(projected.relationships, selectedRelationshipId),
    [projected.relationships, selectedRelationshipId],
  );

  const layoutEdges = useMemo(
    () =>
      projected.relationships.map(({ id, source, target }) => ({
        id,
        source,
        target,
      })),
    [projected.relationships],
  );

  const nodeDefinitions = useMemo<TaskFlowNode[]>(
    () =>
      projected.tasks.map((task) => ({
        id: task.id,
        type: "task",
        position: { x: 0, y: 0 },
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
        draggable: true,
      })),
    [expandedTaskIds, onSelect, onToggle, projected, selectedTaskId],
  );
  const [nodes, setNodes] = useState<TaskFlowNode[]>(nodeDefinitions);

  const updateNodes = useCallback<OnNodesChange<TaskFlowNode>>((changes) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const connectTasks = useCallback<OnConnect>(
    ({ source, target }) => {
      if (source !== null && target !== null && source !== target) {
        onCreateRequiredFor(source, target);
      }
    },
    [onCreateRequiredFor],
  );

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- controlled React Flow nodes retain measured and dragged state while graph data changes.
    setNodes((current) => {
      const currentById = new Map(current.map((node) => [node.id, node]));
      const nextNodes: TaskFlowNode[] = [];
      for (const definition of nodeDefinitions) {
        const existing = currentById.get(definition.id);
        nextNodes.push(
          existing === undefined
            ? definition
            : { ...existing, ...definition, position: existing.position },
        );
      }
      return nextNodes;
    });
  }, [nodeDefinitions]);

  useEffect(() => {
    let active = true;
    const inputs = projected.tasks.map(({ id }) => ({
      id,
      width: nodeWidth,
      height: nodeHeight,
    }));
    const updateLayout = async (): Promise<void> => {
      const result = await layoutGraph(inputs, layoutEdges);
      if (active) {
        setNodes((current) => {
          const nextNodes: TaskFlowNode[] = [];
          for (const node of current) {
            nextNodes.push({
              ...node,
              position: result.positions.get(node.id) ?? node.position,
            });
          }
          return nextNodes;
        });
        setLayoutVersion((current) => current + 1);
      }
    };
    void updateLayout();
    return () => {
      active = false;
    };
  }, [layoutEdges, projected.tasks]);

  useEffect(() => {
    if (flowInstance !== undefined && layoutVersion > 0) {
      void flowInstance.fitView({ padding: 0.16 });
    }
  }, [flowInstance, layoutVersion]);

  return (
    <div
      className="h-full min-h-[32rem] w-full"
      aria-label="Task relationship graph"
    >
      <ReactFlow<TaskFlowNode, Edge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={setFlowInstance}
        onNodesChange={updateNodes}
        onConnect={connectTasks}
        onEdgeClick={(_event, edge) => {
          const relationship = projected.relationships.find(
            ({ id }) => id === edge.id,
          );
          if (relationship !== undefined) {
            onSelectRelationship(relationship);
          }
        }}
        onPaneClick={onClearSelection}
        fitView
        fitViewOptions={{ padding: 0.16 }}
        minZoom={0.25}
        maxZoom={1.5}
        nodesConnectable
        nodesFocusable
        edgesFocusable
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
