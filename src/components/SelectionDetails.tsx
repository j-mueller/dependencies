import type { ProjectedRelationship } from "../graph/project-visible-graph";
import type { Task, TaskGraph, TaskStatus } from "../model/task-graph";
import { RelationshipDetails } from "./RelationshipDetails";
import { TaskDetails } from "./TaskDetails";

export type GraphSelection =
  | { kind: "task"; taskId: string }
  | { kind: "relationship"; relationship: ProjectedRelationship };

interface SelectionDetailsProps {
  graph: TaskGraph;
  selection: GraphSelection | undefined;
  isUpdatingTask: boolean;
  taskUpdateError: string | undefined;
  updatingTaskStatus: TaskStatus | undefined;
  onCancelTask: (task: Task) => void;
  onChangeExecutionType: (
    task: Task,
    executionType: Task["executionType"],
  ) => void;
  onDeleteRelationships: (relationship: ProjectedRelationship) => void;
  onDeleteTask: (task: Task) => void;
  onMarkTaskDone: (task: Task) => void;
}

export function SelectionDetails({
  graph,
  selection,
  isUpdatingTask,
  taskUpdateError,
  updatingTaskStatus,
  onCancelTask,
  onChangeExecutionType,
  onDeleteRelationships,
  onDeleteTask,
  onMarkTaskDone,
}: SelectionDetailsProps) {
  if (selection?.kind === "relationship") {
    return (
      <RelationshipDetails
        graph={graph}
        relationship={selection.relationship}
        onDelete={() => onDeleteRelationships(selection.relationship)}
      />
    );
  }
  const task =
    selection?.kind === "task"
      ? graph.tasks.find(({ id }) => id === selection.taskId)
      : undefined;
  return (
    <TaskDetails
      task={task}
      error={taskUpdateError}
      isUpdating={isUpdatingTask}
      updatingStatus={updatingTaskStatus}
      onCancel={() => {
        if (task !== undefined) {
          onCancelTask(task);
        }
      }}
      onDelete={() => {
        if (task !== undefined) {
          onDeleteTask(task);
        }
      }}
      onExecutionTypeChange={(executionType) => {
        if (task !== undefined) {
          onChangeExecutionType(task, executionType);
        }
      }}
      onMarkDone={() => {
        if (task !== undefined) {
          onMarkTaskDone(task);
        }
      }}
    />
  );
}
