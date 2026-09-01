import { AlertCircle, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createRequiredFor,
  createTask,
  loadTaskGraph,
  updateTask,
} from "./api/task-api";
import { CreateTaskDialog } from "./components/CreateTaskDialog";
import { DeleteConfirmationDialog } from "./components/DeleteConfirmationDialog";
import { GraphLegend, GraphToolbar } from "./components/GraphToolbar";
import { SelectionDetails } from "./components/SelectionDetails";
import type { GraphSelection } from "./components/SelectionDetails";
import { TaskGraph } from "./components/TaskGraph";
import { useGraphDeletion } from "./hooks/useGraphDeletion";
import { isCompletedOrCancelled } from "./model/task-graph";
import type {
  CreateTaskInput,
  TaskStatus,
  TaskGraph as TaskGraphModel,
  UpdateTaskBody,
} from "./model/task-graph";

type PendingTaskUpdate = TaskStatus | "execution-type";

type GraphResource =
  | { kind: "loading" }
  | { kind: "ready"; graph: TaskGraphModel }
  | { kind: "error"; message: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function recentCreators(graph: TaskGraphModel, limit = 8): string[] {
  const creators = new Set<string>();
  return graph.tasks
    .toSorted((left, right) => right.createdAt.localeCompare(left.createdAt))
    .flatMap(({ createdBy }) => {
      if (creators.has(createdBy.login) || creators.size >= limit) {
        return [];
      }
      creators.add(createdBy.login);
      return [createdBy.login];
    });
}

function TaskWorkspace({ initialGraph }: { initialGraph: TaskGraphModel }) {
  const [graph, setGraph] = useState(initialGraph);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(
    new Set(),
  );
  const [selection, setSelection] = useState<GraphSelection>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string>();
  const [relationshipError, setRelationshipError] = useState<string>();
  const [taskUpdateError, setTaskUpdateError] = useState<string>();
  const [pendingTaskUpdate, setPendingTaskUpdate] =
    useState<PendingTaskUpdate>();
  const [hideCompleted, setHideCompleted] = useState(false);
  const [layoutRequest, setLayoutRequest] = useState(0);

  const clearSelection = useCallback(() => setSelection(undefined), []);
  const removeExpandedTask = useCallback((taskId: string) => {
    setExpandedTaskIds((current) => {
      const next = new Set(current);
      next.delete(taskId);
      return next;
    });
  }, []);
  const deletion = useGraphDeletion({
    graph,
    onClearSelection: clearSelection,
    onGraphChange: setGraph,
    onTaskDeleted: removeExpandedTask,
  });

  const toggleTask = useCallback((taskId: string) => {
    setSelection(undefined);
    setExpandedTaskIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const submitTask = useCallback(async (input: CreateTaskInput) => {
    setIsCreating(true);
    setCreateError(undefined);
    try {
      const result = await createTask(input);
      setGraph(result.graph);
      setSelection({ kind: "task", taskId: result.task.id });
      setIsCreateOpen(false);
    } catch (error: unknown) {
      setCreateError(errorMessage(error));
    } finally {
      setIsCreating(false);
    }
  }, []);

  const submitRequiredFor = useCallback(
    async (source: string, target: string) => {
      setRelationshipError(undefined);
      try {
        const result = await createRequiredFor({ source, target });
        setGraph(result.graph);
      } catch (error: unknown) {
        setRelationshipError(errorMessage(error));
      }
    },
    [],
  );

  const changeTask = useCallback(
    async (
      taskId: string,
      input: UpdateTaskBody,
      pendingUpdate: PendingTaskUpdate,
    ) => {
      setPendingTaskUpdate(pendingUpdate);
      setTaskUpdateError(undefined);
      try {
        const result = await updateTask(taskId, input);
        setGraph(result.graph);
        if (
          hideCompleted &&
          input.status !== undefined &&
          isCompletedOrCancelled(input.status)
        ) {
          setSelection(undefined);
        }
      } catch (error: unknown) {
        setTaskUpdateError(errorMessage(error));
      } finally {
        setPendingTaskUpdate(undefined);
      }
    },
    [hideCompleted],
  );

  const createdByOptions = useMemo(() => recentCreators(graph), [graph]);
  const hiddenTaskCount = useMemo(
    () =>
      graph.tasks.filter(({ status }) => isCompletedOrCancelled(status)).length,
    [graph.tasks],
  );
  const selectedRelationshipId =
    selection?.kind === "relationship" ? selection.relationship.id : undefined;

  return (
    <main className="app-shell">
      <GraphToolbar
        projectName={graph.project.name}
        taskCount={graph.tasks.length}
        relationshipCount={graph.relationships.length}
        onCreateTask={() => {
          setCreateError(undefined);
          setIsCreateOpen(true);
        }}
        onRelayout={() => setLayoutRequest((current) => current + 1)}
      />
      <div className="workspace">
        <section className="graph-panel">
          <GraphLegend
            hideCompleted={hideCompleted}
            hiddenTaskCount={hiddenTaskCount}
            onHideCompletedChange={(nextHideCompleted) => {
              setHideCompleted(nextHideCompleted);
              setSelection(undefined);
            }}
          />
          {relationshipError === undefined ? null : (
            <p
              className="mx-4 mt-3 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700"
              role="alert"
            >
              {relationshipError}
            </p>
          )}
          <TaskGraph
            key={layoutRequest}
            graph={graph}
            hideCompleted={hideCompleted}
            expandedTaskIds={expandedTaskIds}
            selectedTaskId={
              selection?.kind === "task" ? selection.taskId : undefined
            }
            selectedRelationshipId={selectedRelationshipId}
            onSelect={(taskId) => {
              setTaskUpdateError(undefined);
              setSelection({ kind: "task", taskId });
            }}
            onSelectRelationship={(relationship) =>
              setSelection({ kind: "relationship", relationship })
            }
            onClearSelection={clearSelection}
            onToggle={toggleTask}
            onCreateRequiredFor={(source, target) =>
              void submitRequiredFor(source, target)
            }
          />
        </section>
        <SelectionDetails
          graph={graph}
          selection={selection}
          isUpdatingTask={pendingTaskUpdate !== undefined}
          taskUpdateError={taskUpdateError}
          updatingTaskStatus={
            pendingTaskUpdate === "execution-type"
              ? undefined
              : pendingTaskUpdate
          }
          onCancelTask={(task) =>
            void changeTask(task.id, { status: "cancelled" }, "cancelled")
          }
          onChangeExecutionType={(task, executionType) =>
            void changeTask(task.id, { executionType }, "execution-type")
          }
          onDeleteRelationships={deletion.handleRequestRelationships}
          onDeleteTask={deletion.handleRequestTask}
          onMarkTaskDone={(task) =>
            void changeTask(task.id, { status: "completed" }, "completed")
          }
        />
      </div>
      {isCreateOpen ? (
        <CreateTaskDialog
          createdByOptions={createdByOptions}
          error={createError}
          isSubmitting={isCreating}
          onClose={() => setIsCreateOpen(false)}
          onCreate={(input) => void submitTask(input)}
        />
      ) : null}
      {deletion.confirmation === undefined ? null : (
        <DeleteConfirmationDialog
          confirmLabel={deletion.confirmation.confirmLabel}
          description={deletion.confirmation.description}
          error={deletion.error}
          isSubmitting={deletion.isSubmitting}
          title={deletion.confirmation.title}
          onCancel={deletion.handleCancel}
          onConfirm={() => void deletion.handleConfirm()}
        />
      )}
    </main>
  );
}

export default function App() {
  const [resource, setResource] = useState<GraphResource>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const loadGraph = async (): Promise<void> => {
      try {
        const graph = await loadTaskGraph(controller.signal);
        setResource({ kind: "ready", graph });
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setResource({ kind: "error", message: errorMessage(error) });
        }
      }
    };
    void loadGraph();
    return () => controller.abort();
  }, []);

  if (resource.kind === "loading") {
    return (
      <main className="state-page">
        <LoaderCircle
          className="animate-spin text-indigo-600"
          aria-hidden="true"
        />
        <p>Loading task graph…</p>
      </main>
    );
  }
  if (resource.kind === "error") {
    return (
      <main className="state-page text-rose-700" role="alert">
        <AlertCircle aria-hidden="true" />
        <div>
          <h1 className="font-semibold">Could not open the task graph</h1>
          <p className="mt-1 text-sm">{resource.message}</p>
        </div>
      </main>
    );
  }
  return <TaskWorkspace initialGraph={resource.graph} />;
}
