import { useCallback, useMemo, useState } from "react";

import { deleteRelationships, deleteTask } from "../api/task-api";
import type { ProjectedRelationship } from "../graph/project-visible-graph";
import type { Task, TaskGraph } from "../model/task-graph";

type DeleteTarget =
  | {
      kind: "task";
      taskId: string;
      taskTitle: string;
      relationshipCount: number;
    }
  | { kind: "relationships"; relationshipIds: string[] };

export interface DeletionConfirmation {
  confirmLabel: string;
  description: string;
  title: string;
}

export interface GraphDeletionController {
  confirmation: DeletionConfirmation | undefined;
  error: string | undefined;
  isSubmitting: boolean;
  handleCancel: () => void;
  handleConfirm: () => Promise<void>;
  handleRequestRelationships: (relationship: ProjectedRelationship) => void;
  handleRequestTask: (task: Task) => void;
}

interface UseGraphDeletionOptions {
  graph: TaskGraph;
  onClearSelection: () => void;
  onGraphChange: (graph: TaskGraph) => void;
  onTaskDeleted: (taskId: string) => void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function confirmationFor(
  target: DeleteTarget | undefined,
): DeletionConfirmation | undefined {
  if (target === undefined) {
    return undefined;
  }
  if (target.kind === "task") {
    const relationshipLabel =
      target.relationshipCount === 1 ? "relationship" : "relationships";
    return {
      confirmLabel: "Delete task",
      description: `Delete “${target.taskTitle}”? This also deletes ${target.relationshipCount} connected ${relationshipLabel}. This cannot be undone.`,
      title: "Delete task?",
    };
  }
  const count = target.relationshipIds.length;
  return {
    confirmLabel:
      count === 1 ? "Delete relationship" : `Delete ${count} relationships`,
    description:
      count === 1
        ? "Delete this relationship? This cannot be undone."
        : `Delete these ${count} relationships? This cannot be undone.`,
    title: count === 1 ? "Delete relationship?" : "Delete relationships?",
  };
}

function useDeleteTarget(graph: TaskGraph, onRequest: () => void) {
  const [target, setTarget] = useState<DeleteTarget>();
  const clearTarget = useCallback(() => setTarget(undefined), []);
  const handleRequestTask = useCallback(
    (task: Task) => {
      onRequest();
      const relationshipCount = graph.relationships.filter(
        ({ source, target: relationshipTarget }) =>
          source === task.id || relationshipTarget === task.id,
      ).length;
      setTarget({
        kind: "task",
        taskId: task.id,
        taskTitle: task.title,
        relationshipCount,
      });
    },
    [graph.relationships, onRequest],
  );
  const handleRequestRelationships = useCallback(
    (relationship: ProjectedRelationship) => {
      onRequest();
      setTarget({
        kind: "relationships",
        relationshipIds: relationship.relationshipIds,
      });
    },
    [onRequest],
  );
  return {
    target,
    clearTarget,
    handleRequestRelationships,
    handleRequestTask,
  };
}

export function useGraphDeletion({
  graph,
  onClearSelection,
  onGraphChange,
  onTaskDeleted,
}: UseGraphDeletionOptions): GraphDeletionController {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletionError, setDeletionError] = useState<string>();
  const clearError = useCallback(() => setDeletionError(undefined), []);
  const { target, clearTarget, handleRequestRelationships, handleRequestTask } =
    useDeleteTarget(graph, clearError);

  const handleCancel = useCallback(() => {
    if (!isSubmitting) {
      clearTarget();
    }
  }, [clearTarget, isSubmitting]);

  const handleConfirm = useCallback(async () => {
    if (target === undefined) {
      return;
    }
    setIsSubmitting(true);
    setDeletionError(undefined);
    try {
      const result =
        target.kind === "task"
          ? await deleteTask(target.taskId)
          : await deleteRelationships({ ids: target.relationshipIds });
      onGraphChange(result.graph);
      if (target.kind === "task") {
        onTaskDeleted(target.taskId);
      }
      onClearSelection();
      clearTarget();
    } catch (error: unknown) {
      setDeletionError(errorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [clearTarget, onClearSelection, onGraphChange, onTaskDeleted, target]);

  const confirmation = useMemo(() => confirmationFor(target), [target]);
  return {
    confirmation,
    error: deletionError,
    isSubmitting,
    handleCancel,
    handleConfirm,
    handleRequestRelationships,
    handleRequestTask,
  };
}
