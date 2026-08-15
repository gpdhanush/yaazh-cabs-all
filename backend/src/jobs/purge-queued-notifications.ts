import { enqueueJob } from "../queues/job-queue.js";
import { prisma } from "../config/database.js";

let enqueuedDay = "";

/** Queued logs older than 24h. One DB round-trip. */
export async function purgeQueuedNotificationLogs() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.notificationLogs.deleteMany({
    where: {
      delivery_status: "queued",
      created_at: { lt: cutoff },
    },
  });
}

/** Enqueue at most once per UTC day (unique job key). Safe to call on every drain. */
export async function enqueueDailyQueuedNotificationPurge() {
  const day = new Date().toISOString().slice(0, 10);
  if (enqueuedDay === day) return;
  await enqueueJob("purge_queued_notifications", {}, {
    idempotencyKey: `purge_queued_notifications_${day}`,
  });
  enqueuedDay = day;
}
