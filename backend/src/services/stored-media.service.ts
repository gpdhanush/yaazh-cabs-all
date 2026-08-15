import fs from "node:fs";
import path from "node:path";
import { prisma } from "../config/database.js";
import { loadEnv } from "../config/env.js";
import { sniffImage } from "./driver-photo.service.js";

export function storagePublicRoot(): string {
  return path.resolve(loadEnv().STORAGE_PATH, "public");
}

export function publicMediaApiPath(rel: string): string {
  const clean = rel.replace(/^\/+/, "");
  return `/api/v1/public/media/${clean}`;
}

function mediaKeyFromRel(rel: string): string {
  return `/storage/public/${rel.replace(/^\/+/, "")}`;
}

export function relativeStoragePath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  let pathname = value;
  try {
    pathname = new URL(value).pathname;
  } catch {
    pathname = value.split("?")[0] ?? value;
  }
  const marker = "/storage/public/";
  const idx = pathname.indexOf(marker);
  if (idx === -1) return null;
  const rel = pathname.slice(idx + marker.length).replace(/^\/+/, "");
  if (!rel || rel.startsWith("invoices/")) return null;
  if (rel.includes("..")) return null;
  return rel;
}

function resolveOnDisk(rel: string): string | null {
  const root = storagePublicRoot();
  const full = path.resolve(root, rel);
  if (!full.startsWith(root)) return null;
  return full;
}

async function ensureMediaTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS stored_media (
      path VARCHAR(500) NOT NULL PRIMARY KEY,
      mime_type VARCHAR(64) NOT NULL,
      data_base64 LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

export async function persistPublicFile(relOrUrl: string, bytes: Buffer, mimeType?: string): Promise<void> {
  const rel = relativeStoragePath(relOrUrl.startsWith("/") ? relOrUrl : `/storage/public/${relOrUrl}`)
    ?? relOrUrl.replace(/^\/+/, "");
  if (!rel || rel.startsWith("invoices/") || bytes.length === 0) return;
  const sniffed = sniffImage(bytes);
  const mime = sniffed?.mime ?? mimeType ?? "application/octet-stream";
  const key = mediaKeyFromRel(rel);
  const b64 = bytes.toString("base64");
  try {
    await ensureMediaTable();
    await prisma.$executeRaw`
      INSERT INTO stored_media (path, mime_type, data_base64, updated_at)
      VALUES (${key}, ${mime}, ${b64}, NOW())
      ON DUPLICATE KEY UPDATE mime_type = ${mime}, data_base64 = ${b64}, updated_at = NOW()
    `;
  } catch {
    /* table may not exist yet on a locked DB */
  }
}

export async function loadPublicFile(rel: string): Promise<{ bytes: Buffer; mimeType: string } | null> {
  const safe = rel.replace(/^\/+/, "");
  if (!safe || safe.startsWith("invoices/") || safe.includes("..")) return null;

  const disk = resolveOnDisk(safe);
  if (disk && fs.existsSync(disk)) {
    const bytes = await fs.promises.readFile(disk);
    if (bytes.length > 0) {
      const sniffed = sniffImage(bytes);
      return { bytes, mimeType: sniffed?.mime ?? mimeFromName(safe) };
    }
  }

  try {
    await ensureMediaTable();
    const key = mediaKeyFromRel(safe);
    const rows = await prisma.$queryRaw<Array<{ mime_type: string; data_base64: string }>>`
      SELECT mime_type, data_base64 FROM stored_media WHERE path = ${key} LIMIT 1
    `;
    const row = rows[0];
    if (!row?.data_base64) return null;
    const bytes = Buffer.from(row.data_base64, "base64");
    if (bytes.length === 0) return null;
    if (disk) {
      fs.mkdirSync(path.dirname(disk), { recursive: true });
      await fs.promises.writeFile(disk, bytes);
    }
    const sniffed = sniffImage(bytes);
    return { bytes, mimeType: sniffed?.mime ?? row.mime_type ?? mimeFromName(safe) };
  } catch {
    return null;
  }
}

function mimeFromName(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".pdf") return "application/pdf";
  return "image/jpeg";
}
