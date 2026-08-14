import fs from "node:fs";
import path from "node:path";
import { prisma } from "../config/database.js";
import { loadEnv } from "../config/env.js";
import { prepareStoredImage } from "../utils/jpeg-jfif.js";
import { resolveStoredFilePath, sniffImage } from "./driver-photo.service.js";

export function adminPhotoPublicPath(adminId: bigint | string): string {
  return `/api/v1/public/admins/${String(adminId)}/photo`;
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
  const prepared = prepareStoredImage(bytes);
  const mime = sniffImage(prepared)?.mime ?? sniffed.mime;
  await ensurePhotoTable();
  const b64 = prepared.toString("base64");
  await prisma.$executeRaw`
    INSERT INTO admin_profile_photos (admin_id, mime_type, data_base64, updated_at)
    VALUES (${adminId}, ${mime}, ${b64}, NOW())
    ON DUPLICATE KEY UPDATE mime_type = ${mime}, data_base64 = ${b64}, updated_at = NOW()
  `;

  const env = loadEnv();
  const dir = path.resolve(env.STORAGE_PATH, "public", "admins");
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${adminId}${sniffed.ext}`;
  await fs.promises.writeFile(path.join(dir, filename), prepared);

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
      const sniffed = sniffImage(bytes);
      if (sniffed && bytes.length > 0) {
        const prepared = prepareStoredImage(bytes);
        return { bytes: prepared, mimeType: sniffImage(prepared)?.mime ?? sniffed.mime };
      }
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
      const prepared = prepareStoredImage(bytes);
      return { bytes: prepared, mimeType: sniffImage(prepared)?.mime ?? mime };
    }
  }

  return null;
}
