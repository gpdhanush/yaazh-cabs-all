const pool = require('../config/database');
const fs = require('fs/promises');
const path = require('path');
const { success } = require('../utils/response');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { createInvoicePdf } = require('../utils/invoice-pdf');
const { sendBookingInvoice, isSmtpAuthError } = require('../utils/mailer');
const { deliverAdminNotification } = require('../services/fcm.service');

const MAX_LOG_BYTES = 100_000;
const MAX_LOG_LINES = 1_000;

function stderrLogPath() {
  const configuredPath = process.env.STDERR_LOG_PATH || 'Backend-node/stderr.log';
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(__dirname, '..', configuredPath.replace(/^Backend-node[\\/]/, 'Backend-node/'));
}

function sanitizeLogLine(line) {
  return line
    .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s,]+/gi, '$1[REDACTED]')
    .replace(/((?:password|passwd|pwd|token|refresh_token|access_token|api[_-]?key|secret|otp|cookie)\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]')
    .replace(/(Bearer\s+)[^\s]+/gi, '$1[REDACTED]')
    .replace(/\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9_-]+\b/g, '[REDACTED]')
    .replace(/\b\d{12,19}\b/g, '[REDACTED_PAYMENT_VALUE]');
}

async function readStderrTail() {
  const filePath = stderrLogPath();
  let handle;
  try {
    handle = await fs.open(filePath, 'r');
    const stats = await handle.stat();
    const bytesToRead = Math.min(stats.size, MAX_LOG_BYTES);
    const buffer = Buffer.alloc(bytesToRead);
    if (bytesToRead) await handle.read(buffer, 0, bytesToRead, Math.max(0, stats.size - bytesToRead));
    let text = buffer.toString('utf8');
    if (stats.size > bytesToRead) text = text.slice(text.indexOf('\n') + 1);
    const lines = text.split(/\r?\n/);
    return {
      available: true,
      path: 'stderr.log',
      size_bytes: stats.size,
      truncated: stats.size > bytesToRead || lines.length > MAX_LOG_LINES,
      content: lines.slice(-MAX_LOG_LINES).map(sanitizeLogLine).join('\n').trimEnd(),
    };
  } catch (error) {
    if (error.code === 'ENOENT') return { available: false, path: 'stderr.log', size_bytes: 0, truncated: false, content: '' };
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      error.statusCode = 503;
      error.message = 'The server log is not readable by the API process.';
    }
    throw error;
  } finally {
    await handle?.close();
  }
}

async function getStderrLog(req, res) {
  return success(res, await readStderrTail());
}

async function deleteStderrLog(req, res) {
  try {
    await fs.unlink(stderrLogPath());
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return success(res, { path: 'stderr.log', deleted: true }, 'Server log deleted.');
}

function adminId(req) {
  return Number(req.user.sub);
}

function positiveId(value, field = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) { const error = new Error(`${field} must be a positive integer.`); error.statusCode = 422; throw error; }
  return id;
}

function parseValue(value, type) {
  if (type === 'number') return Number(value);
  if (type === 'boolean') return value === true || value === 'true' || value === 1 || value === '1';
  if (type === 'json') {
    try { return value == null || value === '' ? null : JSON.parse(value); } catch (_error) { return value; }
  }
  return value;
}

async function profile(req, res) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, u.phone, u.avatar_url, u.role_id, r.name AS role_name
     FROM admin_users u INNER JOIN admin_roles r ON r.id = u.role_id
     WHERE u.id = ? AND u.is_active = 1 AND r.is_active = 1 LIMIT 1`, [adminId(req)]
  );
  if (!rows[0]) { const error = new Error('Admin account not found.'); error.statusCode = 404; throw error; }
  const [permissions] = await pool.execute(
    `SELECT CONCAT(p.module, '.', p.action) AS permission
     FROM role_permissions rp INNER JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = ? ORDER BY p.module, p.action`, [rows[0].role_id]
  );
  return success(res, {
    id: String(rows[0].id),
    name: rows[0].name,
    email: rows[0].email,
    phone: rows[0].phone,
    avatar_url: rows[0].avatar_url,
    role_id: String(rows[0].role_id),
    role_name: rows[0].role_name,
    permissions: permissions.map((row) => row.permission)
  });
}

async function updateProfile(req, res) {
  const fields = ['name', 'email', 'phone', 'avatar_url'];
  const updates = [];
  const values = [];
  for (const field of fields) {
    if (req.body[field] !== undefined) { updates.push(`${field} = ?`); values.push(req.body[field]); }
  }
  if (!updates.length) { const error = new Error('No supported profile fields supplied.'); error.statusCode = 422; throw error; }
  values.push(adminId(req));
  await pool.execute(`UPDATE admin_users SET ${updates.join(', ')} WHERE id = ? AND is_active = 1`, values);
  return profile(req, res);
}

async function uploadProfilePhoto(req, res) {
  if (!req.file) { const error = new Error('An image file is required.'); error.statusCode = 422; throw error; }
  const publicPath = `/api/v1/public/media/admin/${req.file.filename}`;
  await pool.execute('UPDATE admin_users SET avatar_url = ? WHERE id = ? AND is_active = 1', [publicPath, adminId(req)]);
  return profile(req, res);
}

async function removeProfilePhoto(req, res) {
  await pool.execute('UPDATE admin_users SET avatar_url = NULL WHERE id = ? AND is_active = 1', [adminId(req)]);
  return profile(req, res);
}

async function listSeoMeta(req, res) {
  const [rows] = await pool.execute(
    `SELECT id, entity_type, entity_id, url_path, meta_title, meta_description,
      canonical_url, og_title, og_description, og_image_url, schema_json,
      robots_index, robots_follow, created_at, updated_at
     FROM seo_meta ORDER BY url_path, id`
  );
  return success(res, rows);
}

async function saveSeoMeta(req, res) {
  const entityTypes = ['home', 'cms_page', 'blog_post', 'route', 'vehicle_category', 'custom'];
  const entityType = String(req.body.entity_type || '').trim();
  const urlPath = String(req.body.url_path || '').trim();
  if (!entityTypes.includes(entityType) || !urlPath.startsWith('/')) {
    const error = new Error('entity_type and a url_path beginning with / are required.'); error.statusCode = 422; throw error;
  }
  const entityId = req.body.entity_id == null || req.body.entity_id === '' ? null : positiveId(req.body.entity_id, 'entity_id');
  const fields = ['meta_title', 'meta_description', 'canonical_url', 'og_title', 'og_description', 'og_image_url', 'schema_json'];
  const values = fields.map((field) => req.body[field] == null ? null : String(req.body[field]));
  if (values[6]) {
    try { JSON.parse(values[6]); } catch (_error) { const error = new Error('schema_json must be valid JSON.'); error.statusCode = 422; throw error; }
  }
  const robotsIndex = req.body.robots_index == null ? 1 : Number(Boolean(req.body.robots_index));
  const robotsFollow = req.body.robots_follow == null ? 1 : Number(Boolean(req.body.robots_follow));
  const [existing] = await pool.execute('SELECT id FROM seo_meta WHERE entity_type = ? AND (entity_id = ? OR (entity_id IS NULL AND ? IS NULL)) AND url_path = ? LIMIT 1', [entityType, entityId, entityId, urlPath]);
  if (existing[0]) {
    await pool.execute(
      `UPDATE seo_meta SET entity_id = ?, meta_title = ?, meta_description = ?, canonical_url = ?,
       og_title = ?, og_description = ?, og_image_url = ?, schema_json = ?, robots_index = ?, robots_follow = ? WHERE id = ?`,
      [entityId, ...values, robotsIndex, robotsFollow, existing[0].id]
    );
    return success(res, { id: String(existing[0].id) }, 'SEO metadata updated.');
  }
  const [result] = await pool.execute(
    `INSERT INTO seo_meta (entity_type, entity_id, url_path, meta_title, meta_description, canonical_url,
      og_title, og_description, og_image_url, schema_json, robots_index, robots_follow)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [entityType, entityId, urlPath, ...values, robotsIndex, robotsFollow]
  );
  return success(res, { id: String(result.insertId) }, 'SEO metadata created.', 201);
}

async function settings(req, res) {
  const [rows] = await pool.execute(
    `SELECT setting_key, setting_value AS value, value_type AS type, group_name AS group_name
     FROM app_settings ORDER BY group_name, setting_key`
  );
  return success(res, rows.map((row) => ({ ...row, key: row.setting_key, value: parseValue(row.value, row.type) })));
}

async function dashboard(req, res) {
  const [[bookingRows], [driverRows], [customerRows], [enquiryRows]] = await Promise.all([
    pool.execute(`SELECT
      COUNT(*) AS total_bookings,
      SUM(status = 'pending') AS pending_bookings,
      SUM(DATE(created_at) = CURRENT_DATE) AS bookings_today
      FROM bookings`),
    pool.execute("SELECT COUNT(*) AS active_drivers FROM drivers WHERE is_active = 1 AND verification_status = 'approved'"),
    pool.execute('SELECT COUNT(*) AS customers FROM customers WHERE is_active = 1'),
    pool.execute("SELECT COUNT(*) AS enquiries FROM contact_enquiries WHERE status IN ('new', 'in_progress')")
  ]);
  const booking = bookingRows[0] || {};
  return success(res, {
    total_bookings: Number(booking.total_bookings || 0),
    pending_bookings: Number(booking.pending_bookings || 0),
    active_drivers: Number(driverRows[0]?.active_drivers || 0),
    customers: Number(customerRows[0]?.customers || 0),
    bookings_today: Number(booking.bookings_today || 0),
    enquiries: Number(enquiryRows[0]?.enquiries || 0)
  });
}

async function liveTracking(req, res) {
  const [rows] = await pool.execute(
    `SELECT b.id, b.booking_reference, b.status, b.customer_name, b.pickup_location, b.drop_location,
      b.pickup_latitude, b.pickup_longitude, b.drop_latitude, b.drop_longitude,
      b.estimated_duration_minutes, b.pickup_at,
      d.id AS driver_id, d.name AS driver_name, d.phone AS driver_phone, d.profile_image_url AS driver_photo_url,
      v.vehicle_name, v.registration_no,
      dl.latitude AS location_latitude, dl.longitude AS location_longitude, dl.heading AS location_heading,
      dl.speed_kmph AS location_speed_kmph, dl.recorded_at AS location_recorded_at
     FROM bookings b
     LEFT JOIN drivers d ON d.id = b.assigned_driver_id
     LEFT JOIN vehicles v ON v.id = b.assigned_vehicle_id
     LEFT JOIN driver_locations dl ON dl.id = (
       SELECT latest.id FROM driver_locations latest
       WHERE latest.booking_id = b.id OR (latest.booking_id IS NULL AND latest.driver_id = b.assigned_driver_id)
       ORDER BY latest.recorded_at DESC, latest.id DESC LIMIT 1
     )
     WHERE b.status IN ('driver_notified', 'driver_accepted', 'driver_assigned', 'on_the_way', 'arrived', 'trip_started')
     ORDER BY b.pickup_at ASC, b.id DESC LIMIT 100`
  );
  const progressByStatus = {
    driver_notified: 10,
    driver_accepted: 20,
    driver_assigned: 25,
    on_the_way: 50,
    arrived: 70,
    trip_started: 85,
  };
  const now = Date.now();
  return success(res, rows.map((row) => {
    const recordedAt = row.location_recorded_at ? new Date(row.location_recorded_at) : null;
    const stale = !recordedAt || now - recordedAt.getTime() > 5 * 60 * 1000;
    return {
      id: String(row.id),
      booking_reference: row.booking_reference,
      status: row.status,
      customer_name: row.customer_name,
      pickup_location: row.pickup_location,
      drop_location: row.drop_location,
      pickup_latitude: row.pickup_latitude == null ? null : Number(row.pickup_latitude),
      pickup_longitude: row.pickup_longitude == null ? null : Number(row.pickup_longitude),
      drop_latitude: row.drop_latitude == null ? null : Number(row.drop_latitude),
      drop_longitude: row.drop_longitude == null ? null : Number(row.drop_longitude),
      progress: progressByStatus[row.status] || 0,
      eta_min: row.estimated_duration_minutes == null ? null : Math.max(0, Number(row.estimated_duration_minutes) - Math.round((now - new Date(row.pickup_at).getTime()) / 60000)),
      driver: row.driver_id == null ? null : { id: String(row.driver_id), name: row.driver_name, phone: row.driver_phone, photo_url: row.driver_photo_url },
      vehicle: row.vehicle_name == null ? null : { name: row.vehicle_name, registration: row.registration_no },
      location: row.location_latitude == null ? null : {
        latitude: Number(row.location_latitude), longitude: Number(row.location_longitude),
        heading: row.location_heading == null ? null : Number(row.location_heading),
        speed_kmph: row.location_speed_kmph == null ? null : Number(row.location_speed_kmph),
        recorded_at: row.location_recorded_at, stale,
      },
    };
  }));
}

async function updateSetting(req, res) {
  const key = String(req.params.key || '').trim();
  if (!key || req.body.value === undefined) { const error = new Error('setting key and value are required.'); error.statusCode = 422; throw error; }
  const [rows] = await pool.execute('SELECT value_type FROM app_settings WHERE setting_key = ? LIMIT 1', [key]);
  if (!rows[0]) { const error = new Error('Setting not found.'); error.statusCode = 404; throw error; }
  const type = rows[0].value_type;
  let value;
  try {
    value = type === 'json' ? JSON.stringify(req.body.value) : type === 'boolean' ? String(Boolean(req.body.value)) : String(req.body.value);
    if (type === 'number' && !Number.isFinite(Number(req.body.value))) throw new Error('invalid number');
  } catch (_error) {
    const error = new Error('Invalid setting value.'); error.statusCode = 422; throw error;
  }
  await pool.execute('UPDATE app_settings SET setting_value = ? WHERE setting_key = ?', [value, key]);
  return success(res, { key, value: parseValue(value, type), type }, 'Setting updated.');
}

async function listBookings(req, res) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const perPage = Math.min(500, Math.max(1, Number.parseInt(req.query.per_page, 10) || 20));
  const validStatuses = ['pending', 'confirmed', 'driver_notified', 'driver_accepted', 'driver_rejected', 'driver_assigned', 'on_the_way', 'arrived', 'trip_started', 'completed', 'cancelled', 'rejected', 'no_show'];
  const status = req.query.status ? String(req.query.status) : null;
  if (status && !validStatuses.includes(status)) { const error = new Error('Invalid booking status.'); error.statusCode = 422; throw error; }
  const where = status ? 'WHERE b.status = ?' : '';
  const params = status ? [status] : [];
  const [[countRows], [rows]] = await Promise.all([
    pool.execute(`SELECT COUNT(*) AS total FROM bookings b ${where}`, params),
    pool.execute(
      `SELECT b.id, b.booking_reference, b.status, b.trip_type, b.payment_status,
        b.customer_name, b.customer_phone, b.customer_email, b.pickup_location, b.drop_location,
        b.pickup_at, b.estimated_total, b.final_total, b.assigned_driver_id,
        b.estimated_distance_km, b.start_odometer_km, b.end_odometer_km, b.actual_distance_km,
        b.created_at, b.confirmed_at, b.completed_at,
        d.id AS driver_id, d.name AS driver_name, d.phone AS driver_phone, d.profile_image_url AS driver_photo_url,
        v.id AS vehicle_id, v.vehicle_name, v.registration_no
       FROM bookings b
       LEFT JOIN drivers d ON d.id = b.assigned_driver_id
       LEFT JOIN vehicles v ON v.id = b.assigned_vehicle_id
       ${where}
       ORDER BY b.created_at DESC, b.id DESC LIMIT ? OFFSET ?`, [...params, perPage, (page - 1) * perPage]
    )
  ]);
  const data = rows.map((row) => ({
    ...row,
    id: String(row.id),
    assigned_driver_id: row.assigned_driver_id == null ? null : String(row.assigned_driver_id),
    driver: row.driver_id == null ? null : {
      id: String(row.driver_id), name: row.driver_name, phone: row.driver_phone,
      photo_url: row.driver_photo_url, profile_image_url: row.driver_photo_url
    },
    vehicle: row.vehicle_id == null ? null : {
      id: String(row.vehicle_id), name: row.vehicle_name, registration: row.registration_no
    }
  }));
  const total = Number(countRows[0].total);
  return success(res, data, 'Bookings fetched.', 200, {
    page, per_page: perPage, total, total_pages: Math.ceil(total / perPage)
  });
}

async function getBooking(req, res) {
  const id = positiveId(req.params.bookingId, 'bookingId');
  const [rows] = await pool.execute(
    `SELECT b.*, v.name AS vehicle_category_name,
      d.id AS driver_id, d.name AS driver_name, d.phone AS driver_phone, d.profile_image_url AS driver_photo_url,
      vh.id AS vehicle_id, vh.vehicle_name, vh.registration_no
     FROM bookings b
     INNER JOIN vehicle_categories v ON v.id = b.vehicle_category_id
     LEFT JOIN drivers d ON d.id = b.assigned_driver_id
     LEFT JOIN vehicles vh ON vh.id = b.assigned_vehicle_id
     WHERE b.id = ? LIMIT 1`, [id]
  );
  if (!rows[0]) { const error = new Error('Booking not found.'); error.statusCode = 404; throw error; }
  const [history] = await pool.execute(
    `SELECT old_status, new_status, note, changed_by_type, changed_at
     FROM booking_status_history WHERE booking_id = ? ORDER BY changed_at, id`, [id]
  );
  const [invoiceRows] = await pool.execute('SELECT * FROM booking_invoices WHERE booking_id = ? LIMIT 1', [id]);
  const [payments] = await pool.execute(
    `SELECT id, amount, method, payment_type, status, paid_at, created_at
     FROM payments WHERE booking_id = ? ORDER BY created_at DESC`, [id]
  );
  const row = rows[0];
  const fareDue = Number(row.final_total ?? row.estimated_total ?? 0);
  const amountPaid = payments.filter((payment) => payment.status === 'success').reduce((sum, payment) => sum + Number(payment.amount), 0);
  return success(res, {
    ...row,
    id: String(row.id),
    assigned_driver_id: row.assigned_driver_id == null ? null : String(row.assigned_driver_id),
    vehicle_category: row.vehicle_category_name,
    driver: row.driver_id == null ? null : { id: String(row.driver_id), name: row.driver_name, phone: row.driver_phone, photo_url: row.driver_photo_url, profile_image_url: row.driver_photo_url },
    vehicle: row.vehicle_id == null ? null : { id: String(row.vehicle_id), name: row.vehicle_name, registration: row.registration_no },
    invoice: invoiceRows[0] ? { ...invoiceRows[0], id: String(invoiceRows[0].id), booking_id: String(invoiceRows[0].booking_id) } : null,
    payment: { booking_id: String(id), fare_due: fareDue, estimated_total: Number(row.estimated_total), final_total: row.final_total == null ? null : Number(row.final_total), amount_paid: amountPaid, balance_due: Math.max(0, fareDue - amountPaid), payment_status: row.payment_status, currency: 'INR', payments },
    history
  });
}

async function bookingPaymentSummary(bookingId, connection = pool) {
  const [bookings] = await connection.execute(
    'SELECT id, estimated_total, final_total, payment_status FROM bookings WHERE id = ? LIMIT 1',
    [bookingId]
  );
  if (!bookings[0]) { const error = new Error('Booking not found.'); error.statusCode = 404; throw error; }
  const [payments] = await connection.execute(
    `SELECT id, amount, method, payment_type, status, paid_at, created_at
     FROM payments WHERE booking_id = ? ORDER BY created_at DESC`, [bookingId]
  );
  const fareDue = Number(bookings[0].final_total ?? bookings[0].estimated_total ?? 0);
  const amountPaid = payments.filter((payment) => payment.status === 'success').reduce((sum, payment) => sum + Number(payment.amount), 0);
  return {
    booking_id: String(bookingId),
    fare_due: fareDue,
    estimated_total: Number(bookings[0].estimated_total),
    final_total: bookings[0].final_total == null ? null : Number(bookings[0].final_total),
    amount_paid: amountPaid,
    balance_due: Math.max(0, fareDue - amountPaid),
    payment_status: bookings[0].payment_status,
    currency: 'INR',
    payments,
  };
}

async function getBookingPayment(req, res) {
  const id = positiveId(req.params.bookingId, 'bookingId');
  return success(res, await bookingPaymentSummary(id), 'Payment details fetched.');
}

async function recordBookingPayment(req, res) {
  const bookingId = positiveId(req.params.bookingId, 'bookingId');
  const amount = Number(req.body.amount);
  const methods = ['cash', 'upi', 'card', 'netbanking', 'wallet', 'bank_transfer', 'other'];
  const method = req.body.method || 'cash';
  if (!Number.isFinite(amount) || amount <= 0) { const error = new Error('Payment amount must be greater than 0.'); error.statusCode = 422; throw error; }
  if (!methods.includes(method)) { const error = new Error('Invalid payment method.'); error.statusCode = 422; throw error; }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [bookings] = await connection.execute(
      'SELECT id, estimated_total, final_total FROM bookings WHERE id = ? FOR UPDATE', [bookingId]
    );
    if (!bookings[0]) { const error = new Error('Booking not found.'); error.statusCode = 404; throw error; }
    const [paidRows] = await connection.execute(
      "SELECT COALESCE(SUM(amount), 0) AS amount_paid FROM payments WHERE booking_id = ? AND status = 'success'", [bookingId]
    );
    const fareDue = Number(bookings[0].final_total ?? bookings[0].estimated_total ?? 0);
    const amountPaid = Number(paidRows[0].amount_paid || 0);
    const balanceDue = Math.max(0, fareDue - amountPaid);
    if (req.body.allow_overpay !== true && amount > balanceDue + 0.009) {
      const error = new Error(`Amount ₹${amount} exceeds balance due ₹${balanceDue}.`); error.statusCode = 422; throw error;
    }
    const paymentType = amount >= balanceDue - 0.009 ? 'final' : amountPaid > 0 ? 'partial' : 'advance';
    const [payment] = await connection.execute(
      `INSERT INTO payments (booking_id, payment_reference, gateway, method, payment_type, amount, currency, status, paid_at, gateway_response)
       VALUES (?, ?, 'admin_payment', ?, ?, ?, 'INR', 'success', CURRENT_TIMESTAMP, ?)`,
      [bookingId, `ADM-${bookingId}-${Date.now()}`, method, paymentType, amount, JSON.stringify({ note: req.body.note || null, admin_id: adminId(req) })]
    );
    const nextAmountPaid = amountPaid + amount;
    const nextStatus = nextAmountPaid >= fareDue - 0.009 ? 'paid' : 'partial';
    await connection.execute('UPDATE bookings SET payment_status = ? WHERE id = ?', [nextStatus, bookingId]);
    await connection.commit();
    return success(res, { ...(await bookingPaymentSummary(bookingId, connection)), payment_id: String(payment.insertId) }, 'Payment recorded.', 201);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function setBookingPaymentStatus(req, res) {
  const bookingId = positiveId(req.params.bookingId, 'bookingId');
  const validStatuses = ['unpaid', 'partial', 'paid', 'refunded', 'failed'];
  const paymentStatus = String(req.body.payment_status || '');
  if (!validStatuses.includes(paymentStatus)) { const error = new Error('Invalid payment status.'); error.statusCode = 422; throw error; }
  if (paymentStatus === 'paid') {
    const summary = await bookingPaymentSummary(bookingId);
    if (summary.balance_due > 0) {
      req.body.amount = summary.balance_due;
      req.body.method = 'other';
      req.body.allow_overpay = true;
      return recordBookingPayment(req, res);
    }
  }
  const [result] = await pool.execute('UPDATE bookings SET payment_status = ? WHERE id = ?', [paymentStatus, bookingId]);
  if (!result.affectedRows) { const error = new Error('Booking not found.'); error.statusCode = 404; throw error; }
  return success(res, await bookingPaymentSummary(bookingId), 'Payment status updated.');
}

async function applyBookingFare(req, res) {
  const bookingId = positiveId(req.params.bookingId, 'bookingId');
  const hasDiscount = req.body.discount_amount !== undefined && req.body.discount_amount !== null;
  const hasFinalTotal = req.body.final_total !== undefined && req.body.final_total !== null;
  if (!hasDiscount && !hasFinalTotal) {
    const error = new Error('Enter a discount amount or a final fare.'); error.statusCode = 422; throw error;
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [bookings] = await connection.execute(
      'SELECT id, booking_reference, status, estimated_total FROM bookings WHERE id = ? FOR UPDATE', [bookingId]
    );
    const booking = bookings[0];
    if (!booking) { const error = new Error('Booking not found.'); error.statusCode = 404; throw error; }
    const quoted = Number(booking.estimated_total || 0);
    if (quoted <= 0) { const error = new Error('Quoted fare is missing.'); error.statusCode = 422; throw error; }

    let discount;
    let finalTotal;
    if (hasFinalTotal) {
      finalTotal = Number(req.body.final_total);
      if (!Number.isFinite(finalTotal) || finalTotal < 0) { const error = new Error('Final fare cannot be negative.'); error.statusCode = 422; throw error; }
      if (finalTotal > quoted + 0.009) { const error = new Error(`Final fare cannot exceed quoted Rs. ${quoted}.`); error.statusCode = 422; throw error; }
      discount = quoted - finalTotal;
    } else {
      discount = Number(req.body.discount_amount);
      if (!Number.isFinite(discount) || discount < 0) { const error = new Error('Discount cannot be negative.'); error.statusCode = 422; throw error; }
      if (discount > quoted + 0.009) { const error = new Error(`Discount cannot exceed quoted Rs. ${quoted}.`); error.statusCode = 422; throw error; }
      finalTotal = Math.max(0, quoted - discount);
    }
    discount = Number(discount.toFixed(2));
    finalTotal = Number(finalTotal.toFixed(2));
    const [paidRows] = await connection.execute(
      "SELECT COALESCE(SUM(amount), 0) AS amount_paid FROM payments WHERE booking_id = ? AND status = 'success'", [bookingId]
    );
    const amountPaid = Number(paidRows[0]?.amount_paid || 0);
    if (finalTotal + 0.009 < amountPaid) {
      const error = new Error(`Final fare Rs. ${finalTotal} is below amount already paid Rs. ${amountPaid}.`); error.statusCode = 422; throw error;
    }
    const paymentStatus = amountPaid <= 0 ? 'unpaid' : amountPaid >= finalTotal - 0.009 ? 'paid' : 'partial';
    const balanceDue = Number(Math.max(0, finalTotal - amountPaid).toFixed(2));
    await connection.execute(
      `UPDATE bookings SET discount_amount = ?, final_total = ?, payment_status = ? WHERE id = ?`,
      [discount, finalTotal, paymentStatus, bookingId]
    );
    await connection.execute(
      `INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by_type, changed_by_admin_id, note)
       VALUES (?, ?, ?, 'admin', ?, ?)`,
      [bookingId, booking.status, booking.status, adminId(req), `Fare reduced by Rs. ${discount}. Final Rs. ${finalTotal}`]
    );
    const [invoices] = await connection.execute('SELECT id, status FROM booking_invoices WHERE booking_id = ? LIMIT 1', [bookingId]);
    if (invoices[0]) {
      const invoiceStatus = balanceDue <= 0 ? 'paid' : amountPaid > 0 ? 'partially_paid' : invoices[0].status;
      await connection.execute(
        `UPDATE booking_invoices SET discount_amount = ?, total_amount = ?, amount_paid = ?, balance_amount = ?, status = ? WHERE id = ?`,
        [discount, finalTotal, amountPaid, balanceDue, invoiceStatus, invoices[0].id]
      );
    }
    await connection.commit();
    return success(res, await bookingPaymentSummary(bookingId), 'Discount applied.');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
async function invoiceData(bookingId) {
  const [bookings] = await pool.execute(
    `SELECT id, booking_reference, customer_name, customer_phone, customer_email,
      pickup_location, drop_location, pickup_at, estimated_total, final_total
     FROM bookings WHERE id = ? LIMIT 1`, [bookingId],
  );
  if (!bookings[0]) { const error = new Error('Booking not found.'); error.statusCode = 404; throw error; }
  const [invoices] = await pool.execute('SELECT * FROM booking_invoices WHERE booking_id = ? LIMIT 1', [bookingId]);
  const [payments] = await pool.execute(
    'SELECT amount, status FROM payments WHERE booking_id = ? ORDER BY created_at DESC', [bookingId]
  );
  return { booking: bookings[0], invoice: invoices[0] ? { ...invoices[0], payments } : { payments } };
}

async function downloadBookingInvoice(req, res) {
  const id = positiveId(req.params.bookingId, 'bookingId');
  const data = await invoiceData(id);
  const pdf = await createInvoicePdf(data);
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="invoice-${data.booking.booking_reference}.pdf"`, 'Content-Length': pdf.length });
  return res.send(pdf);
}

async function resendBookingInvoice(req, res) {
  const id = positiveId(req.params.bookingId, 'bookingId');
  const data = await invoiceData(id);
  const email = String(req.body.email || data.booking.customer_email || '').trim().toLowerCase();
  if (!email) { const error = new Error('Customer email is required to send the invoice.'); error.statusCode = 422; throw error; }
  const pdf = await createInvoicePdf(data);
  const invoiceNumber = data.invoice?.invoice_number || `INV-${data.booking.booking_reference}`;
  const total = Number(data.invoice?.total_amount ?? data.booking.final_total ?? data.booking.estimated_total ?? 0);
  const paymentRows = data.invoice?.payments || [];
  const paid = paymentRows.length
    ? paymentRows.filter((payment) => payment.status === 'success').reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    : Number(data.invoice?.amount_paid || 0);
  const balance = Math.max(0, total - paid);
  try {
    await sendBookingInvoice({
      to: email,
      name: data.booking.customer_name,
      bookingReference: data.booking.booking_reference,
      invoiceNumber,
      pickup: data.booking.pickup_location,
      drop: data.booking.drop_location,
      total,
      balance,
      pdf,
    });
  } catch (error) {
    if (isSmtpAuthError(error)) {
      error.statusCode = 503;
      error.message = 'SMTP authentication failed. Check MAIL_USERNAME and MAIL_PASSWORD in cPanel.';
    }
    throw error;
  }
  return success(res, { email, booking_reference: data.booking.booking_reference }, 'Invoice sent.');
}

function publicInvoiceUrl(req, invoiceNumber) {
  const origin = String(process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  return `${origin}/api/v1/public/invoices/${encodeURIComponent(invoiceNumber)}.pdf`;
}

function whatsappUrl(phone, message) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) digits = `91${digits.slice(1)}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function feedbackPageUrl(bookingId) {
  const id = String(bookingId);
  const signature = crypto.createHmac('sha256', process.env.JWT_SECRET || '').update(`feedback:${id}`).digest('hex').slice(0, 24);
  const origin = String(process.env.PUBLIC_WEB_URL || 'https://yaazhcabsudumalpet.in').replace(/\/$/, '');
  return `${origin}/feedback/${id}.${signature}`;
}

async function sendBookingInvoiceWhatsApp(req, res) {
  const id = positiveId(req.params.bookingId, 'bookingId');
  const data = await invoiceData(id);
  const invoiceNumber = data.invoice?.invoice_number || `INV-${data.booking.booking_reference || id}`;
  const pdfUrl = publicInvoiceUrl(req, invoiceNumber);
  const message = [
    `Yaazh Cabs invoice ${invoiceNumber}`,
    `Booking ${data.booking.booking_reference}`,
    `${data.booking.pickup_location} -> ${data.booking.drop_location}`,
    '',
    'Download your invoice PDF:',
    pdfUrl,
  ].join('\n');
  return success(res, {
    whatsapp_url: whatsappUrl(data.booking.customer_phone, message),
    pdf_url: pdfUrl,
    phone: data.booking.customer_phone,
    message,
  }, 'Invoice ready to send on WhatsApp.');
}

async function sendFeedbackLink(req, res) {
  const id = positiveId(req.params.bookingId, 'bookingId');
  const [rows] = await pool.execute('SELECT booking_reference, customer_name, customer_phone FROM bookings WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) { const error = new Error('Booking not found.'); error.statusCode = 404; throw error; }
  const booking = rows[0];
  const feedbackUrl = feedbackPageUrl(id);
  const message = [
    `Hi ${booking.customer_name},`,
    `Thank you for riding with Yaazh Cabs (${booking.booking_reference}).`,
    '',
    'Please rate your trip and share a short review:',
    feedbackUrl,
  ].join('\n');
  return success(res, {
    feedback_url: feedbackUrl,
    whatsapp_url: whatsappUrl(booking.customer_phone, message),
    phone: booking.customer_phone,
    message,
  }, 'Feedback link ready to send on WhatsApp.');
}

async function transitionBooking(req, res, nextStatus, message, reason = null) {
  const id = positiveId(req.params.bookingId, 'bookingId');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT id, status FROM bookings WHERE id = ? FOR UPDATE', [id]);
    if (!rows[0]) { const error = new Error('Booking not found.'); error.statusCode = 404; throw error; }
    const current = rows[0].status;
    const allowed = {
      confirmed: ['pending'],
      rejected: ['pending', 'confirmed'],
      cancelled: ['pending', 'confirmed', 'driver_notified', 'driver_assigned']
    }[nextStatus];
    if (!allowed.includes(current)) { const error = new Error(`Booking cannot be ${nextStatus} from ${current}.`); error.statusCode = 409; throw error; }
    const fields = nextStatus === 'confirmed'
      ? `status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP`
      : nextStatus === 'cancelled'
        ? `status = 'cancelled', cancellation_reason = ?, cancelled_by_type = 'admin', cancelled_at = CURRENT_TIMESTAMP`
        : `status = 'rejected', cancellation_reason = ?, cancelled_by_type = 'admin'`;
    await connection.execute(`UPDATE bookings SET ${fields} WHERE id = ?`, nextStatus === 'confirmed' ? [id] : [reason, id]);
    await connection.execute(
      `INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by_type, changed_by_admin_id, note)
       VALUES (?, ?, ?, 'admin', ?, ?)`, [id, current, nextStatus, adminId(req), reason]
    );
    await connection.commit();
    return success(res, { id: String(id), status: nextStatus }, message);
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

async function confirmBooking(req, res) { return transitionBooking(req, res, 'confirmed', 'Booking confirmed.'); }
async function rejectBooking(req, res) { return transitionBooking(req, res, 'rejected', 'Booking rejected.', req.body.reason || null); }
async function cancelBooking(req, res) { return transitionBooking(req, res, 'cancelled', 'Booking cancelled.', req.body.reason || null); }

async function completeBooking(req, res) {
  const id = positiveId(req.params.bookingId, 'bookingId');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT id, status, assigned_driver_id, estimated_total, final_total, estimated_distance_km,
        actual_distance_km, payment_status
       FROM bookings WHERE id = ? FOR UPDATE`, [id]
    );
    const booking = rows[0];
    if (!booking) { const error = new Error('Booking not found.'); error.statusCode = 404; throw error; }
    if (!['driver_notified', 'driver_assigned', 'on_the_way', 'arrived', 'trip_started'].includes(booking.status)) {
      const error = new Error(`Cannot complete booking while status is ${booking.status}.`); error.statusCode = 409; throw error;
    }
    if (booking.payment_status !== 'paid') {
      const error = new Error('Record full payment before completing this ride.'); error.statusCode = 409; throw error;
    }
    const distance = booking.actual_distance_km ?? booking.estimated_distance_km;
    await connection.execute(
      `UPDATE bookings SET status = 'completed', completed_at = CURRENT_TIMESTAMP,
        final_total = COALESCE(final_total, estimated_total), actual_distance_km = COALESCE(actual_distance_km, ?)
       WHERE id = ?`, [distance == null ? null : Number(distance), id]
    );
    await connection.execute(
      `INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by_type, changed_by_admin_id, note)
       VALUES (?, ?, 'completed', 'admin', ?, 'Trip completed by admin without odometer')`, [id, booking.status, adminId(req)]
    );
    if (booking.assigned_driver_id) {
      const [[activeRows]] = await connection.execute(
        `SELECT COUNT(*) AS total FROM bookings
         WHERE assigned_driver_id = ? AND id <> ? AND status IN ('driver_notified', 'driver_accepted', 'driver_assigned', 'on_the_way', 'arrived', 'trip_started')`,
        [booking.assigned_driver_id, id]
      );
      if (Number(activeRows.total) === 0) {
        await connection.execute(
          `UPDATE drivers SET online_status = 'online', availability_status = 'available', total_completed_trips = total_completed_trips + 1 WHERE id = ?`,
          [booking.assigned_driver_id]
        );
      } else {
        await connection.execute('UPDATE drivers SET total_completed_trips = total_completed_trips + 1 WHERE id = ?', [booking.assigned_driver_id]);
      }
    }
    await connection.commit();
    return success(res, { id: String(id), status: 'completed' }, 'Trip completed.');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function assignDriver(req, res) {
  const bookingId = positiveId(req.params.bookingId, 'bookingId');
  const driverId = positiveId(req.body.driver_id, 'driver_id');
  const vehicleId = req.body.vehicle_id == null || req.body.vehicle_id === '' ? null : positiveId(req.body.vehicle_id, 'vehicle_id');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [bookings] = await connection.execute('SELECT id, status, estimated_total FROM bookings WHERE id = ? FOR UPDATE', [bookingId]);
    if (!bookings[0]) { const error = new Error('Booking not found.'); error.statusCode = 404; throw error; }
    if (!['confirmed', 'driver_notified'].includes(bookings[0].status)) { const error = new Error('Booking must be confirmed before assigning a driver.'); error.statusCode = 409; throw error; }
    const [drivers] = await connection.execute("SELECT id FROM drivers WHERE id = ? AND is_active = 1 AND verification_status = 'approved' LIMIT 1", [driverId]);
    if (!drivers[0]) { const error = new Error('Approved driver not found.'); error.statusCode = 404; throw error; }
    if (vehicleId) {
      const [vehicles] = await connection.execute('SELECT id FROM vehicles WHERE id = ? AND is_active = 1 LIMIT 1', [vehicleId]);
      if (!vehicles[0]) { const error = new Error('Active vehicle not found.'); error.statusCode = 404; throw error; }
    }
    const expiresIn = Math.min(3600, Math.max(30, Number(req.body.expires_in_seconds) || 120));
    await connection.execute(
      `INSERT INTO booking_driver_offers (booking_id, driver_id, vehicle_id, offered_fare, status, sent_by_admin_id, expires_at)
       VALUES (?, ?, ?, ?, 'sent', ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? SECOND))`,
      [bookingId, driverId, vehicleId, bookings[0].estimated_total, adminId(req), expiresIn]
    );
    await connection.execute(
      `UPDATE bookings SET assigned_driver_id = ?, assigned_vehicle_id = ?, status = 'driver_notified' WHERE id = ?`, [driverId, vehicleId, bookingId]
    );
    await connection.execute(
      `INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by_type, changed_by_admin_id, note)
       VALUES (?, ?, 'driver_notified', 'admin', ?, 'Driver offer sent')`, [bookingId, bookings[0].status, adminId(req)]
    );
    await connection.commit();
    return success(res, { booking_id: String(bookingId), driver_id: String(driverId), vehicle_id: vehicleId == null ? null : String(vehicleId), status: 'driver_notified', expires_in_seconds: expiresIn }, 'Driver offer sent.', 201);
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

function pagination(req, defaultPerPage = 20) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const perPage = Math.min(500, Math.max(1, Number.parseInt(req.query.per_page, 10) || defaultPerPage));
  return { page, perPage, offset: (page - 1) * perPage };
}

async function listCustomers(req, res) {
  const { page, perPage, offset } = pagination(req);
  const search = String(req.query.q || '').trim();
  const where = search ? 'WHERE c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?' : '';
  const searchParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];
  const [[countRows], [rows]] = await Promise.all([
    pool.execute(`SELECT COUNT(*) AS total FROM customers c ${where}`, searchParams),
    pool.execute(
      `SELECT c.id, c.name, c.email, c.phone, c.city, c.app_status, c.is_active, c.last_login_at, c.created_at
       FROM customers c ${where} ORDER BY c.created_at DESC, c.id DESC LIMIT ? OFFSET ?`, [...searchParams, perPage, offset]
    )
  ]);
  const total = Number(countRows[0].total);
  return success(res, rows.map((row) => ({ ...row, id: String(row.id), app_status_label: row.app_status })), 'Customers fetched.', 200, { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) });
}

async function getCustomer(req, res) {
  const id = positiveId(req.params.customerId, 'customerId');
  const [rows] = await pool.execute(
    `SELECT id, name, email, phone, alternate_phone, address, city, preferred_language,
      referral_code, app_status, is_active, last_login_at, created_at
     FROM customers WHERE id = ? LIMIT 1`, [id]
  );
  if (!rows[0]) { const error = new Error('Customer not found.'); error.statusCode = 404; throw error; }
  return success(res, { ...rows[0], id: String(rows[0].id), app_status_label: rows[0].app_status });
}

async function listDrivers(req, res) {
  const { page, perPage, offset } = pagination(req);
  const search = String(req.query.q || '').trim();
  const where = search ? 'WHERE d.is_active = 1 AND (d.name LIKE ? OR d.phone LIKE ? OR d.email LIKE ?)' : 'WHERE d.is_active = 1';
  const searchParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];
  const [[countRows], [rows]] = await Promise.all([
    pool.execute(`SELECT COUNT(*) AS total FROM drivers d ${where}`, searchParams),
    pool.execute(
      `SELECT d.id, d.name, d.phone, d.email, d.license_no, d.license_expiry_date, d.address,
        d.profile_image_url, d.verification_status, d.online_status, d.availability_status,
        d.is_active, COALESCE((SELECT AVG(r.customer_rating) FROM trip_ratings r WHERE r.driver_id = d.id), d.rating_avg, 0) AS rating_avg,
        d.total_completed_trips, d.created_at
       FROM drivers d ${where} ORDER BY d.created_at DESC, d.id DESC LIMIT ? OFFSET ?`, [...searchParams, perPage, offset]
    )
  ]);
  const total = Number(countRows[0].total);
  return success(res, rows.map((row) => ({ ...row, id: String(row.id), rating_avg: Number(row.rating_avg) })), 'Drivers fetched.', 200, { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) });
}

async function getDriver(req, res) {
  const id = positiveId(req.params.driverId, 'driverId');
  const [rows] = await pool.execute(
    `SELECT id, name, phone, email, license_no, license_expiry_date, address, profile_image_url,
      verification_status, online_status, availability_status, current_latitude, current_longitude,
      last_location_at,
      COALESCE((SELECT AVG(r.customer_rating) FROM trip_ratings r WHERE r.driver_id = drivers.id), drivers.rating_avg, 0) AS rating_avg,
      total_completed_trips, is_active, created_at
         FROM drivers WHERE id = ? LIMIT 1`, [id]
  );
  if (!rows[0]) { const error = new Error('Driver not found.'); error.statusCode = 404; throw error; }
  return success(res, { ...rows[0], id: String(rows[0].id), rating_avg: Number(rows[0].rating_avg) });
}

async function saveDriver(req, res) {
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').trim();
  if (!name || !phone) { const error = new Error('name and phone are required.'); error.statusCode = 422; throw error; }
  const id = req.params.driverId ? positiveId(req.params.driverId, 'driverId') : null;
  const fields = ['name', 'phone', 'email', 'license_no', 'license_expiry_date', 'address', 'verification_status', 'availability_status', 'online_status', 'is_active'];
  const allowed = {
    verification_status: ['pending', 'approved', 'rejected', 'blocked'],
    availability_status: ['available', 'on_trip', 'on_leave', 'suspended'],
    online_status: ['offline', 'online', 'busy'],
  };
  for (const field of Object.keys(allowed)) {
    if (req.body[field] != null && !allowed[field].includes(req.body[field])) {
      const error = new Error(`Invalid ${field}.`); error.statusCode = 422; throw error;
    }
  }
  const values = [name, phone, req.body.email ? String(req.body.email).trim().toLowerCase() : null, req.body.license_no || null, req.body.license_expiry_date || null, req.body.address || null, req.body.verification_status || 'pending', req.body.availability_status || 'available', req.body.online_status || 'offline', req.body.is_active === false ? 0 : 1];
  try {
    if (id) {
      const updates = fields.map((field) => `${field} = ?`);
      if (req.body.password) { updates.push('password_hash = ?'); values.push(await bcrypt.hash(String(req.body.password), 12)); }
      values.push(id);
      const [result] = await pool.execute(`UPDATE drivers SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
      if (!result.affectedRows) { const error = new Error('Driver not found.'); error.statusCode = 404; throw error; }
      return getDriver(req, res);
    }
    if (!req.body.password || String(req.body.password).length < 8) { const error = new Error('password must be at least 8 characters.'); error.statusCode = 422; throw error; }
    const [result] = await pool.execute(
      `INSERT INTO drivers (${fields.join(', ')}, password_hash) VALUES (${fields.map(() => '?').join(', ')}, ?)`,
      [...values, await bcrypt.hash(String(req.body.password), 12)],
    );
    req.params.driverId = result.insertId;
    return getDriver(req, res);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') { error.statusCode = 409; error.message = 'Driver phone or email already exists.'; }
    throw error;
  }
}

async function deleteDriver(req, res) {
  const id = positiveId(req.params.driverId, 'driverId');
  const [result] = await pool.execute('UPDATE drivers SET is_active = 0 WHERE id = ?', [id]);
  if (!result.affectedRows) { const error = new Error('Driver not found.'); error.statusCode = 404; throw error; }
  return success(res, {}, 'Driver deactivated.');
}

async function listVehicleCategories(req, res) {
  const [rows] = await pool.execute(
    `SELECT id, name, slug, seating_capacity, luggage_capacity, description, image_url,
      one_way_rate_per_km, round_trip_rate_per_km, driver_batta, minimum_km_per_day,
      display_order, is_active, created_at, updated_at
    FROM vehicle_categories WHERE is_active = 1 ORDER BY display_order, id`
  );
  return success(res, rows.map((row) => ({ ...row, id: String(row.id) })));
}

async function getVehicleCategory(req, res) {
  const id = positiveId(req.params.categoryId, 'categoryId');
  const [rows] = await pool.execute('SELECT * FROM vehicle_categories WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) { const error = new Error('Vehicle category not found.'); error.statusCode = 404; throw error; }
  return success(res, { ...rows[0], id: String(rows[0].id) });
}

async function saveVehicleCategory(req, res) {
  const fields = ['name', 'slug', 'seating_capacity', 'luggage_capacity', 'description', 'image_url', 'one_way_rate_per_km', 'round_trip_rate_per_km', 'driver_batta', 'minimum_km_per_day', 'display_order', 'is_active'];
  const values = fields.map((field) => req.body[field] ?? null);
  if (!req.body.name || !req.body.slug || req.body.seating_capacity == null) { const error = new Error('name, slug, and seating_capacity are required.'); error.statusCode = 422; throw error; }
  if (req.params.categoryId) {
    const id = positiveId(req.params.categoryId, 'categoryId');
    await pool.execute(`UPDATE vehicle_categories SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`, [...values, id]);
    return getVehicleCategory(req, res);
  }
  const [result] = await pool.execute(`INSERT INTO vehicle_categories (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`, values);
  return success(res, { id: String(result.insertId) }, 'Vehicle category created.', 201);
}

async function deleteVehicleCategory(req, res) {
  const id = positiveId(req.params.categoryId, 'categoryId');
  const [result] = await pool.execute('UPDATE vehicle_categories SET is_active = 0 WHERE id = ?', [id]);
  if (!result.affectedRows) { const error = new Error('Vehicle category not found.'); error.statusCode = 404; throw error; }
  return success(res, {}, 'Vehicle category deactivated.');
}

async function registerAdminDevice(req, res) {
  if (!req.body.platform || !req.body.fcm_token) { const error = new Error('platform and fcm_token are required.'); error.statusCode = 422; throw error; }
  const [result] = await pool.execute(
    `INSERT INTO app_devices (user_type, admin_user_id, platform, device_uuid, fcm_token, app_version, os_version, device_model, locale, last_seen_at)
     VALUES ('admin', ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE fcm_token = VALUES(fcm_token), app_version = VALUES(app_version), last_seen_at = CURRENT_TIMESTAMP`,
    [adminId(req), req.body.platform, req.body.device_uuid || null, req.body.fcm_token, req.body.app_version || null, req.body.os_version || null, req.body.device_model || null, req.body.locale || null]
  );
  return success(res, { id: String(result.insertId || 0) }, 'Device registered.', 201);
}

async function reports(req, res) {
  const period = ['day', 'week', 'month', 'year'].includes(String(req.query.period)) ? String(req.query.period) : 'day';
  const interval = { day: '1 DAY', week: '7 DAY', month: '1 MONTH', year: '1 YEAR' }[period];
  const [[bookingRows], [revenueRows], [statusRows]] = await Promise.all([
    pool.execute(`SELECT COUNT(*) AS total, SUM(status = 'completed') AS completed, SUM(status = 'cancelled') AS cancelled FROM bookings WHERE created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${interval})`),
    pool.execute(`SELECT COALESCE(SUM(COALESCE(final_total, estimated_total)), 0) AS revenue FROM bookings WHERE status = 'completed' AND created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${interval})`),
    pool.execute(`SELECT status, COUNT(*) AS count FROM bookings WHERE created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${interval}) GROUP BY status ORDER BY count DESC`)
  ]);
  return success(res, { period, total_bookings: Number(bookingRows[0]?.total || 0), completed_bookings: Number(bookingRows[0]?.completed || 0), cancelled_bookings: Number(bookingRows[0]?.cancelled || 0), revenue: Number(revenueRows[0]?.revenue || 0), by_status: statusRows });
}

async function listReviews(req, res) {
  const [rows] = await pool.execute(
    `SELECT r.id, r.booking_id, r.customer_id, r.driver_id, r.customer_rating, r.customer_review,
      r.created_at, c.name AS customer_name, d.name AS driver_name
     FROM trip_ratings r LEFT JOIN customers c ON c.id = r.customer_id LEFT JOIN drivers d ON d.id = r.driver_id
     ORDER BY r.created_at DESC LIMIT 500`
  );
  return success(res, rows.map((row) => ({ ...row, id: String(row.id), booking_id: String(row.booking_id) })));
}

async function listEnquiries(req, res) {
  const [rows] = await pool.execute('SELECT * FROM contact_enquiries ORDER BY created_at DESC LIMIT 500');
  return success(res, rows.map((row) => ({ ...row, id: String(row.id) })));
}

async function getEnquiry(req, res) {
  const id = positiveId(req.params.enquiryId, 'enquiryId');
  const [rows] = await pool.execute('SELECT * FROM contact_enquiries WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) { const error = new Error('Enquiry not found.'); error.statusCode = 404; throw error; }
  return success(res, { ...rows[0], id: String(rows[0].id) });
}

async function updateEnquiry(req, res) {
  const id = positiveId(req.params.enquiryId, 'enquiryId');
  const status = req.body.status == null ? null : String(req.body.status);
  if (status && !['new', 'in_progress', 'closed', 'spam'].includes(status)) { const error = new Error('Invalid enquiry status.'); error.statusCode = 422; throw error; }
  await pool.execute('UPDATE contact_enquiries SET status = COALESCE(?, status), admin_note = COALESCE(?, admin_note), assigned_admin_id = ? WHERE id = ?', [status, req.body.admin_note ?? null, adminId(req), id]);
  return getEnquiry(req, res);
}

async function listNotifications(req, res) {
  const [rows] = await pool.execute(
    `SELECT id, booking_id, recipient_type, customer_id, driver_id, admin_user_id, channel, title, body, delivery_status, created_at
     FROM notification_logs WHERE delivery_status <> 'cancelled' ORDER BY created_at DESC LIMIT 500`
  );
  return success(res, rows.map((row) => ({ ...row, id: String(row.id) })));
}

async function sendNotification(req, res) {
  const title = String(req.body.title || '').trim();
  const body = String(req.body.body || '').trim();
  const audience = String(req.body.audience || '').trim();
  const validAudiences = ['all_customers', 'all_drivers', 'customer', 'driver'];
  if (!title || title.length > 180 || !body || body.length > 2000 || !validAudiences.includes(audience)) {
    const error = new Error('title, body, and a valid audience are required.'); error.statusCode = 422; throw error;
  }
  const customerId = audience === 'customer' ? positiveId(req.body.customer_id, 'customer_id') : null;
  const driverId = audience === 'driver' ? positiveId(req.body.driver_id, 'driver_id') : null;
  const result = await deliverAdminNotification({ audience, customerId, driverId, title, body, senderAdminId: adminId(req) });
  if (!result.recipient_count) { const error = new Error('No active recipients found.'); error.statusCode = 422; throw error; }
  const label = audience === 'all_customers' ? 'customers' : audience === 'all_drivers' ? 'drivers' : 'recipient';
  return success(res, result, `Notification sent to ${result.recipient_count} ${label}.`);
}

async function deleteNotification(req, res) {
  const id = positiveId(req.params.notificationId, 'notificationId');
  const [result] = await pool.execute("UPDATE notification_logs SET delivery_status = 'cancelled' WHERE id = ?", [id]);
  if (!result.affectedRows) { const error = new Error('Notification not found.'); error.statusCode = 404; throw error; }
  return success(res, {}, 'Notification cancelled.');
}

async function listAdminUsers(req, res) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, u.phone, u.avatar_url, u.role_id, r.name AS role_name,
      u.is_active, u.last_login_at, u.created_at
     FROM admin_users u INNER JOIN admin_roles r ON r.id = u.role_id ORDER BY u.created_at DESC`
  );
  return success(res, rows.map((row) => ({ ...row, id: String(row.id), role_id: String(row.role_id) })));
}

async function getAdminUser(req, res) {
  const id = positiveId(req.params.adminUserId, 'adminUserId');
  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, u.phone, u.avatar_url, u.role_id, r.name AS role_name, u.is_active, u.last_login_at, u.created_at
     FROM admin_users u INNER JOIN admin_roles r ON r.id = u.role_id WHERE u.id = ? LIMIT 1`, [id]
  );
  if (!rows[0]) { const error = new Error('Admin user not found.'); error.statusCode = 404; throw error; }
  return success(res, { ...rows[0], id: String(rows[0].id), role_id: String(rows[0].role_id) });
}

async function uploadMedia(req, res) {
  if (!req.file) { const error = new Error('An image file is required.'); error.statusCode = 422; throw error; }
  const publicPath = `/api/v1/public/media/admin/${req.file.filename}`;
  return success(res, {
    url: publicPath,
    path: publicPath,
    filename: req.file.filename,
    original_name: req.file.originalname,
    mime_type: req.file.mimetype,
    size: req.file.size,
  }, 'Image uploaded.', 201);
}

async function uploadDriverPhoto(req, res) {
  const id = positiveId(req.params.driverId, 'driverId');
  if (!req.file) { const error = new Error('An image file is required.'); error.statusCode = 422; throw error; }
  const publicPath = `/api/v1/public/media/admin/${req.file.filename}`;
  const [result] = await pool.execute('UPDATE drivers SET profile_image_url = ? WHERE id = ?', [publicPath, id]);
  if (!result.affectedRows) { const error = new Error('Driver not found.'); error.statusCode = 404; throw error; }
  return success(res, { photo_url: publicPath, profile_image_url: publicPath }, 'Driver photo updated.');
}

async function saveAdminUser(req, res) {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const roleId = Number(req.body.role_id);
  if (!name || !email || !Number.isInteger(roleId) || roleId < 1) {
    const error = new Error('name, email, and role_id are required.'); error.statusCode = 422; throw error;
  }
  const id = req.params.adminUserId ? positiveId(req.params.adminUserId, 'adminUserId') : null;
  const password = req.body.password == null ? '' : String(req.body.password);
  if (!id && password.length < 8) { const error = new Error('password must be at least 8 characters.'); error.statusCode = 422; throw error; }
  try {
    if (id) {
      const fields = ['name = ?', 'email = ?', 'phone = ?', 'role_id = ?'];
      const values = [name, email, req.body.phone || null, roleId];
      if (password) { fields.push('password_hash = ?'); values.push(await bcrypt.hash(password, 12)); }
      if (req.body.is_active !== undefined) { fields.push('is_active = ?'); values.push(req.body.is_active ? 1 : 0); }
      values.push(id);
      const [result] = await pool.execute(`UPDATE admin_users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
      if (!result.affectedRows) { const error = new Error('Admin user not found.'); error.statusCode = 404; throw error; }
      return getAdminUser(req, res);
    }
    const [result] = await pool.execute(
      'INSERT INTO admin_users (role_id, name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)',
      [roleId, name, email, req.body.phone || null, await bcrypt.hash(password, 12)],
    );
    req.params.adminUserId = result.insertId;
    return getAdminUser(req, res);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') { error.statusCode = 409; error.message = 'Admin email already exists.'; }
    throw error;
  }
}

async function activateAdminUser(req, res) {
  const id = positiveId(req.params.adminUserId, 'adminUserId');
  const [result] = await pool.execute('UPDATE admin_users SET is_active = 1 WHERE id = ?', [id]);
  if (!result.affectedRows) { const error = new Error('Admin user not found.'); error.statusCode = 404; throw error; }
  return getAdminUser(req, res);
}

async function deactivateAdminUser(req, res) {
  const id = positiveId(req.params.adminUserId, 'adminUserId');
  if (id === adminId(req)) { const error = new Error('You cannot deactivate your own account.'); error.statusCode = 409; throw error; }
  const [result] = await pool.execute('UPDATE admin_users SET is_active = 0 WHERE id = ?', [id]);
  if (!result.affectedRows) { const error = new Error('Admin user not found.'); error.statusCode = 404; throw error; }
  return getAdminUser(req, res);
}

async function listRemoteConfig(req, res) {
  const [rows] = await pool.execute(
    `SELECT id, config_key, app_type, platform, value_type, config_value, description, is_active, created_at, updated_at
     FROM remote_config_values ORDER BY config_key, app_type, platform`
  );
  return success(res, rows.map((row) => ({ ...row, id: String(row.id) })));
}

async function createRemoteConfig(req, res) {
  if (!req.body.config_key || !req.body.app_type || !req.body.platform || !req.body.value_type) { const error = new Error('config_key, app_type, platform, and value_type are required.'); error.statusCode = 422; throw error; }
  const [result] = await pool.execute(
    `INSERT INTO remote_config_values (config_key, app_type, platform, value_type, config_value, description, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [req.body.config_key, req.body.app_type, req.body.platform, req.body.value_type, req.body.config_value ?? null, req.body.description ?? null, req.body.is_active === false ? 0 : 1]
  );
  return success(res, { id: String(result.insertId) }, 'Remote config created.', 201);
}

async function updateRemoteConfig(req, res) {
  const id = positiveId(req.params.configId, 'configId');
  const [result] = await pool.execute(
    `UPDATE remote_config_values SET config_value = COALESCE(?, config_value), is_active = COALESCE(?, is_active), description = COALESCE(?, description)
     WHERE id = ?`, [req.body.config_value ?? null, req.body.is_active == null ? null : (req.body.is_active ? 1 : 0), req.body.description ?? null, id]
  );
  if (!result.affectedRows) { const error = new Error('Remote config not found.'); error.statusCode = 404; throw error; }
  const [rows] = await pool.execute('SELECT * FROM remote_config_values WHERE id = ? LIMIT 1', [id]);
  return success(res, { ...rows[0], id: String(rows[0].id) }, 'Remote config updated.');
}

async function listAuditLogs(req, res) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const perPage = Math.min(500, Math.max(1, Number.parseInt(req.query.per_page, 10) || 25));
  const search = String(req.query.q || '').trim();
  const conditions = [];
  const params = [];
  if (search) {
    conditions.push('(a.action LIKE ? OR a.entity_type LIKE ? OR u.name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (req.query.action) {
    conditions.push('a.action = ?');
    params.push(String(req.query.action));
  }
  if (req.query.entity_type) {
    conditions.push('a.entity_type = ?');
    params.push(String(req.query.entity_type));
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [[countRows], [rows]] = await Promise.all([
    pool.execute(`SELECT COUNT(*) AS total FROM audit_logs a LEFT JOIN admin_users u ON u.id = a.admin_user_id ${where}`, params),
    pool.execute(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.old_values, a.new_values, a.ip_address, a.user_agent, a.created_at, u.name AS admin_name
       FROM audit_logs a LEFT JOIN admin_users u ON u.id = a.admin_user_id ${where}
       ORDER BY a.created_at DESC, a.id DESC LIMIT ? OFFSET ?`, [...params, perPage, (page - 1) * perPage]
    )
  ]);
  const total = Number(countRows[0]?.total || 0);
  return success(res, rows.map((row) => ({ ...row, id: String(row.id), entity_id: row.entity_id == null ? null : String(row.entity_id) })), 'Audit logs fetched.', 200, { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) });
}

async function getAuditLog(req, res) {
  const id = positiveId(req.params.auditLogId, 'auditLogId');
  const [rows] = await pool.execute(
    `SELECT a.*, u.name AS admin_name, u.email AS admin_email
     FROM audit_logs a LEFT JOIN admin_users u ON u.id = a.admin_user_id WHERE a.id = ? LIMIT 1`, [id]
  );
  if (!rows[0]) { const error = new Error('Audit log not found.'); error.statusCode = 404; throw error; }
  return success(res, { ...rows[0], id: String(rows[0].id) });
}

async function listAdminRoles(req, res) {
  const [rows] = await pool.execute('SELECT id, name, description, is_active, created_at, updated_at FROM admin_roles ORDER BY name');
  return success(res, rows.map((row) => ({ ...row, id: String(row.id) })));
}

async function getAdminRole(req, res) {
  const id = positiveId(req.params.roleId, 'roleId');
  const [rows] = await pool.execute('SELECT id, name, description, is_active, created_at, updated_at FROM admin_roles WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) { const error = new Error('Admin role not found.'); error.statusCode = 404; throw error; }
  const [permissions] = await pool.execute(
    `SELECT p.id, p.module, p.action, p.label FROM role_permissions rp INNER JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = ? ORDER BY p.module, p.action`, [id]
  );
  return success(res, { ...rows[0], id: String(rows[0].id), permissions: permissions.map((row) => ({ ...row, id: String(row.id) })) });
}

async function saveAdminRole(req, res) {
  const name = String(req.body.name || '').trim();
  const description = req.body.description == null ? null : String(req.body.description).trim() || null;
  const permissionIds = Array.isArray(req.body.permission_ids)
    ? [...new Set(req.body.permission_ids.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))]
    : [];
  if (name.length < 2) { const error = new Error('Role name must be at least 2 characters.'); error.statusCode = 422; throw error; }
  const id = req.params.roleId ? positiveId(req.params.roleId, 'roleId') : null;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    let isSuperAdmin = false;
    if (id) {
      const [existingRows] = await connection.execute('SELECT id, name FROM admin_roles WHERE id = ? LIMIT 1 FOR UPDATE', [id]);
      if (!existingRows[0]) { const error = new Error('Admin role not found.'); error.statusCode = 404; throw error; }
      isSuperAdmin = existingRows[0].name === 'Super Admin';
      if (isSuperAdmin) {
        await connection.execute('UPDATE admin_roles SET description = ? WHERE id = ?', [description, id]);
      } else {
        const [clashes] = await connection.execute('SELECT id FROM admin_roles WHERE name = ? AND id <> ? LIMIT 1', [name, id]);
        if (clashes[0]) { const error = new Error('A role with this name already exists.'); error.statusCode = 409; throw error; }
        await connection.execute('UPDATE admin_roles SET name = ?, description = ? WHERE id = ?', [name, description, id]);
      }
    } else {
      const [clashes] = await connection.execute('SELECT id FROM admin_roles WHERE name = ? LIMIT 1', [name]);
      if (clashes[0]) { const error = new Error('A role with this name already exists.'); error.statusCode = 409; throw error; }
      const [result] = await connection.execute('INSERT INTO admin_roles (name, description, is_active) VALUES (?, ?, 1)', [name, description]);
      req.params.roleId = result.insertId;
    }
    const roleId = id || Number(req.params.roleId);
    if (isSuperAdmin) {
      await connection.execute('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
      const [allPermissions] = await connection.execute('SELECT id FROM permissions');
      permissionIds.splice(0, permissionIds.length, ...allPermissions.map((row) => Number(row.id)));
    } else {
      const [validPermissions] = await connection.execute(
        `SELECT id FROM permissions WHERE id IN (${permissionIds.length ? permissionIds.map(() => '?').join(',') : 'NULL'})`, permissionIds
      );
      if (validPermissions.length !== permissionIds.length) { const error = new Error('One or more permissions are invalid.'); error.statusCode = 422; throw error; }
      await connection.execute('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
    }
    if (permissionIds.length) {
      await connection.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ${permissionIds.map(() => '(?, ?)').join(', ')}`,
        permissionIds.flatMap((permissionId) => [roleId, permissionId])
      );
    }
    await connection.commit();
    return getAdminRole({ ...req, params: { ...req.params, roleId } }, res);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function activateAdminRole(req, res) {
  const id = positiveId(req.params.roleId, 'roleId');
  const [result] = await pool.execute('UPDATE admin_roles SET is_active = 1 WHERE id = ?', [id]);
  if (!result.affectedRows) { const error = new Error('Admin role not found.'); error.statusCode = 404; throw error; }
  return getAdminRole(req, res);
}

async function deactivateAdminRole(req, res) {
  const id = positiveId(req.params.roleId, 'roleId');
  const [roles] = await pool.execute('SELECT name FROM admin_roles WHERE id = ? LIMIT 1', [id]);
  if (!roles[0]) { const error = new Error('Admin role not found.'); error.statusCode = 404; throw error; }
  if (roles[0].name === 'Super Admin') { const error = new Error('Cannot deactivate the Super Admin role.'); error.statusCode = 403; throw error; }
  const [assigned] = await pool.execute('SELECT COUNT(*) AS total FROM admin_users WHERE role_id = ? AND is_active = 1', [id]);
  if (Number(assigned[0].total) > 0) { const error = new Error('Reassign or deactivate staff on this role before deactivating it.'); error.statusCode = 403; throw error; }
  await pool.execute('UPDATE admin_roles SET is_active = 0 WHERE id = ?', [id]);
  return getAdminRole(req, res);
}
async function listPermissions(req, res) {
  const [rows] = await pool.execute('SELECT id, module, action, label FROM permissions ORDER BY module, action');
  return success(res, rows.map((row) => ({ ...row, id: String(row.id) })));
}

async function listRoutes(req, res) {
  const [rows] = await pool.execute(
    `SELECT r.*, pc.name AS pickup_city_name, dc.name AS drop_city_name
     FROM routes r INNER JOIN cities pc ON pc.id = r.pickup_city_id INNER JOIN cities dc ON dc.id = r.drop_city_id
     WHERE r.is_active = 1
     ORDER BY r.is_popular DESC, r.title LIMIT 500`
  );
  return success(res, rows.map((row) => ({ ...row, id: String(row.id), pickup_city_id: String(row.pickup_city_id), drop_city_id: String(row.drop_city_id), corridor: `${row.pickup_city_name} -> ${row.drop_city_name}` })));
}

async function listAdminCities(req, res) {
  const [rows] = await pool.execute(
    'SELECT id, name, slug, state, is_airport, is_active FROM cities WHERE is_active = 1 ORDER BY name, id',
  );
  return success(res, rows.map((row) => ({ ...row, id: String(row.id) })));
}

async function getRoute(req, res) {
  const id = positiveId(req.params.routeId, 'routeId');
  const [rows] = await pool.execute(
    `SELECT r.*, pc.name AS pickup_city_name, dc.name AS drop_city_name
     FROM routes r INNER JOIN cities pc ON pc.id = r.pickup_city_id INNER JOIN cities dc ON dc.id = r.drop_city_id WHERE r.id = ? LIMIT 1`, [id]
  );
  if (!rows[0]) { const error = new Error('Route not found.'); error.statusCode = 404; throw error; }
  return success(res, { ...rows[0], id: String(rows[0].id), pickup_city_id: String(rows[0].pickup_city_id), drop_city_id: String(rows[0].drop_city_id), corridor: `${rows[0].pickup_city_name} -> ${rows[0].drop_city_name}` });
}

async function saveRoute(req, res) {
  const fields = ['pickup_city_id', 'drop_city_id', 'slug', 'title', 'distance_km', 'duration_minutes', 'route_map_embed_url', 'content', 'faq_content', 'image_url', 'amount', 'is_popular', 'is_active'];
  if (!req.body.pickup_city_id || !req.body.drop_city_id || !req.body.slug || !req.body.title || req.body.distance_km == null) { const error = new Error('pickup_city_id, drop_city_id, slug, title, and distance_km are required.'); error.statusCode = 422; throw error; }
  if (Number(req.body.pickup_city_id) === Number(req.body.drop_city_id)) { const error = new Error('Pickup and drop cities must be different.'); error.statusCode = 422; throw error; }
  const values = fields.map((field) => req.body[field] ?? null);
  if (req.params.routeId) {
    const id = positiveId(req.params.routeId, 'routeId');
    await pool.execute(`UPDATE routes SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`, [...values, id]);
    return getRoute(req, res);
  }
  const [result] = await pool.execute(`INSERT INTO routes (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`, values);
  return success(res, { id: String(result.insertId) }, 'Route created.', 201);
}

async function deleteRoute(req, res) {
  const id = positiveId(req.params.routeId, 'routeId');
  const [result] = await pool.execute('UPDATE routes SET is_active = 0 WHERE id = ?', [id]);
  if (!result.affectedRows) { const error = new Error('Route not found.'); error.statusCode = 404; throw error; }
  return success(res, {}, 'Route deactivated.');
}

async function listTariffs(req, res) {
  const [rows] = await pool.execute(
    `SELECT t.*, c.name AS category_name, r.title AS route_title
     FROM tariff_plans t INNER JOIN vehicle_categories c ON c.id = t.vehicle_category_id LEFT JOIN routes r ON r.id = t.route_id
     WHERE t.is_active = 1
     ORDER BY t.id DESC LIMIT 500`
  );
  return success(res, rows.map((row) => ({ ...row, id: String(row.id), vehicle_category_id: String(row.vehicle_category_id), route_id: row.route_id == null ? null : String(row.route_id), route_label: row.route_title || 'All routes', trip_type_label: row.trip_type })));
}

async function getTariff(req, res) {
  const id = positiveId(req.params.tariffId, 'tariffId');
  const [rows] = await pool.execute(
    `SELECT t.*, c.name AS category_name, r.title AS route_title FROM tariff_plans t INNER JOIN vehicle_categories c ON c.id = t.vehicle_category_id LEFT JOIN routes r ON r.id = t.route_id WHERE t.id = ? LIMIT 1`, [id]
  );
  if (!rows[0]) { const error = new Error('Tariff not found.'); error.statusCode = 404; throw error; }
  return success(res, { ...rows[0], id: String(rows[0].id), vehicle_category_id: String(rows[0].vehicle_category_id), route_id: rows[0].route_id == null ? null : String(rows[0].route_id), category_name: rows[0].category_name, route_label: rows[0].route_title || 'All routes' });
}

async function saveTariff(req, res) {
  const fields = ['vehicle_category_id', 'trip_type', 'route_id', 'rate_per_km', 'base_fare', 'driver_batta', 'minimum_km', 'minimum_fare', 'extra_km_rate', 'extra_hour_rate', 'night_charge', 'waiting_charge_per_hour', 'permit_charge', 'toll_included', 'parking_included', 'gst_percentage', 'effective_from', 'effective_to', 'is_active'];
  if (!req.body.vehicle_category_id || !req.body.trip_type || req.body.rate_per_km == null || !req.body.effective_from) { const error = new Error('vehicle_category_id, trip_type, rate_per_km, and effective_from are required.'); error.statusCode = 422; throw error; }
  const defaults = {
    route_id: null,
    base_fare: 0,
    driver_batta: 0,
    minimum_km: 0,
    minimum_fare: 0,
    extra_km_rate: 0,
    extra_hour_rate: 0,
    night_charge: 0,
    waiting_charge_per_hour: 0,
    permit_charge: 0,
    toll_included: 0,
    parking_included: 0,
    gst_percentage: 0,
    effective_to: null,
    is_active: 1
  };
  const values = fields.map((field) => req.body[field] ?? defaults[field] ?? null);
  if (req.params.tariffId) {
    const id = positiveId(req.params.tariffId, 'tariffId');
    await pool.execute(`UPDATE tariff_plans SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`, [...values, id]);
    return getTariff(req, res);
  }
  const [result] = await pool.execute(`INSERT INTO tariff_plans (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`, values);
  return success(res, { id: String(result.insertId) }, 'Tariff created.', 201);
}

async function deleteTariff(req, res) {
  const id = positiveId(req.params.tariffId, 'tariffId');
  const [result] = await pool.execute('UPDATE tariff_plans SET is_active = 0 WHERE id = ?', [id]);
  if (!result.affectedRows) { const error = new Error('Tariff not found.'); error.statusCode = 404; throw error; }
  return success(res, {}, 'Tariff deactivated.');
}

async function listFaqs(req, res) {
  const [rows] = await pool.execute('SELECT * FROM faqs WHERE is_active = 1 ORDER BY display_order, id LIMIT 500');
  return success(res, rows.map((row) => ({ ...row, id: String(row.id), route_id: row.route_id == null ? null : String(row.route_id), cms_page_id: row.cms_page_id == null ? null : String(row.cms_page_id) })));
}

async function getFaq(req, res) {
  const id = positiveId(req.params.faqId, 'faqId');
  const [rows] = await pool.execute('SELECT * FROM faqs WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) { const error = new Error('FAQ not found.'); error.statusCode = 404; throw error; }
  return success(res, { ...rows[0], id: String(rows[0].id) });
}

async function saveFaq(req, res) {
  const fields = ['question', 'answer', 'category', 'related_type', 'route_id', 'cms_page_id', 'display_order', 'is_active'];
  if (!req.body.question || !req.body.answer) { const error = new Error('question and answer are required.'); error.statusCode = 422; throw error; }
  const values = fields.map((field) => req.body[field] ?? null);
  if (req.params.faqId) {
    const id = positiveId(req.params.faqId, 'faqId');
    await pool.execute(`UPDATE faqs SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`, [...values, id]);
    return getFaq(req, res);
  }
  const [result] = await pool.execute(`INSERT INTO faqs (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`, values);
  return success(res, { id: String(result.insertId) }, 'FAQ created.', 201);
}

async function deleteFaq(req, res) {
  const id = positiveId(req.params.faqId, 'faqId');
  const [result] = await pool.execute('UPDATE faqs SET is_active = 0 WHERE id = ?', [id]);
  if (!result.affectedRows) { const error = new Error('FAQ not found.'); error.statusCode = 404; throw error; }
  return success(res, {}, 'FAQ deactivated.');
}

async function listGallery(req, res) {
  const [groups] = await pool.execute('SELECT * FROM gallery_groups ORDER BY display_order, id');
  const [images] = await pool.execute('SELECT * FROM gallery_images ORDER BY display_order, id');
  return success(res, groups.map((group) => ({ ...group, id: String(group.id), images: images.filter((image) => Number(image.group_id) === Number(group.id)).map((image) => ({ ...image, id: String(image.id), group_id: String(image.group_id) })) })));
}

async function createGalleryGroup(req, res) {
  if (!req.body.title) { const error = new Error('title is required.'); error.statusCode = 422; throw error; }
  const slug = String(req.body.slug || req.body.title).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const [result] = await pool.execute('INSERT INTO gallery_groups (slug, title, group_type, display_order, is_active) VALUES (?, ?, ?, ?, ?)', [slug, req.body.title, req.body.group_type || 'custom', req.body.display_order || 0, req.body.is_active === false ? 0 : 1]);
  return success(res, { id: String(result.insertId) }, 'Gallery group created.', 201);
}

async function createGalleryImage(req, res) {
  if (!req.body.group_id || !req.body.image_url) { const error = new Error('group_id and image_url are required.'); error.statusCode = 422; throw error; }
  const [result] = await pool.execute('INSERT INTO gallery_images (group_id, image_url, caption, display_order, is_active) VALUES (?, ?, ?, ?, ?)', [req.body.group_id, req.body.image_url, req.body.caption || null, req.body.display_order || 0, req.body.is_active === false ? 0 : 1]);
  return success(res, { id: String(result.insertId) }, 'Gallery image added.', 201);
}

async function updateGalleryImage(req, res) {
  const id = positiveId(req.params.imageId, 'imageId');
  const [result] = await pool.execute('UPDATE gallery_images SET caption = COALESCE(?, caption), display_order = COALESCE(?, display_order), is_active = COALESCE(?, is_active) WHERE id = ?', [req.body.caption ?? null, req.body.display_order ?? null, req.body.is_active == null ? null : (req.body.is_active ? 1 : 0), id]);
  if (!result.affectedRows) { const error = new Error('Gallery image not found.'); error.statusCode = 404; throw error; }
  return success(res, { id: String(id) }, 'Gallery image updated.');
}

async function deleteGalleryRecord(req, res) {
  const id = positiveId(req.params.recordId, 'recordId');
  const table = req.params.recordType === 'group' ? 'gallery_groups' : 'gallery_images';
  const [result] = await pool.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
  if (!result.affectedRows) { const error = new Error('Gallery record not found.'); error.statusCode = 404; throw error; }
  return success(res, {}, 'Gallery record deleted.');
}

async function listReviewsAdmin(req, res) {
  const [rows] = await pool.execute('SELECT * FROM testimonials ORDER BY created_at DESC LIMIT 500');
  return success(res, rows.map((row) => ({ ...row, id: String(row.id), booking_id: row.booking_id == null ? null : String(row.booking_id), customer_id: row.customer_id == null ? null : String(row.customer_id) })));
}

async function saveReview(req, res) {
  if (!req.body.customer_name || !req.body.review || req.body.rating == null) { const error = new Error('customer_name, rating, and review are required.'); error.statusCode = 422; throw error; }
  const fields = ['customer_name', 'customer_phone', 'rating', 'review', 'admin_reply', 'approval_status', 'is_featured'];
  const values = fields.map((field) => req.body[field] ?? (field === 'approval_status' ? 'approved' : field === 'is_featured' ? 0 : null));
  if (req.params.reviewId) {
    const id = positiveId(req.params.reviewId, 'reviewId');
    await pool.execute(`UPDATE testimonials SET ${fields.map((field) => `${field} = ?`).join(', ')}, approved_by_admin_id = ?, approved_at = IF(? = 'approved', CURRENT_TIMESTAMP, approved_at) WHERE id = ?`, [...values, adminId(req), values[5], id]);
    return getReview(req, res);
  }
  const [result] = await pool.execute(`INSERT INTO testimonials (${fields.join(', ')}, approved_by_admin_id, approved_at) VALUES (${fields.map(() => '?').join(', ')}, ?, IF(? = 'approved', CURRENT_TIMESTAMP, NULL))`, [...values, adminId(req), values[5]]);
  return success(res, { id: String(result.insertId) }, 'Review created.', 201);
}

async function getReview(req, res) {
  const id = positiveId(req.params.reviewId, 'reviewId');
  const [rows] = await pool.execute('SELECT * FROM testimonials WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) { const error = new Error('Review not found.'); error.statusCode = 404; throw error; }
  return success(res, { ...rows[0], id: String(rows[0].id) });
}

async function moderateReview(req, res) {
  const id = positiveId(req.params.reviewId, 'reviewId');
  const status = req.params.action === 'approve' ? 'approved' : 'rejected';
  const [result] = await pool.execute(`UPDATE testimonials SET approval_status = ?, approved_by_admin_id = ?, approved_at = IF(? = 'approved', CURRENT_TIMESTAMP, approved_at) WHERE id = ?`, [status, adminId(req), status, id]);
  if (!result.affectedRows) { const error = new Error('Review not found.'); error.statusCode = 404; throw error; }
  return getReview(req, res);
}

async function deleteReview(req, res) {
  const id = positiveId(req.params.reviewId, 'reviewId');
  const [result] = await pool.execute('DELETE FROM testimonials WHERE id = ?', [id]);
  if (!result.affectedRows) { const error = new Error('Review not found.'); error.statusCode = 404; throw error; }
  return success(res, {}, 'Review deleted.');
}

async function listVehicles(req, res) {
  const [rows] = await pool.execute(
    `SELECT v.*, c.name AS category_name FROM vehicles v INNER JOIN vehicle_categories c ON c.id = v.category_id
     WHERE v.is_active = 1
     ORDER BY v.id DESC LIMIT 500`
  );
  return success(res, rows.map((row) => ({ ...row, id: String(row.id), category_id: String(row.category_id) })));
}

async function getVehicle(req, res) {
  const id = positiveId(req.params.vehicleId, 'vehicleId');
  const [rows] = await pool.execute(
    `SELECT v.*, c.name AS category_name FROM vehicles v INNER JOIN vehicle_categories c ON c.id = v.category_id WHERE v.id = ? LIMIT 1`, [id]
  );
  if (!rows[0]) { const error = new Error('Vehicle not found.'); error.statusCode = 404; throw error; }
  return success(res, { ...rows[0], id: String(rows[0].id), category_id: String(rows[0].category_id) });
}

async function saveVehicle(req, res) {
  const fields = ['category_id', 'vehicle_name', 'registration_no', 'model_name', 'color', 'fuel_type', 'rc_expiry_date', 'insurance_expiry_date', 'permit_expiry_date', 'pollution_expiry_date', 'is_active'];
  if (!req.body.category_id || !req.body.vehicle_name) { const error = new Error('category_id and vehicle_name are required.'); error.statusCode = 422; throw error; }
  const values = fields.map((field) => req.body[field] ?? null);
  if (req.params.vehicleId) {
    const id = positiveId(req.params.vehicleId, 'vehicleId');
    await pool.execute(`UPDATE vehicles SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`, [...values, id]);
    return getVehicle(req, res);
  }
  const [result] = await pool.execute(`INSERT INTO vehicles (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`, values);
  return success(res, { id: String(result.insertId) }, 'Vehicle created.', 201);
}

async function deleteVehicle(req, res) {
  const id = positiveId(req.params.vehicleId, 'vehicleId');
  const [result] = await pool.execute('UPDATE vehicles SET is_active = 0 WHERE id = ?', [id]);
  if (!result.affectedRows) { const error = new Error('Vehicle not found.'); error.statusCode = 404; throw error; }
  return success(res, {}, 'Vehicle deactivated.');
}

async function listAssignments(req, res) {
  const [rows] = await pool.execute(
    `SELECT a.id, a.driver_id, a.vehicle_id, a.assigned_from, a.assigned_to, a.is_current,
      d.name AS driver_name, d.phone AS driver_phone, v.vehicle_name, v.registration_no
     FROM driver_vehicle_assignments a INNER JOIN drivers d ON d.id = a.driver_id INNER JOIN vehicles v ON v.id = a.vehicle_id
     ORDER BY a.is_current DESC, a.assigned_from DESC LIMIT 500`
  );
  return success(res, rows.map((row) => ({ ...row, id: String(row.id), driver_id: String(row.driver_id), vehicle_id: String(row.vehicle_id), status_label: row.is_current ? 'Current' : 'Ended' })));
}

async function createAssignment(req, res) {
  const driverIdValue = positiveId(req.body.driver_id, 'driver_id');
  const vehicleId = positiveId(req.body.vehicle_id, 'vehicle_id');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [drivers] = await connection.execute('SELECT id FROM drivers WHERE id = ? AND is_active = 1 LIMIT 1', [driverIdValue]);
    const [vehicles] = await connection.execute('SELECT id FROM vehicles WHERE id = ? AND is_active = 1 LIMIT 1', [vehicleId]);
    if (!drivers[0] || !vehicles[0]) { const error = new Error('Active driver and vehicle are required.'); error.statusCode = 404; throw error; }
    await connection.execute('UPDATE driver_vehicle_assignments SET is_current = 0, assigned_to = CURRENT_TIMESTAMP WHERE (driver_id = ? OR vehicle_id = ?) AND is_current = 1', [driverIdValue, vehicleId]);
    const [result] = await connection.execute('INSERT INTO driver_vehicle_assignments (driver_id, vehicle_id, assigned_from, is_current) VALUES (?, ?, ?, 1)', [driverIdValue, vehicleId, req.body.assigned_from || new Date()]);
    await connection.commit();
    return success(res, { id: String(result.insertId), driver_id: String(driverIdValue), vehicle_id: String(vehicleId), is_current: true }, 'Driver assigned to vehicle.', 201);
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

async function endAssignment(req, res) {
  const id = positiveId(req.params.assignmentId, 'assignmentId');
  const [result] = await pool.execute('UPDATE driver_vehicle_assignments SET is_current = 0, assigned_to = CURRENT_TIMESTAMP WHERE id = ? AND is_current = 1', [id]);
  if (!result.affectedRows) { const error = new Error('Current assignment not found.'); error.statusCode = 404; throw error; }
  return success(res, { id: String(id), is_current: false }, 'Assignment ended.');
}

module.exports = { profile, updateProfile, uploadProfilePhoto, removeProfilePhoto, settings, updateSetting, listSeoMeta, saveSeoMeta, dashboard, liveTracking, listBookings, getBooking, getBookingPayment, recordBookingPayment, setBookingPaymentStatus, applyBookingFare, downloadBookingInvoice, sendBookingInvoiceWhatsApp, resendBookingInvoice, sendFeedbackLink, confirmBooking, rejectBooking, cancelBooking, completeBooking, assignDriver, listCustomers, getCustomer, listDrivers, getDriver, saveDriver, deleteDriver, listVehicleCategories, getVehicleCategory, saveVehicleCategory, deleteVehicleCategory, registerAdminDevice, reports, listReviews, listEnquiries, getEnquiry, updateEnquiry, listNotifications, sendNotification, deleteNotification, listAdminUsers, getAdminUser, saveAdminUser, activateAdminUser, deactivateAdminUser, uploadMedia, uploadDriverPhoto, listRemoteConfig, createRemoteConfig, updateRemoteConfig, listAuditLogs, getAuditLog, getStderrLog, deleteStderrLog, listAdminRoles, getAdminRole, saveAdminRole, activateAdminRole, deactivateAdminRole, listPermissions, listRoutes, listAdminCities, getRoute, saveRoute, deleteRoute, listTariffs, getTariff, saveTariff, deleteTariff, listFaqs, getFaq, saveFaq, deleteFaq, listGallery, createGalleryGroup, createGalleryImage, updateGalleryImage, deleteGalleryRecord, listReviewsAdmin, saveReview, getReview, moderateReview, deleteReview, listVehicles, getVehicle, saveVehicle, deleteVehicle, listAssignments, createAssignment, endAssignment };