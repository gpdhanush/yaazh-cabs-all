import { prisma } from "./database.js";

const TABLES = [
  "app_settings",
  "app_versions",
  "remote_config_values",
  "bookings",
  "booking_status_history",
  "notification_logs",
  "notification_templates",
  "customers",
  "drivers",
  "support_tickets",
  "support_ticket_messages",
  "cms_pages",
  "faqs",
  "testimonials",
  "contact_enquiries",
  "routes",
  "vehicle_categories",
  "cities",
  "coupons",
] as const;

export async function ensureUtf8mb4(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      "ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    );
  } catch (err) {
    console.warn("ALTER DATABASE utf8mb4 skipped:", err instanceof Error ? err.message : err);
  }

  for (const table of TABLES) {
    try {
      const rows = await prisma.$queryRaw<Array<{ cs: string }>>`
        SELECT CHARACTER_SET_NAME AS cs
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ${table}
        LIMIT 1
      `;
      const charset = rows[0]?.cs;
      if (!charset) continue;
      if (charset.toLowerCase() === "utf8mb4") continue;
      await prisma.$executeRawUnsafe(
        `ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
      console.info(`Converted ${table} to utf8mb4`);
    } catch (err) {
      console.warn(`utf8mb4 convert skipped for ${table}:`, err instanceof Error ? err.message : err);
    }
  }
}
