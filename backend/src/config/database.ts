import { PrismaClient } from "@prisma/client";
import { loadEnv } from "./env.js";

// Ensure DATABASE_URL is built from DB_* keys before Prisma boots.
const env = loadEnv();

function databaseUrlWithLimits(url: string): string {
  const databaseUrl = new URL(url);
  if (!databaseUrl.searchParams.has("connection_limit")) {
    databaseUrl.searchParams.set("connection_limit", String(env.DB_CONNECTION_LIMIT));
  }
  if (!databaseUrl.searchParams.has("pool_timeout")) {
    databaseUrl.searchParams.set("pool_timeout", String(env.DB_POOL_TIMEOUT));
  }
  if (!databaseUrl.searchParams.has("connect_timeout")) {
    databaseUrl.searchParams.set("connect_timeout", String(env.DB_CONNECT_TIMEOUT));
  }
  return databaseUrl.toString();
}

export const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrlWithLimits(env.DATABASE_URL) } },
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

export type PrismaTx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;
