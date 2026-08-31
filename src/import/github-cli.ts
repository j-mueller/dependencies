export interface ImportArguments {
  repository: string;
  outputPath: string;
}

const githubFields = [
  "author",
  "blockedBy",
  "blocking",
  "body",
  "closedByPullRequestsReferences",
  "createdAt",
  "number",
  "parent",
  "state",
  "stateReason",
  "subIssues",
  "title",
  "url",
].join(",");

export function parseImportArguments(
  commandArguments: readonly string[],
): ImportArguments {
  const [repository, outputPath = "public/tasks.json"] = commandArguments;
  if (
    commandArguments.length === 0 ||
    commandArguments.length > 2 ||
    repository === undefined ||
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository)
  ) {
    throw new Error(
      "Usage: npm run import:github -- OWNER/REPOSITORY [OUTPUT_PATH]",
    );
  }
  return { outputPath, repository };
}

export function buildGhArguments(repository: string): string[] {
  return [
    "issue",
    "list",
    "--repo",
    repository,
    "--state",
    "all",
    "--limit",
    "10000",
    "--json",
    githubFields,
  ];
}
