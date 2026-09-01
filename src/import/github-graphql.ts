import { z } from "zod";

import { githubIssueSchema, issueReferenceSchema } from "./github-import";
import type { GithubIssue } from "./github-import";

const issueNumberListSchema = z.array(
  z.object({ number: z.number().int().positive() }),
);

function connectionSchema<Schema extends z.ZodType>(nodeSchema: Schema) {
  return z
    .object({
      nodes: z.array(nodeSchema),
      totalCount: z.number().int().nonnegative(),
    })
    .refine(({ nodes, totalCount }) => totalCount <= nodes.length, {
      message: "GitHub relationship connection was truncated",
    });
}

const graphqlIssueSchema = githubIssueSchema.extend({
  blockedBy: connectionSchema(issueReferenceSchema),
  blocking: connectionSchema(issueReferenceSchema),
  subIssues: connectionSchema(issueReferenceSchema),
  closedByPullRequestsReferences: connectionSchema(
    githubIssueSchema.shape.closedByPullRequestsReferences.element,
  ),
});

const issueQuerySchema = z.object({
  data: z.object({
    repository: z.record(z.string(), graphqlIssueSchema.nullable()),
  }),
});

function repositoryParts(repository: string): [string, string] {
  const [owner, name, extra] = repository.split("/");
  if (owner === undefined || name === undefined || extra !== undefined) {
    throw new Error(`Invalid GitHub repository: ${repository}`);
  }
  return [owner, name];
}

const issueFields = `
  number title body createdAt state stateReason url
  author { login url avatarUrl }
  blockedBy(first: 100) { totalCount nodes { number url } }
  blocking(first: 100) { totalCount nodes { number url } }
  parent { number url }
  subIssues(first: 100) { totalCount nodes { number url } }
  closedByPullRequestsReferences(first: 100) {
    totalCount nodes { number title url state }
  }
`;

export function buildIssueQueryArguments(
  repository: string,
  issueNumbers: readonly number[],
): string[] {
  const [owner, name] = repositoryParts(repository);
  if (
    issueNumbers.length === 0 ||
    issueNumbers.some((number) => !Number.isSafeInteger(number) || number <= 0)
  ) {
    throw new Error("Issue query requires positive issue numbers");
  }
  const selections = issueNumbers
    .map(
      (number) =>
        `issue_${number}: issue(number: ${number}) { ${issueFields} }`,
    )
    .join("\n");
  const query = `query($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) { ${selections} }
  }`;
  return [
    "api",
    "graphql",
    "-F",
    `owner=${owner}`,
    "-F",
    `name=${name}`,
    "-f",
    `query=${query}`,
  ];
}

export function parseGithubIssueNumbers(input: unknown): number[] {
  return issueNumberListSchema
    .parse(input)
    .map(({ number }) => number)
    .toSorted((left, right) => left - right);
}

export function parseGithubIssueQuery(input: unknown): GithubIssue[] {
  const { repository } = issueQuerySchema.parse(input).data;
  return Object.values(repository)
    .filter((issue) => issue !== null)
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      body: issue.body,
      createdAt: issue.createdAt,
      state: issue.state,
      stateReason: issue.stateReason,
      url: issue.url,
      author: issue.author,
      blockedBy: issue.blockedBy.nodes,
      blocking: issue.blocking.nodes,
      parent: issue.parent,
      subIssues: issue.subIssues.nodes,
      closedByPullRequestsReferences:
        issue.closedByPullRequestsReferences.nodes,
    }));
}
