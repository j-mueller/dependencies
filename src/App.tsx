import { AlertCircle, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";

import { GraphLegend, GraphToolbar } from "./components/GraphToolbar";
import { TaskDetails } from "./components/TaskDetails";
import { TaskGraph } from "./components/TaskGraph";
import { parseTaskGraph } from "./model/task-graph";
import type { TaskGraph as TaskGraphModel } from "./model/task-graph";

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
  const [fileError, setFileError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    const loadGraph = async (): Promise<void> => {
      try {
        const response = await fetch("/tasks.json", {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Could not load tasks.json (${response.status})`);
        }
        const graph = parseTaskGraph(await response.json());
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

  const loadFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.item(0);
    if (file === null || file === undefined) {
      return;
    }
    try {
      const graph = parseTaskGraph(JSON.parse(await file.text()));
      setResource({ kind: "ready", graph });
      setExpandedTaskIds(new Set());
      setSelectedTaskId(undefined);
      setFileError(undefined);
    } catch (error) {
      setFileError(`Choose a valid JSON task graph. ${errorMessage(error)}`);
    } finally {
      event.target.value = "";
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
        onFileChange={(event) => void loadFile(event)}
      />
      {fileError === undefined ? null : (
        <div className="file-error" role="alert">
          <AlertCircle aria-hidden="true" size={16} />
          {fileError}
        </div>
      )}
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
    </main>
  );
}
