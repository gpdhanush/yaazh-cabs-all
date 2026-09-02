import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
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
import { loadPublicInvoicePdf } from "./services/invoice.service.js";
import { loadPublicFile } from "./services/stored-media.service.js";

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
  await app.register(multipart, {
    limits: { fileSize: 8 * 1024 * 1024 },
  });

  const publicDir = path.resolve(env.STORAGE_PATH, "public");
  fs.mkdirSync(path.join(publicDir, "routes"), { recursive: true });
  fs.mkdirSync(path.join(publicDir, "documents"), { recursive: true });
  fs.mkdirSync(path.join(publicDir, "invoices"), { recursive: true });

  app.get("/storage/public/invoices/*", async (req, reply) => {
    const invoiceNumber = String((req.params as { "*": string })["*"] ?? "");
    const { invoice, pdfBuffer } = await loadPublicInvoicePdf(invoiceNumber);
    return reply
      .header("Cache-Control", "private, max-age=120")
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", `inline; filename="${invoice.invoice_number}.pdf"`)
      .header("Content-Length", String(pdfBuffer.length))
      .send(pdfBuffer);
  });

  app.get("/storage/public/*", async (req, reply) => {
    const rel = String((req.params as { "*": string })["*"] ?? "");
    const file = await loadPublicFile(rel);
    if (!file) {
      return reply.code(404).type("text/plain").send("Not found");
    }
    return reply
      .header("Cache-Control", "public, max-age=86400")
      .header("Content-Type", file.mimeType)
      .header("Content-Length", String(file.bytes.length))
      .send(file.bytes);
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

  app.get("/health", async (_req, reply) => {
    const env = loadEnv();
    const appUrl = (() => {
      try {
        return new URL(env.APP_URL);
      } catch {
        return null;
      }
    })();

    const databaseCheck = async () => {
      await prisma.$queryRaw`SELECT 1`;
      return {
        connected: true,
        host: env.DB_HOST,
        port: env.DB_PORT,
        database_name: env.DB_NAME,
        username: env.DB_USER,
        error: null as string | null,
      };
    };

    let dbStatus = {
      connected: false,
      host: env.DB_HOST,
      port: env.DB_PORT,
      database_name: env.DB_NAME,
      username: env.DB_USER,
      error: null as string | null,
    };

    try {
      dbStatus = await Promise.race([
        databaseCheck(),
        new Promise<{
          connected: false;
          host: string;
          port: number;
          database_name: string;
          username: string;
          error: string;
        }>((resolve) => {
          setTimeout(() => {
            resolve({
              connected: false,
              host: env.DB_HOST,
              port: env.DB_PORT,
              database_name: env.DB_NAME,
              username: env.DB_USER,
              error: "MySQL health check timed out after 2s",
            });
          }, 2000);
        }),
      ]);
    } catch (error) {
      dbStatus.error = error instanceof Error ? error.message : String(error);
    }

    const health = {
      status: dbStatus.connected ? "ok" : "degraded",
      app_name: env.APP_NAME,
      node_env: env.NODE_ENV,
      host: env.HOST,
      port: env.PORT,
      pid: process.pid,
      uptime_seconds: Math.round(process.uptime()),
      domain: appUrl?.hostname ?? env.APP_URL,
      app_url: env.APP_URL,
      public_web_url: env.PUBLIC_WEB_URL,
      api_prefix: env.API_PREFIX,
      database: dbStatus,
      runtime: {
        platform: process.platform,
        arch: process.arch,
        node_version: process.version,
      },
    };

    return ok(reply, health, dbStatus.connected ? "Healthy" : "Healthy but MySQL is unavailable");
  });

  app.get("/ready", async (_req, reply) => {
    let mysqlConnected = false;
    let mysqlError: string | null = null;

    try {
      await prisma.$queryRaw`SELECT 1`;
      mysqlConnected = true;
    } catch (error) {
      mysqlError = error instanceof Error ? error.message : String(error);
    }

    return ok(
      reply,
      {
        status: "ready",
        mysql: mysqlConnected,
        redis: false,
        database: {
          connected: mysqlConnected,
          host: env.DB_HOST,
          port: env.DB_PORT,
          database_name: env.DB_NAME,
          username: env.DB_USER,
          error: mysqlError,
        },
      },
      mysqlConnected ? "Ready" : "Database not ready",
      mysqlConnected ? 200 : 503,
    );
  });

  const prefix = `${env.API_PREFIX}/v1`;
  await app.register(publicRoutes, { prefix: `${prefix}/public` });
  await app.register(authRoutes, { prefix: `${prefix}/auth` });
  await app.register(customerRoutes, { prefix: `${prefix}/customer` });
  await app.register(driverRoutes, { prefix: `${prefix}/driver` });
  await app.register(adminRoutes, { prefix: `${prefix}/admin` });

  return app;
}
