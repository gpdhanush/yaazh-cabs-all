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

const FCM_MULTICAST_LIMIT = 500;

export type AdminNotificationAudience =
  | "all_customers"
  | "all_drivers"
  | "customer"
  | "driver";

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function sendAudiencePush(params: {
  recipientType: "customer" | "driver";
  customerId?: string | null;
  driverId?: string | null;
  broadcast: boolean;
  title: string;
  body: string;
  jobType: string;
}): Promise<{ status: "sent" | "skipped" | "failed"; devices: number }> {
  const app = initAdmin();
  if (!app) return { status: "skipped", devices: 0 };

  const where = params.broadcast
    ? { user_type: params.recipientType, is_active: true }
    : params.recipientType === "driver" && params.driverId
      ? { user_type: "driver" as const, driver_id: BigInt(params.driverId), is_active: true }
      : params.recipientType === "customer" && params.customerId
        ? { user_type: "customer" as const, customer_id: BigInt(params.customerId), is_active: true }
        : null;
  if (!where) return { status: "skipped", devices: 0 };

  const devices = await prisma.appDevices.findMany({
    where,
    select: { fcm_token: true },
  });
  if (devices.length === 0) return { status: "skipped", devices: 0 };

  const data: Record<string, string> = {
    type: "announcement",
    job_type: params.jobType,
    title: params.title,
    body: params.body,
  };

  try {
    let sentAny = false;
    for (const group of chunk(devices, FCM_MULTICAST_LIMIT)) {
      await admin.messaging().sendEachForMulticast({
        tokens: group.map((d) => d.fcm_token),
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
      sentAny = true;
    }
    return { status: sentAny ? "sent" : "skipped", devices: devices.length };
  } catch (err) {
    console.error("FCM audience send failed", err);
    return { status: "failed", devices: devices.length };
  }
}

export async function deliverAdminNotification(params: {
  audience: AdminNotificationAudience;
  customerId?: string | null;
  driverId?: string | null;
  title: string;
  body: string;
  senderAdminId: bigint;
}): Promise<{
  delivery_status: "sent" | "skipped" | "failed";
  recipient_count: number;
  push_devices: number;
  audience: AdminNotificationAudience;
}> {
  const broadcast = params.audience === "all_customers" || params.audience === "all_drivers";
  const recipientType: "customer" | "driver" =
    params.audience === "all_customers" || params.audience === "customer" ? "customer" : "driver";

  let recipients: Array<{ id: bigint }> = [];
  if (params.audience === "all_customers") {
    recipients = await prisma.customers.findMany({
      where: { is_active: true, app_status: "active" },
      select: { id: true },
    });
  } else if (params.audience === "all_drivers") {
    recipients = await prisma.drivers.findMany({
      where: { is_active: true },
      select: { id: true },
    });
  } else if (params.audience === "customer" && params.customerId) {
    const customer = await prisma.customers.findUnique({
      where: { id: BigInt(params.customerId) },
      select: { id: true },
    });
    if (customer) recipients = [customer];
  } else if (params.audience === "driver" && params.driverId) {
    const driver = await prisma.drivers.findUnique({
      where: { id: BigInt(params.driverId) },
      select: { id: true },
    });
    if (driver) recipients = [driver];
  }

  if (recipients.length === 0) {
    return {
      delivery_status: "skipped",
      recipient_count: 0,
      push_devices: 0,
      audience: params.audience,
    };
  }

  const jobType = broadcast ? "admin_broadcast" : "admin_direct";
  const push = await sendAudiencePush({
    recipientType,
    customerId: params.customerId ?? null,
    driverId: params.driverId ?? null,
    broadcast,
    title: params.title,
    body: params.body,
    jobType,
  });

  const env = loadEnv();
  const channel = env.fcmEnabled ? ("push" as const) : ("in_app" as const);
  const deliveryStatus =
    push.status === "sent" ? "sent" : push.status === "failed" ? "failed" : "queued";
  const sentAt = push.status === "sent" ? new Date() : null;

  await prisma.notificationLogs.createMany({
    data: recipients.map((r) => ({
      sender_type: "admin" as const,
      sender_admin_id: params.senderAdminId,
      recipient_type: recipientType,
      customer_id: recipientType === "customer" ? r.id : null,
      driver_id: recipientType === "driver" ? r.id : null,
      channel,
      title: params.title,
      body: params.body,
      delivery_status: deliveryStatus,
      sent_at: sentAt,
      data_payload: {
        job_type: jobType,
        audience: params.audience,
      },
    })),
  });

  return {
    delivery_status: push.status,
    recipient_count: recipients.length,
    push_devices: push.devices,
    audience: params.audience,
  };
}
