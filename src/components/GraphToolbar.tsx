import { Network, Plus, RefreshCw } from "lucide-react";

interface GraphToolbarProps {
  projectName: string;
  taskCount: number;
  relationshipCount: number;
  onCreateTask: () => void;
  onRelayout: () => void;
}

export function GraphToolbar({
  projectName,
  taskCount,
  relationshipCount,
  onCreateTask,
  onRelayout,
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
        <div className="flex items-center gap-2">
          <button
            className="secondary-button inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap"
            type="button"
            onClick={onRelayout}
          >
            <RefreshCw aria-hidden="true" size={16} />
            Relayout
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={onCreateTask}
          >
            <Plus aria-hidden="true" size={16} />
            New task
          </button>
        </div>
      </div>
    </header>
  );
}

interface GraphLegendProps {
  hideCompleted: boolean;
  hiddenTaskCount: number;
  onHideCompletedChange: (hideCompleted: boolean) => void;
}

export function GraphLegend({
  hideCompleted,
  hiddenTaskCount,
  onHideCompletedChange,
}: GraphLegendProps) {
  return (
    <div className="legend" aria-label="Graph legend">
      <span className="legend-item">
        <span className="legend-line legend-line--required-for" />
        Is required for
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
      <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
        <input
          aria-label="Hide completed"
          checked={hideCompleted}
          className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          type="checkbox"
          onChange={(event) => onHideCompletedChange(event.target.checked)}
        />
        Hide completed
        <span className="text-slate-400">({hiddenTaskCount})</span>
      </label>
    </div>
  );
}
