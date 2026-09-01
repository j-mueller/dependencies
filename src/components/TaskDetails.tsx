import { ArrowUpRight, CircleUserRound, GitPullRequest } from "lucide-react";

import type { Task } from "../model/task-graph";

interface TaskDetailsProps {
  task: Task | undefined;
}

const statusLabels: Record<Task["status"], string> = {
  open: "Open",
  completed: "Completed",
  "not-planned": "Not planned",
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function TaskDetails({ task }: TaskDetailsProps) {
  if (task === undefined) {
    return (
      <aside className="details-panel details-panel--empty">
        <div>
          <p className="eyebrow">Inspector</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">
            Select a task
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Open a node to inspect its source, estimate, ownership, and pull
            requests.
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
          <dd className="detail-value capitalize">{task.executionType}</dd>
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

      {task.source.provider === "github" ? (
        <a className="primary-link mt-7" href={task.source.url}>
          Open on GitHub
          <ArrowUpRight aria-hidden="true" size={16} />
        </a>
      ) : null}
    </aside>
  );
}
