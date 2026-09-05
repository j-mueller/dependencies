import {
  ArrowUpRight,
  Ban,
  Check,
  CircleUserRound,
  GitPullRequest,
  ListPlus,
  Trash2,
} from "lucide-react";

import { executionTypeSchema } from "../model/task-graph";
import type { Task, TaskStatus } from "../model/task-graph";

interface TaskDetailsProps {
  task: Task | undefined;
  error: string | undefined;
  isUpdating: boolean;
  updatingStatus: TaskStatus | undefined;
  onCancel: () => void;
  onDelete: () => void;
  onExecutionTypeChange: (executionType: Task["executionType"]) => void;
  onMarkDone: () => void;
  onNewSubtask: () => void;
}

const statusLabels: Record<Task["status"], string> = {
  open: "Open",
  completed: "Completed",
  cancelled: "Cancelled",
  "not-planned": "Not planned",
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function TaskActions({
  task,
  error,
  isUpdating,
  updatingStatus,
  onCancel,
  onDelete,
  onMarkDone,
  onNewSubtask,
}: TaskDetailsProps & { task: Task }) {
  return (
    <>
      {task.source.provider === "github" ? (
        <a className="primary-link mt-7" href={task.source.url}>
          Open on GitHub
          <ArrowUpRight aria-hidden="true" size={16} />
        </a>
      ) : null}

      {error === undefined ? null : (
        <p
          className="mt-6 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          {error}
        </p>
      )}

      <button
        className="secondary-button mt-7 inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap"
        disabled={isUpdating}
        type="button"
        onClick={onNewSubtask}
      >
        <ListPlus aria-hidden="true" size={16} />
        New sub-task
      </button>

      {task.status === "completed" ? null : (
        <button
          className="primary-button mt-7"
          disabled={isUpdating}
          type="button"
          onClick={onMarkDone}
        >
          <Check aria-hidden="true" size={16} />
          {updatingStatus === "completed" ? "Marking done…" : "Mark done"}
        </button>
      )}

      {task.status === "cancelled" ? null : (
        <button
          className="secondary-button mt-7 inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap"
          disabled={isUpdating}
          type="button"
          onClick={onCancel}
        >
          <Ban aria-hidden="true" size={16} />
          {updatingStatus === "cancelled" ? "Cancelling…" : "Cancel task"}
        </button>
      )}

      <button className="danger-button mt-7" type="button" onClick={onDelete}>
        <Trash2 aria-hidden="true" size={16} />
        Delete task
      </button>
    </>
  );
}

export function TaskDetails({
  task,
  error,
  isUpdating,
  updatingStatus,
  onCancel,
  onDelete,
  onExecutionTypeChange,
  onMarkDone,
  onNewSubtask,
}: TaskDetailsProps) {
  if (task === undefined) {
    return (
      <aside className="details-panel details-panel--empty">
        <div>
          <p className="eyebrow">Inspector</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">
            Select a task or relationship
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Open a node or edge to inspect its project data.
          </p>
        </div>
      </aside>
    );
  }

  const metadataEntries = Object.entries(task.metadata);

  return (
    <aside className="details-panel" aria-label="Task details">
      <div className="flex items-center justify-between gap-4">
        <p className="eyebrow">
          {task.source.provider === "github"
            ? `Issue #${task.source.issueNumber}`
            : "Local task"}
        </p>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {statusLabels[task.status]}
        </span>
      </div>

      <h2 className="mt-4 text-2xl font-semibold leading-tight text-slate-950">
        {task.title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {task.description || "No description provided."}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-y border-slate-200 py-5 text-sm">
        <div>
          <dt className="detail-label">Duration</dt>
          <dd className="detail-value">
            {task.duration} {task.duration === 1 ? "day" : "days"}
          </dd>
        </div>
        <div>
          <dt className="detail-label">Execution</dt>
          <dd className="detail-value">
            <select
              aria-label="Execution"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-wait disabled:bg-slate-100"
              disabled={isUpdating}
              value={task.executionType}
              onChange={(event) =>
                onExecutionTypeChange(
                  executionTypeSchema.parse(event.target.value),
                )
              }
            >
              <option value="internal">Internal</option>
              <option value="external">External</option>
            </select>
          </dd>
        </div>
        <div>
          <dt className="detail-label">Created</dt>
          <dd className="detail-value">
            <time dateTime={task.createdAt}>
              {dateFormatter.format(new Date(task.createdAt))}
            </time>
          </dd>
        </div>
        <div>
          <dt className="detail-label">Created by</dt>
          <dd className="detail-value">
            {task.createdBy.url === undefined ? (
              <span className="inline-flex items-center gap-1">
                <CircleUserRound aria-hidden="true" size={14} />
                {task.createdBy.login}
              </span>
            ) : (
              <a
                className="inline-flex items-center gap-1 hover:text-indigo-700"
                href={task.createdBy.url}
              >
                <CircleUserRound aria-hidden="true" size={14} />
                {task.createdBy.login}
              </a>
            )}
          </dd>
        </div>
      </dl>

      <section className="mt-6">
        <h3 className="section-title">
          <GitPullRequest aria-hidden="true" size={16} />
          Closing pull requests
        </h3>
        {task.pullRequests.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No closing pull requests.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {task.pullRequests.map((pullRequest) => (
              <li key={pullRequest.url}>
                <a className="linked-card" href={pullRequest.url}>
                  <span>
                    #{pullRequest.number} {pullRequest.title}
                  </span>
                  <ArrowUpRight aria-hidden="true" size={15} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h3 className="section-title">Local metadata</h3>
        {metadataEntries.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No local metadata.</p>
        ) : (
          <dl className="mt-3 space-y-2">
            {metadataEntries.map(([key, value]) => (
              <div className="metadata-row" key={key}>
                <dt>{key}</dt>
                <dd>
                  {typeof value === "string" ? value : JSON.stringify(value)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <TaskActions
        error={error}
        isUpdating={isUpdating}
        task={task}
        updatingStatus={updatingStatus}
        onCancel={onCancel}
        onDelete={onDelete}
        onExecutionTypeChange={onExecutionTypeChange}
        onMarkDone={onMarkDone}
        onNewSubtask={onNewSubtask}
      />
    </aside>
  );
}
