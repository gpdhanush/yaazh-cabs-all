import fs from "node:fs";
import path from "node:path";
import { prisma } from "../config/database.js";
import { loadEnv } from "../config/env.js";
import { resolveStoredFilePath } from "./driver-photo.service.js";

export function adminPhotoPublicPath(adminId: bigint | string): string {
  return `/api/v1/public/admins/${String(adminId)}/photo`;
}

function sniffImage(bytes: Buffer): { mime: string; ext: string } | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: ".jpg" };
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { mime: "image/png", ext: ".png" };
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return { mime: "image/gif", ext: ".gif" };
  }
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    return { mime: "image/webp", ext: ".webp" };
  }
  return null;
}

async function ensurePhotoTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS admin_profile_photos (
      admin_id BIGINT NOT NULL PRIMARY KEY,
      mime_type VARCHAR(64) NOT NULL,
      data_base64 LONGTEXT NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

export async function saveAdminPhotoBytes(
  adminId: bigint,
  bytes: Buffer,
  mimeHint?: string,
): Promise<{ mime: string; publicPath: string }> {
  const sniffed = sniffImage(bytes);
  if (!sniffed) {
    throw new Error("UNSUPPORTED_IMAGE");
  }
  const mime = sniffed.mime || (mimeHint?.startsWith("image/") ? mimeHint : "image/jpeg");
  await ensurePhotoTable();
  const b64 = bytes.toString("base64");
  await prisma.$executeRaw`
    INSERT INTO admin_profile_photos (admin_id, mime_type, data_base64, updated_at)
    VALUES (${adminId}, ${mime}, ${b64}, NOW())
    ON DUPLICATE KEY UPDATE mime_type = ${mime}, data_base64 = ${b64}, updated_at = NOW()
  `;

  const env = loadEnv();
  const dir = path.resolve(env.STORAGE_PATH, "public", "admins");
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${adminId}${sniffed.ext}`;
  await fs.promises.writeFile(path.join(dir, filename), bytes);

  return { mime, publicPath: adminPhotoPublicPath(adminId) };
}

export async function deleteAdminPhoto(adminId: bigint): Promise<void> {
  try {
    await ensurePhotoTable();
    await prisma.$executeRaw`DELETE FROM admin_profile_photos WHERE admin_id = ${adminId}`;
  } catch {
    /* table may not exist */
  }
}

export async function loadAdminPhotoBytes(
  adminId: bigint,
  storedUrl?: string | null,
): Promise<{ bytes: Buffer; mimeType: string } | null> {
  try {
    await ensurePhotoTable();
    const rows = await prisma.$queryRaw<Array<{ mime_type: string; data_base64: string }>>`
      SELECT mime_type, data_base64 FROM admin_profile_photos WHERE admin_id = ${adminId} LIMIT 1
    `;
    const row = rows[0];
    if (row?.data_base64) {
      const bytes = Buffer.from(row.data_base64, "base64");
      if (bytes.length > 0) return { bytes, mimeType: row.mime_type || "image/jpeg" };
    }
  } catch {
    /* table may not exist yet */
  }

  const filePath = resolveStoredFilePath(storedUrl ?? null);
  if (filePath && fs.existsSync(filePath)) {
    const bytes = await fs.promises.readFile(filePath);
    if (bytes.length > 0) {
      const sniffed = sniffImage(bytes);
      const mime = sniffed?.mime ?? "image/jpeg";
      void saveAdminPhotoBytes(adminId, bytes, mime).catch(() => undefined);
      return { bytes, mimeType: mime };
    }
  }

  return null;
}
