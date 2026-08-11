import { PrismaClient } from "@prisma/client";
import { loadEnv } from "./env.js";

// Ensure DATABASE_URL is built from DB_* keys before Prisma boots.
loadEnv();

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

export type PrismaTx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;
