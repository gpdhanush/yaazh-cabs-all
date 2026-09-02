import { buildApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { prisma } from "./config/database.js";
import { ensureUtf8mb4 } from "./config/ensure-utf8mb4.js";

async function main() {
  const env = loadEnv();
  if (env.dbAutoUtf8mb4) await ensureUtf8mb4();
  const app = await buildApp();

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
