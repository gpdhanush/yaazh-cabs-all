import admin from "firebase-admin";
import { loadEnv } from "../config/env.js";
import { prisma } from "../config/database.js";

let warnedMissingFcm = false;

function initAdmin() {
  if (admin.apps.length > 0) return admin.app();
  const env = loadEnv();
  if (!env.fcmEnabled || !env.FCM_PROJECT_ID || !env.FCM_CLIENT_EMAIL || !env.FCM_PRIVATE_KEY) {
    if (!warnedMissingFcm) {
      warnedMissingFcm = true;
      console.warn(
        "FCM push skipped: set FCM_ENABLED=true plus FCM_PROJECT_ID, FCM_CLIENT_EMAIL, and FCM_PRIVATE_KEY from a Firebase service account (Project settings → Service accounts).",
      );
    }
    return null;
  }
  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FCM_PROJECT_ID,
      clientEmail: env.FCM_CLIENT_EMAIL,
      privateKey: env.FCM_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

export async function sendBookingPush(params: {
  customerId?: string | null;
  driverId?: string | null;
  adminId?: string | null;
  recipientType: "customer" | "driver" | "admin";
  title: string;
  body: string;
  bookingId?: string | null;
  jobType: string;
}): Promise<"sent" | "skipped" | "failed"> {
  const app = initAdmin();
  if (!app) return "skipped";

  const where =
    params.recipientType === "driver" && params.driverId
      ? { user_type: "driver" as const, driver_id: BigInt(params.driverId), is_active: true }
      : params.recipientType === "customer" && params.customerId
        ? { user_type: "customer" as const, customer_id: BigInt(params.customerId), is_active: true }
        : params.recipientType === "admin"
          ? {
              user_type: "admin" as const,
              ...(params.adminId ? { admin_user_id: BigInt(params.adminId) } : {}),
              is_active: true,
            }
          : null;
  if (!where) return "skipped";

  const devices = await prisma.appDevices.findMany({
    where,
    select: { id: true, fcm_token: true },
  });
  if (devices.length === 0) return "skipped";

  const data: Record<string, string> = {
    type: "booking",
    job_type: params.jobType,
    title: params.title,
    body: params.body,
  };
  if (params.bookingId) data.booking_id = String(params.bookingId);

  try {
    await admin.messaging().sendEachForMulticast({
      tokens: devices.map((d) => d.fcm_token),
      notification: {
        title: params.title,
        body: params.body,
      },
      data,
      android: {
        priority: "high",
        notification: {
          channelId: "yaazh_bookings",
          sound: "default",
        },
      },
      webpush: {
        headers: { Urgency: "high" },
        notification: {
          title: params.title,
          body: params.body,
          icon: "/favicon.ico",
        },
      },
    });
    return "sent";
  } catch (err) {
    console.error("FCM send failed", err);
    return "failed";
  }
}

export async function deliverBookingNotification(params: {
  recipientType: "customer" | "driver" | "admin";
  customerId?: string | null;
  driverId?: string | null;
  bookingId?: string | null;
  jobType: string;
  title: string;
  body: string;
}): Promise<"sent" | "skipped" | "failed"> {
  const env = loadEnv();
  const pushStatus = await sendBookingPush(params);
  const logData = {
    recipient_type: params.recipientType,
    customer_id: params.customerId ? BigInt(params.customerId) : null,
    driver_id: params.driverId ? BigInt(params.driverId) : null,
    booking_id: params.bookingId ? BigInt(params.bookingId) : null,
    channel: env.fcmEnabled ? ("push" as const) : ("in_app" as const),
    title: params.title,
    body: params.body,
    delivery_status: pushStatus === "sent" ? "sent" : pushStatus === "failed" ? "failed" : "queued",
    sent_at: pushStatus === "sent" ? new Date() : null,
    data_payload: {
      job_type: params.jobType,
      booking_id: params.bookingId ?? null,
    },
  };
  try {
    await prisma.notificationLogs.create({ data: logData });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("Foreign key") && !message.includes("constraint")) throw err;
    await prisma.notificationLogs.create({
      data: { ...logData, driver_id: null, customer_id: logData.customer_id, booking_id: logData.booking_id },
    });
  }
  return pushStatus;
}
