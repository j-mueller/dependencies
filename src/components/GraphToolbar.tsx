import { Network, Plus } from "lucide-react";

interface GraphToolbarProps {
  projectName: string;
  taskCount: number;
  relationshipCount: number;
  onCreateTask: () => void;
}

export function GraphToolbar({
  projectName,
  taskCount,
  relationshipCount,
  onCreateTask,
}: GraphToolbarProps) {
  return (
    <header className="toolbar">
      <div className="flex min-w-0 items-center gap-3">
        <span className="logo-mark">
          <Network aria-hidden="true" size={20} />
        </span>
        <div className="min-w-0">
          <p className="eyebrow">Task Atlas</p>
          <h1 className="truncate text-lg font-semibold text-slate-950">
            {projectName}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden items-center gap-4 text-xs text-slate-500 sm:flex">
          <span>
            <strong className="text-slate-800">{taskCount}</strong> tasks
          </span>
          <span>
            <strong className="text-slate-800">{relationshipCount}</strong>{" "}
            links
          </span>
        </div>
        <button className="primary-button" type="button" onClick={onCreateTask}>
          <Plus aria-hidden="true" size={16} />
          New task
        </button>
      </div>
    </header>
  );
}

export function GraphLegend() {
  return (
    <div className="legend" aria-label="Graph legend">
      <span className="legend-item">
        <span className="legend-line legend-line--dependency" />
        Depends on
      </span>
      <span className="legend-item">
        <span className="legend-line legend-line--subtask" />
        Subtask of
      </span>
      <span className="legend-item">
        <span className="legend-dot legend-dot--internal" />
        Internal
      </span>
      <span className="legend-item">
        <span className="legend-dot legend-dot--external" />
        External
      </span>
    </div>
  );
}
