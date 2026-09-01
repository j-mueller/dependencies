import { z } from "zod";

const repositorySchema = z.string().regex(/^[^/]+\/[^/]+$/u);
const githubUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && url.hostname === "github.com";
});

const githubProjectSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1),
  url: githubUrlSchema,
});

const projectItemsSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  items: z.array(z.unknown()),
});

const projectItemSchema = z.object({
  content: z.unknown().optional(),
});

const issueContentSchema = z.object({
  type: z.literal("Issue"),
  number: z.number().int().positive(),
  repository: repositorySchema,
  url: githubUrlSchema,
});

export type GithubProject = z.infer<typeof githubProjectSchema>;

export interface ProjectIssueSelection {
  repository: string;
  issueNumbers: number[];
}

export function parseGithubProject(input: unknown): GithubProject {
  return githubProjectSchema.parse(input);
}

export function parseGithubProjectItems(
  input: unknown,
): ProjectIssueSelection[] {
  const { items } = projectItemsSchema.parse(input);
  const issueNumbersByRepository = new Map<string, Set<number>>();

  for (const inputItem of items) {
    const { content } = projectItemSchema.parse(inputItem);
    if (
      typeof content !== "object" ||
      content === null ||
      !("type" in content) ||
      content.type !== "Issue"
    ) {
      continue;
    }
    const issue = issueContentSchema.parse(content);
    const issueNumbers =
      issueNumbersByRepository.get(issue.repository) ?? new Set();
    issueNumbers.add(issue.number);
    issueNumbersByRepository.set(issue.repository, issueNumbers);
  }

  return [...issueNumbersByRepository]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([repository, issueNumbers]) => ({
      repository,
      issueNumbers: [...issueNumbers].toSorted((left, right) => left - right),
    }));
}
