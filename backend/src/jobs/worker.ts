import { hostname } from "node:os";
import { prisma } from "../config/database.js";
import { loadEnv } from "../config/env.js";
import { claimJobs, completeJob, failJob } from "../queues/job-queue.js";
import { deliverBookingNotification } from "../services/fcm.service.js";

loadEnv();

const workerId = `worker-${hostname()}-${process.pid}`;

const NOTIFY_JOBS = new Set([
  "notify_booking_created",
  "notify_booking_confirmed",
  "notify_driver_offer",
  "notify_driver_assigned",
  "notify_booking_driver_assigned",
  "notify_booking_completed",
  "send_notification",
]);

function defaultTitle(jobType: string): string {
  switch (jobType) {
    case "notify_booking_created":
      return "Booking received";
    case "notify_booking_confirmed":
      return "Booking confirmed";
    case "notify_driver_offer":
    case "notify_driver_assigned":
      return "New trip assigned";
    case "notify_booking_driver_assigned":
      return "Driver assigned";
    case "notify_booking_completed":
      return "Trip completed";
    default:
      return "Notification";
  }
}

function inferRecipient(payload: Record<string, unknown>, jobType: string): "customer" | "driver" | "admin" {
  if (payload.recipient_type === "customer" || payload.recipient_type === "driver" || payload.recipient_type === "admin") {
    return payload.recipient_type;
  }
  if (payload.driver_id) return "driver";
  if (payload.customer_id) return "customer";
  if (jobType.includes("driver")) return "driver";
  if (jobType.includes("booking")) return "customer";
  return "admin";
}

async function handleJob(jobType: string, payload: Record<string, unknown>) {
  switch (jobType) {
    case "notify_booking_created":
    case "notify_booking_confirmed":
    case "notify_driver_offer":
    case "notify_driver_assigned":
    case "notify_booking_driver_assigned":
    case "notify_booking_completed":
    case "send_notification": {
      // Persist an in-app notification log; FCM/SMS can plug in later using the same payload.
      const recipientType = inferRecipient(payload, jobType);
      await deliverBookingNotification({
        recipientType,
        customerId: payload.customer_id ? String(payload.customer_id) : null,
        driverId: payload.driver_id ? String(payload.driver_id) : null,
        bookingId: payload.booking_id ? String(payload.booking_id) : null,
        jobType,
        title: String(payload.title ?? defaultTitle(jobType)),
        body: String(payload.body ?? JSON.stringify(payload)),
      });
      return;
    }
    case "expire_driver_offers": {
      await prisma.bookingDriverOffers.updateMany({
        where: {
          status: { in: ["sent", "seen"] },
          expires_at: { lt: new Date() },
        },
        data: { status: "expired" },
      });
      return;
    }
    default:
      if (NOTIFY_JOBS.has(jobType)) return;
      console.warn(`Unknown job type: ${jobType}`);
  }
}

export async function processOnce(limit = 20) {
  const jobs = await claimJobs(workerId, limit);
  for (const job of jobs) {
    try {
      await handleJob(job.job_type, job.payload as Record<string, unknown>);
      await completeJob(job.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await failJob(job.id, message, job.max_attempts, job.attempts + 1);
    }
  }
  return jobs.length;
}

async function main() {
  // Always enqueue a maintenance tick
  try {
    await prisma.jobQueue.create({
      data: {
        job_type: "expire_driver_offers",
        payload: {},
        available_at: new Date(),
        idempotency_key: `expire_offers_${new Date().toISOString().slice(0, 16)}`,
      },
    });
  } catch {
    // ignore unique collision
  }

  const n = await processOnce();
  console.log(`[${workerId}] processed ${n} jobs`);
  await prisma.$disconnect();
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("worker.ts") || process.argv[1]?.endsWith("worker.js")) {
  main().catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
}
