import { prisma } from "../src/config/database.js";

let querySucceeded = false;
try {
  const result = await prisma.$queryRaw`SELECT 1`;
  console.log("Prisma connectivity test passed: SELECT 1 returned", result);
  querySucceeded = true;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const sanitized = message.replace(/mysql:\/\/[^@\s]+@/gi, "mysql://***@");
  console.error("Prisma connectivity test failed:", sanitized);
  process.exitCode = 1;
} finally {
  if (querySucceeded) await prisma.$disconnect();
}