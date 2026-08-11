import fs from "node:fs";
import path from "node:path";
import { prisma } from "../config/database.js";
import { loadEnv } from "../config/env.js";

export function driverPhotoPublicPath(driverId: bigint | string): string {
  return `/api/v1/public/drivers/${String(driverId)}/photo`;
}

export function publicMediaPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value || value === "null") return null;
  try {
    const u = new URL(value);
    const local = ["localhost", "127.0.0.1", "10.0.2.2"].includes(u.hostname);
    if (local && u.pathname.startsWith("/storage/")) return `${u.pathname}${u.search}`;
    if (!local) return value;
  } catch {
    /* relative or malformed */
  }
  return value;
}

function storagePublicRoot(): string {
  return path.resolve(loadEnv().STORAGE_PATH, "public");
}

export function resolveStoredFilePath(raw: string | null | undefined): string | null {
  const value = publicMediaPath(raw);
  if (!value) return null;
  let pathname = value;
  try {
    pathname = new URL(value).pathname;
  } catch {
    /* already a path */
  }
  const marker = "/storage/public/";
  const idx = pathname.indexOf(marker);
  if (idx === -1) return null;
  const rel = pathname.slice(idx + marker.length);
  const root = storagePublicRoot();
  const full = path.resolve(root, rel);
  if (!full.startsWith(root)) return null;
  return full;
}

function mimeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

async function ensurePhotoTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS driver_profile_photos (
      driver_id BIGINT NOT NULL PRIMARY KEY,
      mime_type VARCHAR(64) NOT NULL,
      data_base64 LONGTEXT NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

export async function saveDriverPhotoBytes(
  driverId: bigint,
  bytes: Buffer,
  mimeType: string,
): Promise<void> {
  await ensurePhotoTable();
  const mime = mimeType && mimeType.startsWith("image/") ? mimeType : "image/jpeg";
  const b64 = bytes.toString("base64");
  await prisma.$executeRaw`
    INSERT INTO driver_profile_photos (driver_id, mime_type, data_base64, updated_at)
    VALUES (${driverId}, ${mime}, ${b64}, NOW())
    ON DUPLICATE KEY UPDATE mime_type = ${mime}, data_base64 = ${b64}, updated_at = NOW()
  `;
}

export async function saveDriverPhotoFromStoredUrl(
  driverId: bigint,
  raw: string | null | undefined,
): Promise<void> {
  const filePath = resolveStoredFilePath(raw);
  if (!filePath || !fs.existsSync(filePath)) return;
  const bytes = await fs.promises.readFile(filePath);
  if (bytes.length === 0) return;
  await saveDriverPhotoBytes(driverId, bytes, mimeFromPath(filePath));
}

export async function loadDriverPhotoBytes(
  driverId: bigint,
): Promise<{ bytes: Buffer; mimeType: string } | null> {
  const driver = await prisma.drivers.findUnique({
    where: { id: driverId },
    select: { profile_image_url: true },
  });
  if (!driver) return null;

  const doc = await prisma.driverDocuments.findFirst({
    where: { driver_id: driverId, document_type: "profile_photo" },
    orderBy: { created_at: "desc" },
    select: { file_url: true },
  });

  const candidates = [driver.profile_image_url, doc?.file_url];
  for (const raw of candidates) {
    const filePath = resolveStoredFilePath(raw);
    if (filePath && fs.existsSync(filePath)) {
      const bytes = await fs.promises.readFile(filePath);
      if (bytes.length > 0) {
        void saveDriverPhotoBytes(driverId, bytes, mimeFromPath(filePath));
        return { bytes, mimeType: mimeFromPath(filePath) };
      }
    }
  }

  try {
    await ensurePhotoTable();
    const rows = await prisma.$queryRaw<Array<{ mime_type: string; data_base64: string }>>`
      SELECT mime_type, data_base64 FROM driver_profile_photos WHERE driver_id = ${driverId} LIMIT 1
    `;
    const row = rows[0];
    if (row?.data_base64) {
      return { bytes: Buffer.from(row.data_base64, "base64"), mimeType: row.mime_type || "image/jpeg" };
    }
  } catch {
    /* table may not exist yet on a locked DB */
  }

  return null;
}
