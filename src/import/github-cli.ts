export interface RepositoryTarget {
  kind: "repository";
  repository: string;
}

export interface ProjectTarget {
  kind: "project";
  owner: string;
  number: number;
}

export type ImportTarget = RepositoryTarget | ProjectTarget;

export interface ImportArguments {
  target: ImportTarget;
  outputPath: string;
}

const usage =
  "Usage: npm run import:github -- OWNER/REPOSITORY [OUTPUT_PATH]\n" +
  "   or: npm run import:github -- --project OWNER/NUMBER [OUTPUT_PATH]";

export function parseImportArguments(
  commandArguments: readonly string[],
): ImportArguments {
  if (commandArguments[0] === "--project") {
    return parseProjectArguments(commandArguments);
  }

  const [repository, outputPath = "public/tasks.json"] = commandArguments;
  if (
    commandArguments.length === 0 ||
    commandArguments.length > 2 ||
    repository === undefined ||
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository)
  ) {
    throw new Error(usage);
  }
  return {
    outputPath,
    target: { kind: "repository", repository },
  };
}

function parseProjectArguments(
  commandArguments: readonly string[],
): ImportArguments {
  const [, project, outputPath = "public/tasks.json"] = commandArguments;
  const match = /^(?<owner>[A-Za-z0-9_.-]+)\/(?<number>[1-9]\d*)$/u.exec(
    project ?? "",
  );
  const owner = match?.groups?.["owner"];
  const number = match?.groups?.["number"];
  if (
    commandArguments.length > 3 ||
    owner === undefined ||
    number === undefined
  ) {
    throw new Error(usage);
  }
  return {
    target: { kind: "project", owner, number: Number(number) },
    outputPath,
  };
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
    "number",
  ];
}

export function buildProjectViewArguments(target: ProjectTarget): string[] {
  return [
    "project",
    "view",
    String(target.number),
    "--owner",
    target.owner,
    "--format",
    "json",
  ];
}

export function buildProjectItemArguments(target: ProjectTarget): string[] {
  return [
    "project",
    "item-list",
    String(target.number),
    "--owner",
    target.owner,
    "--limit",
    "10000",
    "--format",
    "json",
  ];
}
