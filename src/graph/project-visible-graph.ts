import type {
  Relationship,
  RelationshipKind,
  Task,
  TaskGraph,
} from "../model/task-graph";

export interface ProjectedRelationship {
  id: string;
  kind: RelationshipKind;
  source: string;
  target: string;
  relationshipIds: string[];
  aggregatedCount: number;
}

export interface VisibleTaskGraph {
  tasks: Task[];
  relationships: ProjectedRelationship[];
  childrenByParent: ReadonlyMap<string, string[]>;
}

interface Hierarchy {
  parentByChild: ReadonlyMap<string, string>;
  childrenByParent: ReadonlyMap<string, string[]>;
}

function buildHierarchy(relationships: readonly Relationship[]): Hierarchy {
  const parentByChild = new Map<string, string>();
  const childrenByParent = new Map<string, string[]>();

  for (const relationship of relationships) {
    if (relationship.kind !== "subtask-of") {
      continue;
    }
    parentByChild.set(relationship.source, relationship.target);
    const children = childrenByParent.get(relationship.target) ?? [];
    children.push(relationship.source);
    childrenByParent.set(relationship.target, children);
  }

  return { childrenByParent, parentByChild };
}

function findVisibleTasks(
  graph: TaskGraph,
  expandedTaskIds: ReadonlySet<string>,
  hierarchy: Hierarchy,
): Set<string> {
  const visibleTaskIds = new Set<string>();
  const reveal = (taskId: string): void => {
    visibleTaskIds.add(taskId);
    if (!expandedTaskIds.has(taskId)) {
      return;
    }
    for (const childId of hierarchy.childrenByParent.get(taskId) ?? []) {
      reveal(childId);
    }
  };

  for (const task of graph.tasks) {
    if (!hierarchy.parentByChild.has(task.id)) {
      reveal(task.id);
    }
  }
  return visibleTaskIds;
}

function visibleRepresentative(
  taskId: string,
  visibleTaskIds: ReadonlySet<string>,
  parentByChild: ReadonlyMap<string, string>,
): string {
  let candidate = taskId;
  while (!visibleTaskIds.has(candidate)) {
    const parent = parentByChild.get(candidate);
    if (parent === undefined) {
      return taskId;
    }
    candidate = parent;
  }
  return candidate;
}

function projectRelationships(
  relationships: readonly Relationship[],
  visibleTaskIds: ReadonlySet<string>,
  parentByChild: ReadonlyMap<string, string>,
): ProjectedRelationship[] {
  const projectedByKey = new Map<string, ProjectedRelationship>();
  for (const relationship of relationships) {
    const source = visibleRepresentative(
      relationship.source,
      visibleTaskIds,
      parentByChild,
    );
    const target = visibleRepresentative(
      relationship.target,
      visibleTaskIds,
      parentByChild,
    );
    if (source === target) {
      continue;
    }

    const key = `${relationship.kind}:${source}->${target}`;
    const existing = projectedByKey.get(key);
    if (existing === undefined) {
      projectedByKey.set(key, {
        id: `projected:${key}`,
        kind: relationship.kind,
        source,
        target,
        relationshipIds: [relationship.id],
        aggregatedCount: 1,
      });
    } else {
      existing.relationshipIds.push(relationship.id);
      existing.aggregatedCount += 1;
    }
  }
  return [...projectedByKey.values()];
}

export function projectVisibleGraph(
  graph: TaskGraph,
  expandedTaskIds: ReadonlySet<string>,
): VisibleTaskGraph {
  const hierarchy = buildHierarchy(graph.relationships);
  const visibleTaskIds = findVisibleTasks(graph, expandedTaskIds, hierarchy);

  return {
    tasks: graph.tasks.filter(({ id }) => visibleTaskIds.has(id)),
    relationships: projectRelationships(
      graph.relationships,
      visibleTaskIds,
      hierarchy.parentByChild,
    ),
    childrenByParent: hierarchy.childrenByParent,
  };
}
