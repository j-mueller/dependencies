import { isCompletedOrCancelled } from "../model/task-graph";
import type { TaskGraph } from "../model/task-graph";

export function filterTaskGraph(
  graph: TaskGraph,
  hideCompleted: boolean,
): TaskGraph {
  if (!hideCompleted) {
    return graph;
  }

  const tasks = graph.tasks.filter(
    ({ status }) => !isCompletedOrCancelled(status),
  );
  const taskIds = new Set(tasks.map(({ id }) => id));
  return {
    ...graph,
    tasks,
    relationships: graph.relationships.filter(
      ({ source, target }) => taskIds.has(source) && taskIds.has(target),
    ),
  };
}
