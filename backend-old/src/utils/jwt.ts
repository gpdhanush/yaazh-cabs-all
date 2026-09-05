import { createHmac, timingSafeEqual } from "node:crypto";
import { loadEnv } from "../config/env.js";

type JwtPayload = {
  sub: string;
  typ: "customer" | "driver" | "admin";
  role?: string;
  sid?: string;
  jti: string;
  iat: number;
  exp: number;
};

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromB64url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signJwt(
  payload: Omit<JwtPayload, "iat" | "exp" | "jti"> & { jti?: string },
  ttlSeconds: number,
): string {
  const env = loadEnv();
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const full: JwtPayload = {
    ...payload,
    jti: payload.jti ?? b64url(Buffer.from(String(now) + Math.random())),
    iat: now,
    exp: now + ttlSeconds,
  };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(full));
  const data = `${h}.${p}`;
  const sig = createHmac("sha256", env.JWT_SECRET).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

export function verifyJwt(token: string): JwtPayload {
  const env = loadEnv();
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token");
  const [h, p, s] = parts as [string, string, string];
  const data = `${h}.${p}`;
  const expected = createHmac("sha256", env.JWT_SECRET).update(data).digest();
  const actual = fromB64url(s);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error("Invalid token signature");
  }
  const payload = JSON.parse(fromB64url(p).toString("utf8")) as JwtPayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error("Token expired");
  return payload;
}

export type { JwtPayload };
