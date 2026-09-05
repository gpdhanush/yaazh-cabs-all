import { createHash, randomBytes, randomUUID } from "node:crypto";
import argon2 from "argon2";

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export function randomToken(bytes = 48): string {
  return randomBytes(bytes).toString("base64url");
}

export function newRequestId(): string {
  return `req_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export function bookingReference(prefix = "CAB", date = new Date(), seq: number): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${prefix}${y}${m}${d}${String(seq).padStart(4, "0")}`;
}
