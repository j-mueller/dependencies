import { execFile } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";

import {
  buildGhArguments,
  buildProjectItemArguments,
  buildProjectViewArguments,
  parseImportArguments,
} from "../src/import/github-cli";
import type { ImportTarget } from "../src/import/github-cli";
import {
  importGithubIssues,
  upsertGithubIssues,
} from "../src/import/github-import";
import type { GithubIssueBatch } from "../src/import/github-import";
import {
  buildIssueQueryArguments,
  parseGithubIssueNumbers,
  parseGithubIssueQuery,
} from "../src/import/github-graphql";
import {
  parseGithubProject,
  parseGithubProjectItems,
} from "../src/import/github-project";
import { parseTaskGraph } from "../src/model/task-graph";
import type { TaskGraph } from "../src/model/task-graph";

const execFileAsync = promisify(execFile);
const issueQueryBatchSize = 40;

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function readExisting(path: string): Promise<TaskGraph | undefined> {
  try {
    return parseTaskGraph(JSON.parse(await readFile(path, "utf8")));
  } catch (error) {
    if (isMissingFile(error)) {
      return undefined;
    }
    throw error;
  }
}

async function writeAtomically(path: string, graph: TaskGraph): Promise<void> {
  const temporaryPath = `${path}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    temporaryPath,
    `${JSON.stringify(graph, undefined, 2)}\n`,
    "utf8",
  );
  await rename(temporaryPath, path);
}

async function runGh(arguments_: readonly string[]): Promise<unknown> {
  const { stdout } = await execFileAsync("gh", arguments_, {
    maxBuffer: 20 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

async function fetchIssueBatch(
  repository: string,
  issueNumbers?: ReadonlySet<number>,
): Promise<GithubIssueBatch> {
  const numbers =
    issueNumbers === undefined
      ? parseGithubIssueNumbers(await runGh(buildGhArguments(repository)))
      : [...issueNumbers].toSorted((left, right) => left - right);
  const queryBatches: number[][] = [];
  for (let index = 0; index < numbers.length; index += issueQueryBatchSize) {
    queryBatches.push(numbers.slice(index, index + issueQueryBatchSize));
  }
  const responses = await Promise.all(
    queryBatches.map(async (batch) =>
      parseGithubIssueQuery(
        await runGh(buildIssueQueryArguments(repository, batch)),
      ),
    ),
  );
  return {
    repository,
    input: responses.flat(),
  };
}

async function importTarget(
  target: ImportTarget,
  existing: TaskGraph | undefined,
  importedAt: string,
): Promise<TaskGraph> {
  if (target.kind === "repository") {
    const batch = await fetchIssueBatch(target.repository);
    return importGithubIssues({
      existing,
      repository: batch.repository,
      input: batch.input,
      importedAt,
    });
  }

  const [projectInput, itemsInput] = await Promise.all([
    runGh(buildProjectViewArguments(target)),
    runGh(buildProjectItemArguments(target)),
  ]);
  const project = parseGithubProject(projectInput);
  const selections = parseGithubProjectItems(itemsInput);
  const batches = await Promise.all(
    selections.map(({ repository, issueNumbers }) =>
      fetchIssueBatch(repository, new Set(issueNumbers)),
    ),
  );
  return upsertGithubIssues({
    existing,
    batches,
    importedAt,
    projectName: project.title,
  });
}

async function main(): Promise<void> {
  const { target, outputPath } = parseImportArguments(process.argv.slice(2));
  const existing = await readExisting(outputPath);
  const graph = await importTarget(target, existing, new Date().toISOString());
  await writeAtomically(outputPath, graph);
  // oxlint-disable-next-line no-console -- stdout is the CLI's user interface.
  console.log(
    `Graph now contains ${graph.tasks.length} tasks and ${graph.relationships.length} relationships in ${outputPath}`,
  );
}

try {
  await main();
} catch (error: unknown) {
  // oxlint-disable-next-line no-console -- stderr reports actionable CLI failures.
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
