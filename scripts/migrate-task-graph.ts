import { resolve } from "node:path";

import { GraphStore } from "../server/graph-store.js";

const path = process.argv.at(2);
if (path === undefined) {
  throw new Error("Usage: npm run migrate:data -- PATH");
}

const resolvedPath = resolve(path);
const graph = await new GraphStore(resolvedPath).migrate();

// oxlint-disable-next-line no-console -- stdout is the CLI's user interface.
console.log(
  `Migrated ${graph.tasks.length} tasks and ${graph.relationships.length} relationships in ${resolvedPath}`,
);
