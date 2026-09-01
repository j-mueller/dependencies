import { GitBranch, Trash2 } from "lucide-react";

import type { ProjectedRelationship } from "../graph/project-visible-graph";
import type { Relationship, TaskGraph } from "../model/task-graph";

interface RelationshipDetailsProps {
  graph: TaskGraph;
  relationship: ProjectedRelationship;
  onDelete: () => void;
}

const relationshipLabels: Record<Relationship["kind"], string> = {
  "is-required-for": "Is required for",
  "subtask-of": "Subtask of",
};

function taskTitle(graph: TaskGraph, taskId: string): string {
  return graph.tasks.find(({ id }) => id === taskId)?.title ?? taskId;
}

export function RelationshipDetails({
  graph,
  relationship,
  onDelete,
}: RelationshipDetailsProps) {
  const underlyingRelationships = relationship.relationshipIds.flatMap(
    (relationshipId) => {
      const match = graph.relationships.find(({ id }) => id === relationshipId);
      return match === undefined ? [] : [match];
    },
  );
  const count = underlyingRelationships.length;

  return (
    <aside className="details-panel" aria-label="Relationship details">
      <p className="eyebrow">
        {count} {count === 1 ? "relationship" : "relationships"}
      </p>
      <h2 className="mt-4 flex items-center gap-2 text-2xl font-semibold text-slate-950">
        <GitBranch aria-hidden="true" size={21} />
        {relationshipLabels[relationship.kind]}
      </h2>

      <dl className="mt-6 space-y-4 border-y border-slate-200 py-5 text-sm">
        <div>
          <dt className="detail-label">From</dt>
          <dd className="detail-value">
            {taskTitle(graph, relationship.source)}
          </dd>
        </div>
        <div>
          <dt className="detail-label">To</dt>
          <dd className="detail-value">
            {taskTitle(graph, relationship.target)}
          </dd>
        </div>
      </dl>

      <section className="mt-6">
        <h3 className="section-title">Local metadata</h3>
        {underlyingRelationships.map((underlying) => {
          const metadataEntries = Object.entries(underlying.metadata);
          return (
            <div className="mt-3" key={underlying.id}>
              {count > 1 ? (
                <p className="font-mono text-xs text-slate-500">
                  {taskTitle(graph, underlying.source)} →{" "}
                  {taskTitle(graph, underlying.target)}
                </p>
              ) : null}
              {metadataEntries.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  No local metadata.
                </p>
              ) : (
                <dl className="mt-2 space-y-2">
                  {metadataEntries.map(([key, value]) => (
                    <div className="metadata-row" key={key}>
                      <dt>{key}</dt>
                      <dd>
                        {typeof value === "string"
                          ? value
                          : JSON.stringify(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          );
        })}
      </section>

      <button className="danger-button mt-7" type="button" onClick={onDelete}>
        <Trash2 aria-hidden="true" size={16} />
        {count === 1 ? "Delete relationship" : `Delete ${count} relationships`}
      </button>
    </aside>
  );
}
