import { resolve } from "node:path";

import { buildApp } from "./app.js";

function parsePort(value: string | undefined): number {
  const port = Number(value ?? "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return port;
}

const staticRoot =
  process.env["NODE_ENV"] === "development"
    ? undefined
    : resolve(process.env["STATIC_ROOT"] ?? "dist");
const app = await buildApp({
  dataPath: resolve(process.env["TASK_GRAPH_PATH"] ?? "public/tasks.json"),
  ...(staticRoot === undefined ? {} : { staticRoot }),
  logger: true,
});

const address = await app.listen({
  host: process.env["HOST"] ?? "127.0.0.1",
  port: parsePort(process.env["PORT"]),
});

app.log.info(`Task Atlas listening at ${address}`);
