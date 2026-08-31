import { z } from "zod";

const metadataSchema = z.record(z.string(), z.json());
const webUrlSchema = z.url().refine(
  (value) => {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  },
  { message: "URL must use HTTP or HTTPS" },
);

const githubSourceSchema = z.object({
  provider: z.literal("github"),
  repository: z.string().regex(/^[^/]+\/[^/]+$/u),
  issueNumber: z.number().int().positive(),
  url: webUrlSchema,
});

const actorSchema = z.object({
  login: z.string().min(1),
  url: webUrlSchema,
  avatarUrl: webUrlSchema.optional(),
});

const pullRequestSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1),
  url: webUrlSchema,
  status: z.enum(["open", "closed", "merged"]),
});

export const taskSchema = z.object({
  id: z.string().min(1),
  source: githubSourceSchema,
  title: z.string().min(1),
  description: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  status: z.enum(["open", "completed", "not-planned"]),
  createdBy: actorSchema,
  pullRequests: z.array(pullRequestSchema),
  duration: z.number().nonnegative(),
  executionType: z.enum(["internal", "external"]),
  metadata: metadataSchema,
});

export const relationshipSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["depends-on", "subtask-of"]),
  source: z.string().min(1),
  target: z.string().min(1),
  metadata: metadataSchema,
});

const baseTaskGraphSchema = z.object({
  schemaVersion: z.literal(1),
  project: z.object({
    name: z.string().min(1),
    sourceRepository: z
      .string()
      .regex(/^[^/]+\/[^/]+$/u)
      .optional(),
    importedAt: z.iso.datetime({ offset: true }).optional(),
  }),
  tasks: z.array(taskSchema),
  relationships: z.array(relationshipSchema),
});

export type Task = z.infer<typeof taskSchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
export type TaskGraph = z.infer<typeof baseTaskGraphSchema>;
export type RelationshipKind = Relationship["kind"];

function addDuplicateIssues(
  values: readonly { id: string }[],
  label: string,
  context: z.core.$RefinementCtx,
): void {
  const seen = new Set<string>();
  for (const [index, value] of values.entries()) {
    if (seen.has(value.id)) {
      context.addIssue({
        code: "custom",
        message: `Duplicate ${label} ID: ${value.id}`,
        path: [label === "task" ? "tasks" : "relationships", index, "id"],
        input: value.id,
      });
    }
    seen.add(value.id);
  }
}

function containsCycle(
  taskIds: readonly string[],
  relationships: readonly Relationship[],
  kind: RelationshipKind,
): boolean {
  const outgoing = new Map<string, string[]>();
  for (const relationship of relationships) {
    if (relationship.kind !== kind) {
      continue;
    }
    const targets = outgoing.get(relationship.source) ?? [];
    targets.push(relationship.target);
    outgoing.set(relationship.source, targets);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (taskId: string): boolean => {
    if (visiting.has(taskId)) {
      return true;
    }
    if (visited.has(taskId)) {
      return false;
    }
    visiting.add(taskId);
    const cyclic = (outgoing.get(taskId) ?? []).some((target) => visit(target));
    visiting.delete(taskId);
    visited.add(taskId);
    return cyclic;
  };

  return taskIds.some((taskId) => visit(taskId));
}

function validateGraph(graph: TaskGraph, context: z.core.$RefinementCtx): void {
  addDuplicateIssues(graph.tasks, "task", context);
  addDuplicateIssues(graph.relationships, "relationship", context);

  const taskIds = new Set(graph.tasks.map(({ id }) => id));
  const parentByChild = new Map<string, string>();
  for (const [index, relationship] of graph.relationships.entries()) {
    for (const endpoint of ["source", "target"] as const) {
      if (!taskIds.has(relationship[endpoint])) {
        context.addIssue({
          code: "custom",
          message: `Relationship ${relationship.id} has unknown ${endpoint}: ${relationship[endpoint]}`,
          path: ["relationships", index, endpoint],
          input: relationship[endpoint],
        });
      }
    }
    if (relationship.source === relationship.target) {
      context.addIssue({
        code: "custom",
        message: `Relationship ${relationship.id} cannot reference the same task twice`,
        path: ["relationships", index],
        input: relationship,
      });
    }
    if (relationship.kind === "subtask-of") {
      const existingParent = parentByChild.get(relationship.source);
      if (
        existingParent !== undefined &&
        existingParent !== relationship.target
      ) {
        context.addIssue({
          code: "custom",
          message: `Task ${relationship.source} has more than one parent`,
          path: ["relationships", index],
          input: relationship,
        });
      }
      parentByChild.set(relationship.source, relationship.target);
    }
  }

  for (const kind of ["depends-on", "subtask-of"] as const) {
    if (containsCycle([...taskIds], graph.relationships, kind)) {
      context.addIssue({
        code: "custom",
        message: `${kind} cycle detected`,
        path: ["relationships"],
        input: graph.relationships,
      });
    }
  }
}

export const taskGraphSchema = baseTaskGraphSchema.superRefine(validateGraph);

export function parseTaskGraph(input: unknown): TaskGraph {
  return taskGraphSchema.parse(input);
}
