import { execFile } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";

import {
  buildGhArguments,
  parseImportArguments,
} from "../src/import/github-cli";
import { importGithubIssues } from "../src/import/github-import";
import { parseTaskGraph } from "../src/model/task-graph";
import type { TaskGraph } from "../src/model/task-graph";

const execFileAsync = promisify(execFile);

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

async function main(): Promise<void> {
  const { repository, outputPath } = parseImportArguments(
    process.argv.slice(2),
  );
  const { stdout } = await execFileAsync("gh", buildGhArguments(repository), {
    maxBuffer: 20 * 1024 * 1024,
  });
  const existing = await readExisting(outputPath);
  const graph = importGithubIssues({
    existing,
    repository,
    input: JSON.parse(stdout),
    importedAt: new Date().toISOString(),
  });
  await writeAtomically(outputPath, graph);
  // oxlint-disable-next-line no-console -- stdout is the CLI's user interface.
  console.log(
    `Imported ${graph.tasks.length} tasks and ${graph.relationships.length} relationships to ${outputPath}`,
  );
}

try {
  await main();
} catch (error: unknown) {
  // oxlint-disable-next-line no-console -- stderr reports actionable CLI failures.
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
