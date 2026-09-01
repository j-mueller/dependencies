import { z } from "zod";

import { parseTaskGraph } from "../model/task-graph";
import type { Relationship, Task, TaskGraph } from "../model/task-graph";

export const issueReferenceSchema = z.object({
  number: z.number().int().positive(),
  url: z.url(),
});

export const githubIssueSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1),
  body: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  state: z.enum(["OPEN", "CLOSED"]),
  stateReason: z.enum(["COMPLETED", "NOT_PLANNED", "REOPENED"]).nullable(),
  url: z.url(),
  author: z
    .object({
      login: z.string().min(1),
      url: z.url(),
      avatarUrl: z.url().optional(),
    })
    .nullable(),
  blockedBy: z.array(issueReferenceSchema),
  blocking: z.array(issueReferenceSchema),
  parent: issueReferenceSchema.nullable(),
  subIssues: z.array(issueReferenceSchema),
  closedByPullRequestsReferences: z.array(
    z.object({
      number: z.number().int().positive(),
      title: z.string().min(1),
      url: z.url(),
      state: z.enum(["OPEN", "CLOSED", "MERGED"]),
    }),
  ),
});

const githubIssuesSchema = z.array(githubIssueSchema);

export type GithubIssue = z.infer<typeof githubIssueSchema>;
type IssueReference = z.infer<typeof issueReferenceSchema>;

export interface ImportGithubIssuesOptions {
  existing: TaskGraph | undefined;
  repository: string;
  input: unknown;
  importedAt: string;
}

export interface GithubIssueBatch {
  repository: string;
  input: unknown;
}

export interface UpsertGithubIssuesOptions {
  existing: TaskGraph | undefined;
  batches: readonly GithubIssueBatch[];
  importedAt: string;
  projectName: string;
  sourceRepository?: string;
}

interface ParsedIssueBatch {
  repository: string;
  issues: GithubIssue[];
}

function taskId(repository: string, issueNumber: number): string {
  return `github:${repository}#${issueNumber}`;
}

function referencedTaskId(reference: IssueReference): string {
  const url = new URL(reference.url);
  const [owner, repository] = url.pathname.split("/").filter(Boolean);
  if (owner === undefined || repository === undefined) {
    throw new Error(`Cannot identify repository from ${reference.url}`);
  }
  return taskId(`${owner}/${repository}`, reference.number);
}

function mapStatus(issue: GithubIssue): Task["status"] {
  if (issue.state === "OPEN") {
    return "open";
  }
  return issue.stateReason === "NOT_PLANNED" ? "not-planned" : "completed";
}

function mapPullRequestStatus(
  status: GithubIssue["closedByPullRequestsReferences"][number]["state"],
): Task["pullRequests"][number]["status"] {
  if (status === "OPEN") {
    return "open";
  }
  return status === "MERGED" ? "merged" : "closed";
}

function mapTask(
  issue: GithubIssue,
  repository: string,
  existingTask: Task | undefined,
): Task {
  const author = issue.author ?? {
    login: "ghost",
    url: "https://github.com/ghost",
  };
  return {
    id: taskId(repository, issue.number),
    source: {
      provider: "github",
      repository,
      issueNumber: issue.number,
      url: issue.url,
    },
    title: issue.title,
    description: issue.body ?? "",
    createdAt: issue.createdAt,
    status: mapStatus(issue),
    createdBy: author,
    pullRequests: issue.closedByPullRequestsReferences.map((pullRequest) => ({
      number: pullRequest.number,
      title: pullRequest.title,
      url: pullRequest.url,
      status: mapPullRequestStatus(pullRequest.state),
    })),
    duration: existingTask?.duration ?? 1,
    executionType: existingTask?.executionType ?? "internal",
    metadata: existingTask?.metadata ?? {},
  };
}

function relationshipId(
  kind: Relationship["kind"],
  source: string,
  target: string,
): string {
  return `${kind}:${source}->${target}`;
}

interface CollectRelationshipOptions {
  issues: readonly GithubIssue[];
  repository: string;
  taskIds: ReadonlySet<string>;
  existingById: ReadonlyMap<string, Relationship>;
}

function collectRelationships({
  issues,
  repository,
  taskIds,
  existingById,
}: CollectRelationshipOptions): Relationship[] {
  const relationships = new Map<string, Relationship>();
  const add = (
    kind: Relationship["kind"],
    source: string,
    target: string,
  ): void => {
    if (!taskIds.has(source) || !taskIds.has(target)) {
      return;
    }
    const id = relationshipId(kind, source, target);
    relationships.set(id, {
      id,
      kind,
      source,
      target,
      metadata: existingById.get(id)?.metadata ?? {},
    });
  };

  for (const issue of issues) {
    const issueId = taskId(repository, issue.number);
    for (const blockedBy of issue.blockedBy) {
      add("depends-on", issueId, referencedTaskId(blockedBy));
    }
    for (const blocking of issue.blocking) {
      add("depends-on", referencedTaskId(blocking), issueId);
    }
    if (issue.parent !== null) {
      add("subtask-of", issueId, referencedTaskId(issue.parent));
    }
    for (const subIssue of issue.subIssues) {
      add("subtask-of", referencedTaskId(subIssue), issueId);
    }
  }
  return [...relationships.values()];
}

export function importGithubIssues({
  existing,
  repository,
  input,
  importedAt,
}: ImportGithubIssuesOptions): TaskGraph {
  return upsertGithubIssues({
    existing,
    batches: [{ repository, input }],
    importedAt,
    projectName: repository,
    sourceRepository: repository,
  });
}

function upsertTasks(
  existingTasks: readonly Task[],
  batches: readonly ParsedIssueBatch[],
): Map<string, Task> {
  const tasksById = new Map(existingTasks.map((task) => [task.id, task]));
  for (const { issues, repository } of batches) {
    for (const issue of issues) {
      const id = taskId(repository, issue.number);
      tasksById.set(id, mapTask(issue, repository, tasksById.get(id)));
    }
  }
  return tasksById;
}

function upsertRelationships(
  existingRelationships: readonly Relationship[],
  batches: readonly ParsedIssueBatch[],
  taskIds: ReadonlySet<string>,
): Map<string, Relationship> {
  const relationshipsById = new Map(
    existingRelationships.map((relationship) => [
      relationship.id,
      relationship,
    ]),
  );
  for (const { issues, repository } of batches) {
    const importedRelationships = collectRelationships({
      issues,
      repository,
      taskIds,
      existingById: relationshipsById,
    });
    for (const relationship of importedRelationships) {
      relationshipsById.set(relationship.id, relationship);
    }
  }
  return relationshipsById;
}

export function upsertGithubIssues({
  existing,
  batches,
  importedAt,
  projectName,
  sourceRepository,
}: UpsertGithubIssuesOptions): TaskGraph {
  const parsedBatches: ParsedIssueBatch[] = batches.map(
    ({ repository, input }) => ({
      repository,
      issues: githubIssuesSchema.parse(input),
    }),
  );
  const tasksById = upsertTasks(existing?.tasks ?? [], parsedBatches);
  const relationshipsById = upsertRelationships(
    existing?.relationships ?? [],
    parsedBatches,
    new Set(tasksById.keys()),
  );

  const retainedSourceRepository =
    sourceRepository ?? existing?.project.sourceRepository;

  return parseTaskGraph({
    schemaVersion: 1,
    project: {
      name: existing?.project.name ?? projectName,
      ...(retainedSourceRepository === undefined
        ? {}
        : { sourceRepository: retainedSourceRepository }),
      importedAt,
    },
    tasks: [...tasksById.values()],
    relationships: [...relationshipsById.values()],
  });
}
