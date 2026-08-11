import { buildApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { prisma } from "./config/database.js";
import { ensureUtf8mb4 } from "./config/ensure-utf8mb4.js";
import { processOnce } from "./jobs/worker.js";

async function main() {
  const env = loadEnv();
  await ensureUtf8mb4();
  const app = await buildApp();

  const drainJobs = async () => {
    try {
      const n = await processOnce(25);
      if (n > 0) app.log.info({ n }, "Processed notification jobs");
    } catch (err) {
      app.log.warn({ err }, "Notification job drain failed");
    }
  };
  await drainJobs();
  const jobTimer = setInterval(() => void drainJobs(), 20_000);
  jobTimer.unref();

  const shutdown = async (signal: string) => {
    app.log.info(`Shutting down on ${signal}`);
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`${env.APP_NAME} listening on ${env.HOST}:${env.PORT}`);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
