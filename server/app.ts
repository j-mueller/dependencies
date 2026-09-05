import staticPlugin from "@fastify/static";
import Fastify from "fastify";
import { ZodError } from "zod";
import type { FastifyInstance, FastifyReply } from "fastify";

import { updateTaskBodySchema } from "../src/model/task-graph.js";
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

function sendValidationError(
  reply: FastifyReply,
  label: string,
  error: ZodError,
) {
  return reply.code(400).send({
    error: label,
    issues: error.issues.map(({ message, path }) => ({ message, path })),
  });
}

function registerTaskUpdateRoute(
  app: FastifyInstance,
  store: GraphStore,
): void {
  app.patch<{ Params: { taskId: string } }>(
    "/api/tasks/:taskId",
    async (request, reply) => {
      try {
        const body = updateTaskBodySchema.parse(request.body);
        return await store.updateTask({
          id: request.params.taskId,
          ...body,
        });
      } catch (error) {
        if (error instanceof ZodError) {
          return sendValidationError(reply, "Invalid task update", error);
        }
        throw error;
      }
    },
  );
}

function registerSubtaskRoute(app: FastifyInstance, store: GraphStore): void {
  app.post<{ Params: { taskId: string } }>(
    "/api/tasks/:taskId/subtasks",
    async (request, reply) => {
      try {
        const result = await store.createSubtask({
          parentId: request.params.taskId,
          task: request.body,
        });
        return reply.code(201).send(result);
      } catch (error) {
        if (error instanceof ZodError) {
          return sendValidationError(reply, "Invalid subtask", error);
        }
        throw error;
      }
    },
  );
}

function registerApiRoutes(app: FastifyInstance, store: GraphStore): void {
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
        return sendValidationError(reply, "Invalid task", error);
      }
      throw error;
    }
  });

  app.post("/api/relationships/is-required-for", async (request, reply) => {
    try {
      const result = await store.createRequiredFor(request.body);
      return reply.code(201).send(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendValidationError(reply, "Invalid required-for link", error);
      }
      throw error;
    }
  });

  app.delete("/api/relationships", async (request, reply) => {
    try {
      return await store.deleteRelationships(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendValidationError(reply, "Invalid deletion", error);
      }
      throw error;
    }
  });

  app.delete<{ Params: { taskId: string } }>(
    "/api/tasks/:taskId",
    async (request, reply) => {
      try {
        return await store.deleteTask({ id: request.params.taskId });
      } catch (error) {
        if (error instanceof ZodError) {
          return sendValidationError(reply, "Invalid deletion", error);
        }
        throw error;
      }
    },
  );

  registerSubtaskRoute(app, store);
  registerTaskUpdateRoute(app, store);
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

  registerApiRoutes(app, store);

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
