import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import path from "node:path";
import fs from "node:fs";
import { loadEnv } from "./config/env.js";
import { prisma } from "./config/database.js";
import { requestContextPlugin } from "./plugins/request-context.js";
import { authRoutes } from "./api/v1/auth/index.js";
import { publicRoutes } from "./api/v1/public/index.js";
import { customerRoutes } from "./api/v1/customer/index.js";
import { driverRoutes } from "./api/v1/driver/index.js";
import { adminRoutes } from "./api/v1/admin/index.js";
import { ok } from "./utils/api-response.js";

export async function buildApp() {
  const env = loadEnv();
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
    trustProxy: true,
  });

  await app.register(requestContextPlugin);
  await app.register(helmet, {
    global: true,
    // Allow the website (different origin) to read API responses in the browser.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });
  await app.register(cors, {
    origin: env.corsOrigins.length ? env.corsOrigins : true,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "Idempotency-Key"],
  });
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
  });
  await app.register(multipart, {
    limits: { fileSize: 8 * 1024 * 1024 },
  });

  const publicDir = path.resolve(env.STORAGE_PATH, "public");
  fs.mkdirSync(path.join(publicDir, "routes"), { recursive: true });
  fs.mkdirSync(path.join(publicDir, "documents"), { recursive: true });
  fs.mkdirSync(path.join(publicDir, "invoices"), { recursive: true });
  await app.register(fastifyStatic, {
    root: publicDir,
    prefix: "/storage/public/",
    decorateReply: false,
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: env.APP_NAME,
        version: "1.0.0",
        description: "Yaazh Cab Booking REST API v1 (cPanel / MySQL)",
      },
      servers: [{ url: env.APP_URL }],
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.get("/health", async (_req, reply) => ok(reply, { status: "ok" }, "Healthy"));
  app.get("/ready", async (_req, reply) => {
    await prisma.$queryRaw`SELECT 1`;
    return ok(reply, { status: "ready", mysql: true, redis: false }, "Ready");
  });

  const prefix = `${env.API_PREFIX}/v1`;
  await app.register(publicRoutes, { prefix: `${prefix}/public` });
  await app.register(authRoutes, { prefix: `${prefix}/auth` });
  await app.register(customerRoutes, { prefix: `${prefix}/customer` });
  await app.register(driverRoutes, { prefix: `${prefix}/driver` });
  await app.register(adminRoutes, { prefix: `${prefix}/admin` });

  return app;
}
