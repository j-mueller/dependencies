import { AlertCircle, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createTask, loadTaskGraph } from "./api/task-api";
import { CreateTaskDialog } from "./components/CreateTaskDialog";
import { GraphLegend, GraphToolbar } from "./components/GraphToolbar";
import { TaskDetails } from "./components/TaskDetails";
import { TaskGraph } from "./components/TaskGraph";
import type {
  CreateTaskInput,
  TaskGraph as TaskGraphModel,
} from "./model/task-graph";

type GraphResource =
  | { kind: "loading" }
  | { kind: "ready"; graph: TaskGraphModel }
  | { kind: "error"; message: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function App() {
  const [resource, setResource] = useState<GraphResource>({ kind: "loading" });
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string>();

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

  const toggleTask = useCallback((taskId: string) => {
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

  const selectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  const selectedTask = useMemo(() => {
    if (resource.kind !== "ready") {
      return undefined;
    }
    return resource.graph.tasks.find(({ id }) => id === selectedTaskId);
  }, [resource, selectedTaskId]);

  const submitTask = useCallback(async (input: CreateTaskInput) => {
    setIsCreating(true);
    setCreateError(undefined);
    try {
      const { graph, task } = await createTask(input);
      setResource({ kind: "ready", graph });
      setSelectedTaskId(task.id);
      setIsCreateOpen(false);
    } catch (error: unknown) {
      setCreateError(errorMessage(error));
    } finally {
      setIsCreating(false);
    }
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

  return (
    <main className="app-shell">
      <GraphToolbar
        projectName={resource.graph.project.name}
        taskCount={resource.graph.tasks.length}
        relationshipCount={resource.graph.relationships.length}
        onCreateTask={() => {
          setCreateError(undefined);
          setIsCreateOpen(true);
        }}
      />
      <div className="workspace">
        <section className="graph-panel">
          <GraphLegend />
          <TaskGraph
            graph={resource.graph}
            expandedTaskIds={expandedTaskIds}
            selectedTaskId={selectedTaskId}
            onSelect={selectTask}
            onToggle={toggleTask}
          />
        </section>
        <TaskDetails task={selectedTask} />
      </div>
      {isCreateOpen ? (
        <CreateTaskDialog
          error={createError}
          isSubmitting={isCreating}
          onClose={() => setIsCreateOpen(false)}
          onCreate={(input) => void submitTask(input)}
        />
      ) : null}
    </main>
  );
}
