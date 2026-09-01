import staticPlugin from "@fastify/static";
import Fastify from "fastify";
import { ZodError } from "zod";
import type { FastifyInstance } from "fastify";

import { GraphStore } from "./graph-store.js";

export interface AppOptions {
  dataPath: string;
  staticRoot?: string;
  logger?: boolean;
}

function errorStatus(error: unknown): number {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }
  return 500;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Request failed";
}

export async function buildApp({
  dataPath,
  staticRoot,
  logger = false,
}: AppOptions): Promise<FastifyInstance> {
  // oxlint-disable-next-line new-cap -- Fastify exposes a capitalized factory function.
  const app = Fastify({ bodyLimit: 64 * 1024, logger });
  const store = new GraphStore(dataPath);

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    const statusCode = errorStatus(error);
    if (statusCode >= 500) {
      return reply.code(500).send({ error: "Could not access task graph" });
    }
    return reply.code(statusCode).send({ error: errorMessage(error) });
  });

  app.get("/api/graph", (_request, reply) => {
    reply.header("cache-control", "no-store");
    return store.read();
  });

  app.post("/api/tasks", async (request, reply) => {
    try {
      const result = await store.createTask(request.body);
      return reply.code(201).send(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          error: "Invalid task",
          issues: error.issues.map(({ message, path }) => ({ message, path })),
        });
      }
      throw error;
    }
  });

  if (staticRoot !== undefined) {
    await app.register(staticPlugin, {
      root: staticRoot,
      wildcard: false,
    });
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api/")) {
        return reply.code(404).send({ error: "Not found" });
      }
      return reply.type("text/html").sendFile("index.html");
    });
  }

  return app;
}
