import { ChevronDown, ChevronRight, Clock3, GitBranch } from "lucide-react";
import { Handle, Position } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";

import type { Task } from "../model/task-graph";

export interface TaskNodeData extends Record<string, unknown> {
  task: Task;
  hasChildren: boolean;
  expanded: boolean;
  selected: boolean;
  onSelect: (taskId: string) => void;
  onToggle: (taskId: string) => void;
}

export type TaskFlowNode = Node<TaskNodeData, "task">;

const statusStyles: Record<Task["status"], string> = {
  open: "bg-sky-100 text-sky-800",
  completed: "bg-emerald-100 text-emerald-800",
  "not-planned": "bg-slate-200 text-slate-600",
};

const statusLabels: Record<Task["status"], string> = {
  open: "Open",
  completed: "Completed",
  "not-planned": "Not planned",
};

export function TaskNode({ data }: NodeProps<TaskFlowNode>) {
  const { task } = data;
  const sourceLabel =
    task.source.provider === "github"
      ? `${task.source.repository} #${task.source.issueNumber}`
      : "Local task";

  return (
    <article
      className={`task-node ${data.selected ? "task-node--selected" : ""}`}
      data-execution-type={task.executionType}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[0.68rem] tracking-[0.16em] text-slate-500 uppercase">
          {sourceLabel}
        </span>
        <span
          className={`rounded-full px-2 py-1 text-[0.65rem] font-semibold tracking-wide uppercase ${statusStyles[task.status]}`}
        >
          {statusLabels[task.status]}
        </span>
      </div>

      <button
        type="button"
        className="nodrag nopan mt-3 w-full text-left text-base font-semibold leading-snug text-slate-950 outline-none hover:text-indigo-700 focus-visible:rounded focus-visible:ring-2 focus-visible:ring-indigo-500"
        aria-label={`Select ${task.title}`}
        onClick={() => data.onSelect(task.id)}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {task.title}
      </button>

      <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <Clock3 aria-hidden="true" size={14} />
          {task.duration}d
        </span>
        <span className="flex items-center gap-1.5 capitalize">
          <GitBranch aria-hidden="true" size={14} />
          {task.executionType}
        </span>
        {data.hasChildren ? (
          <button
            type="button"
            className="nodrag nopan flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700 hover:bg-indigo-100 hover:text-indigo-800 focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label={`${data.expanded ? "Collapse" : "Expand"} ${task.title}`}
            onClick={() => data.onToggle(task.id)}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {data.expanded ? (
              <ChevronDown aria-hidden="true" size={14} />
            ) : (
              <ChevronRight aria-hidden="true" size={14} />
            )}
            {data.expanded ? "Hide" : "Open"}
          </button>
        ) : null}
      </div>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </article>
  );
}
