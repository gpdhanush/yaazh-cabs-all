const admin = require('firebase-admin');

let warnedMissingConfig = false;

function firebaseApp() {
  if (admin.apps.length) return admin.app();

  const projectId = process.env.FCM_PROJECT_ID;
  const clientEmail = process.env.FCM_CLIENT_EMAIL;
  const privateKey = process.env.FCM_PRIVATE_KEY;
  const enabled = String(process.env.FCM_ENABLED || '').toLowerCase() === 'true';
  if (!enabled || !projectId || !clientEmail || !privateKey) {
    if (!warnedMissingConfig) {
      warnedMissingConfig = true;
      console.warn('[INFO] FCM push disabled. Set FCM_ENABLED=true and Firebase service-account credentials to enable it.');
    }
    return null;
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function sendAudiencePush({ recipientType, customerId, driverId, broadcast, title, body }) {
  const app = firebaseApp();
  if (!app) return { status: 'skipped', devices: 0 };

  let query = 'SELECT id, fcm_token FROM app_devices WHERE user_type = ? AND is_active = 1';
  const params = [recipientType];
  if (!broadcast) {
    query += recipientType === 'customer' ? ' AND customer_id = ?' : ' AND driver_id = ?';
    params.push(recipientType === 'customer' ? customerId : driverId);
  }
  const [devices] = await require('../config/database').execute(query, params);
  if (!devices.length) return { status: 'skipped', devices: 0 };

  let sent = 0;
  try {
    for (const group of chunks(devices, 500)) {
      const response = await admin.messaging(app).sendEachForMulticast({
        tokens: group.map((device) => device.fcm_token),
        notification: { title, body },
        data: { type: 'announcement', job_type: broadcast ? 'admin_broadcast' : 'admin_direct', title, body },
        android: { priority: 'high', notification: { channelId: 'yaazh_bookings', sound: 'default' } },
        webpush: { headers: { Urgency: 'high' }, notification: { title, body, icon: '/favicon.ico' } },
      });
      sent += response.successCount;
    }
    return { status: sent ? 'sent' : 'failed', devices: devices.length, sent };
  } catch (error) {
    console.error('[ERROR] FCM audience send failed:', error.message);
    return { status: 'failed', devices: devices.length, sent };
  }
}

async function notifyAdmins({ bookingId, bookingReference, title, body }) {
  const pool = require('../config/database');
  const [devices] = await pool.execute(
    "SELECT id, admin_user_id, fcm_token FROM app_devices WHERE user_type = 'admin' AND is_active = 1"
  );
  if (!devices.length) return { status: 'skipped', devices: 0 };

  const app = firebaseApp();
  let status = 'queued';
  let sent = 0;
  if (app) {
    try {
      for (const group of chunks(devices, 500)) {
        const response = await admin.messaging(app).sendEachForMulticast({
          tokens: group.map((device) => device.fcm_token),
          notification: { title, body },
          data: {
            type: 'booking',
            job_type: 'new_booking',
            booking_id: String(bookingId),
            booking_reference: String(bookingReference),
            title,
            body,
          },
          android: { priority: 'high', notification: { channelId: 'yaazh_admin', sound: 'default' } },
          webpush: { headers: { Urgency: 'high' }, notification: { title, body, icon: '/favicon.ico' } },
        });
        sent += response.successCount;
      }
      status = sent ? 'sent' : 'failed';
    } catch (error) {
      status = 'failed';
      console.error('[ERROR] FCM admin booking notification failed:', error.message);
    }
  }

  const channel = app ? 'push' : 'in_app';
  const deliveryStatus = status === 'sent' ? 'sent' : status === 'failed' ? 'failed' : 'queued';
  const payload = JSON.stringify({ type: 'booking', job_type: 'new_booking', booking_id: String(bookingId), booking_reference: String(bookingReference) });
  const adminIds = [...new Set(devices.map((device) => device.admin_user_id).filter(Boolean))];
  for (const adminUserId of adminIds) {
    await pool.execute(
      `INSERT INTO notification_logs
       (sender_type, recipient_type, admin_user_id, booking_id, channel, title, body, data_payload, delivery_status, sent_at)
       VALUES ('system', 'admin', ?, ?, ?, ?, ?, ?, ?, ${deliveryStatus === 'sent' ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
      [adminUserId, bookingId, channel, title, body, payload, deliveryStatus]
    );
  }
  return { status, devices: devices.length, sent };
}

async function deliverAdminNotification({ audience, customerId, driverId, title, body, senderAdminId }) {
  const pool = require('../config/database');
  const recipientType = audience === 'all_customers' || audience === 'customer' ? 'customer' : 'driver';
  const broadcast = audience === 'all_customers' || audience === 'all_drivers';
  const idColumn = recipientType === 'customer' ? 'customer_id' : 'driver_id';
  let recipientQuery = recipientType === 'customer'
    ? "SELECT id FROM customers WHERE is_active = 1 AND app_status = 'active'"
    : 'SELECT id FROM drivers WHERE is_active = 1';
  const recipientParams = [];
  if (!broadcast) {
    recipientQuery += ` AND id = ?`;
    recipientParams.push(recipientType === 'customer' ? customerId : driverId);
  }
  const [recipients] = await pool.execute(recipientQuery, recipientParams);
  if (!recipients.length) return { delivery_status: 'skipped', recipient_count: 0, push_devices: 0, audience };

  const push = await sendAudiencePush({ recipientType, customerId, driverId, broadcast, title, body });
  const fcmEnabled = String(process.env.FCM_ENABLED || '').toLowerCase() === 'true';
  const deliveryStatus = push.status === 'sent' ? 'sent' : push.status === 'failed' ? 'failed' : 'queued';
  const channel = fcmEnabled ? 'push' : 'in_app';
  const payload = JSON.stringify({ job_type: broadcast ? 'admin_broadcast' : 'admin_direct', audience });

  for (const recipient of recipients) {
    await pool.execute(
      `INSERT INTO notification_logs
       (sender_type, sender_admin_id, recipient_type, ${idColumn}, channel, title, body, data_payload, delivery_status, sent_at)
       VALUES ('admin', ?, ?, ?, ?, ?, ?, ?, ?, ${deliveryStatus === 'sent' ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
      [senderAdminId, recipientType, recipient.id, channel, title, body, payload, deliveryStatus]
    );
  }

  return {
    delivery_status: deliveryStatus,
    recipient_count: recipients.length,
    push_devices: push.devices,
    audience,
  };
}

module.exports = { deliverAdminNotification, notifyAdmins };
