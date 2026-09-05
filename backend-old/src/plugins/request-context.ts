import type { FastifyPluginAsync } from "fastify";
import { newRequestId } from "../utils/crypto.js";
import { AppError } from "../errors/app-error.js";
import { fail } from "../utils/api-response.js";

declare module "fastify" {
  interface FastifyRequest {
    requestId: string;
  }
}

export const requestContextPlugin: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (req) => {
    req.requestId = (req.headers["x-request-id"] as string | undefined) || newRequestId();
    const method = req.method.toUpperCase();
    const length = req.headers["content-length"];
    if (
      (method === "DELETE" || method === "GET") &&
      (!length || length === "0") &&
      String(req.headers["content-type"] ?? "").includes("application/json")
    ) {
      delete req.headers["content-type"];
    }
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) {
      return fail(reply, err.statusCode, err.message, err.errors, err.code);
    }

    if (err && typeof err === "object" && "validation" in err) {
      return fail(reply, 400, "Validation failed.", {
        details: (err as { validation?: unknown }).validation ?? null,
      });
    }

    req.log.error({ err, request_id: req.requestId }, "Unhandled error");
    const message =
      process.env.NODE_ENV === "production" ? "Internal server error." : (err as Error).message;
    return fail(reply, 500, message);
  });
};
