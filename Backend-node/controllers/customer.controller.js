const pool = require('../config/database');
const { success } = require('../utils/response');

function userId(req) { return Number(req.user.sub); }

function positiveId(value, field) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) { const error = new Error(`${field} must be a positive integer.`); error.statusCode = 422; throw error; }
  return id;
}

async function profile(req, res) {
  const [rows] = await pool.execute(
    `SELECT id, name, email, phone, alternate_phone, profile_image_url, address, city,
      preferred_language, referral_code, email_verified_at, phone_verified_at, created_at
     FROM customers WHERE id = ? AND is_active = 1 AND app_status = 'active' LIMIT 1`, [userId(req)]
  );
  if (!rows[0]) { const error = new Error('Customer not found.'); error.statusCode = 404; throw error; }
  return success(res, rows[0]);
}

async function updateProfile(req, res) {
  const fields = ['name', 'email', 'alternate_phone', 'address', 'city', 'preferred_language'];
  const values = [];
  const updates = [];
  for (const field of fields) {
    if (req.body[field] !== undefined) { updates.push(`${field} = ?`); values.push(req.body[field]); }
  }
  if (!updates.length) { const error = new Error('No supported profile fields supplied.'); error.statusCode = 422; throw error; }
  values.push(userId(req));
  await pool.execute(`UPDATE customers SET ${updates.join(', ')} WHERE id = ? AND is_active = 1`, values);
  return profile(req, res);
}

async function listSavedPlaces(req, res) {
  const [rows] = await pool.execute(
    `SELECT id, label, title, address, latitude, longitude, is_default, created_at, updated_at
     FROM customer_saved_places WHERE customer_id = ? ORDER BY is_default DESC, id`, [userId(req)]
  );
  return success(res, rows);
}

async function createSavedPlace(req, res) {
  if (!req.body.title || !req.body.address) { const error = new Error('title and address are required.'); error.statusCode = 422; throw error; }
  const [result] = await pool.execute(
    `INSERT INTO customer_saved_places (customer_id, label, title, address, latitude, longitude)
     VALUES (?, ?, ?, ?, ?, ?)`, [userId(req), req.body.label || 'other', req.body.title, req.body.address, req.body.latitude ?? null, req.body.longitude ?? null]
  );
  return success(res, { id: result.insertId }, 'Saved place created.', 201);
}

async function updateSavedPlace(req, res) {
  const id = positiveId(req.params.savedPlaceId, 'savedPlaceId');
  const fields = ['label', 'title', 'address', 'latitude', 'longitude'];
  const updates = [];
  const values = [];
  for (const field of fields) {
    if (req.body[field] !== undefined) { updates.push(`${field} = ?`); values.push(req.body[field]); }
  }
  if (!updates.length) { const error = new Error('No saved place fields supplied.'); error.statusCode = 422; throw error; }
  values.push(id, userId(req));
  const [result] = await pool.execute(
    `UPDATE customer_saved_places SET ${updates.join(', ')} WHERE id = ? AND customer_id = ?`, values
  );
  if (!result.affectedRows) { const error = new Error('Saved place not found.'); error.statusCode = 404; throw error; }
  return success(res, { id }, 'Saved place updated.');
}

async function deleteSavedPlace(req, res) {
  const id = positiveId(req.params.savedPlaceId, 'savedPlaceId');
  const [result] = await pool.execute('DELETE FROM customer_saved_places WHERE id = ? AND customer_id = ?', [id, userId(req)]);
  if (!result.affectedRows) { const error = new Error('Saved place not found.'); error.statusCode = 404; throw error; }
  return success(res, {}, 'Saved place deleted.');
}

async function listBookings(req, res) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.per_page, 10) || 20));
  const [rows] = await pool.execute(
    `SELECT id, booking_reference, trip_type, pickup_location, drop_location, pickup_at,
      estimated_total, final_total, payment_status, status, created_at
     FROM bookings WHERE customer_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`, [userId(req), limit, (page - 1) * limit]
  );
  return success(res, rows);
}

async function getBooking(req, res) {
  const id = positiveId(req.params.bookingId, 'bookingId');
  const [rows] = await pool.execute(
    `SELECT b.id, b.booking_reference, b.trip_type, b.customer_name, b.customer_phone,
      b.pickup_location, b.drop_location, b.pickup_at, b.return_at, b.passenger_count,
      b.estimated_distance_km, b.estimated_total, b.final_total, b.payment_status, b.status,
      v.name AS vehicle_category, d.name AS driver_name, d.phone AS driver_phone
     FROM bookings b INNER JOIN vehicle_categories v ON v.id = b.vehicle_category_id
     LEFT JOIN drivers d ON d.id = b.assigned_driver_id
     WHERE b.id = ? AND b.customer_id = ? LIMIT 1`, [id, userId(req)]
  );
  if (!rows[0]) { const error = new Error('Booking not found.'); error.statusCode = 404; throw error; }
  return success(res, rows[0]);
}

async function cancelBooking(req, res) {
  const id = positiveId(req.params.bookingId, 'bookingId');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT status FROM bookings WHERE id = ? AND customer_id = ? FOR UPDATE', [id, userId(req)]);
    if (!rows[0]) { const error = new Error('Booking not found.'); error.statusCode = 404; throw error; }
    if (!['pending', 'confirmed', 'driver_notified'].includes(rows[0].status)) { const error = new Error('Booking cannot be cancelled in its current status.'); error.statusCode = 409; throw error; }
    await connection.execute(`UPDATE bookings SET status = 'cancelled', cancellation_reason = ?, cancelled_by_type = 'customer', cancelled_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.body.reason || null, id]);
    await connection.execute(`INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by_type, changed_by_customer_id, note) VALUES (?, ?, 'cancelled', 'customer', ?, ?)`, [id, rows[0].status, userId(req), req.body.reason || null]);
    await connection.commit();
    return success(res, { id, status: 'cancelled' }, 'Booking cancelled.');
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

async function getInvoice(req, res) {
  const id = positiveId(req.params.bookingId, 'bookingId');
  const [rows] = await pool.execute(
    `SELECT i.id, i.invoice_number, i.invoice_date, i.subtotal, i.discount_amount,
      i.gst_amount, i.total_amount, i.amount_paid, i.balance_amount, i.currency, i.status, i.pdf_url
     FROM booking_invoices i INNER JOIN bookings b ON b.id = i.booking_id
     WHERE i.booking_id = ? AND b.customer_id = ? LIMIT 1`, [id, userId(req)]
  );
  if (!rows[0]) { const error = new Error('Invoice not found.'); error.statusCode = 404; throw error; }
  return success(res, rows[0]);
}

async function getLiveLocation(req, res) {
  const id = positiveId(req.params.bookingId, 'bookingId');
  const [bookings] = await pool.execute(
    'SELECT assigned_driver_id FROM bookings WHERE id = ? AND customer_id = ? LIMIT 1', [id, userId(req)]
  );
  if (!bookings[0]) { const error = new Error('Booking not found.'); error.statusCode = 404; throw error; }
  if (!bookings[0].assigned_driver_id) return success(res, null, 'No driver assigned yet.');
  const [rows] = await pool.execute(
    `SELECT latitude, longitude, heading, speed_kmph, accuracy_meters, battery_percentage, recorded_at
     FROM driver_locations WHERE driver_id = ? AND (booking_id = ? OR booking_id IS NULL)
     ORDER BY recorded_at DESC LIMIT 1`, [bookings[0].assigned_driver_id, id]
  );
  return success(res, rows[0] || null);
}

async function rateTrip(req, res) {
  const id = positiveId(req.params.bookingId, 'bookingId');
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) { const error = new Error('rating must be an integer from 1 to 5.'); error.statusCode = 422; throw error; }
  const [bookings] = await pool.execute(
    `SELECT id, status, assigned_driver_id FROM bookings WHERE id = ? AND customer_id = ? LIMIT 1`, [id, userId(req)]
  );
  if (!bookings[0]) { const error = new Error('Booking not found.'); error.statusCode = 404; throw error; }
  if (bookings[0].status !== 'completed') { const error = new Error('Trip is not completed.'); error.statusCode = 409; throw error; }
  await pool.execute(
    `INSERT INTO trip_ratings (booking_id, customer_id, driver_id, customer_rating, customer_review)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE customer_rating = VALUES(customer_rating), customer_review = VALUES(customer_review)`,
    [id, userId(req), bookings[0].assigned_driver_id || null, rating, req.body.review || null]
  );
  return success(res, { booking_id: id, rating, review: req.body.review || null }, 'Rating submitted.', 201);
}

async function notifications(req, res) {
  const [rows] = await pool.execute(
    `SELECT id, booking_id, title, body, data_payload, delivery_status, created_at, read_at
     FROM notification_logs WHERE recipient_type = 'customer' AND customer_id = ?
     ORDER BY created_at DESC LIMIT 100`, [userId(req)]
  );
  return success(res, rows.map((row) => ({ ...row, data_payload: row.data_payload ? JSON.parse(row.data_payload) : null })));
}

async function registerDevice(req, res) {
  if (!req.body.platform || !req.body.fcm_token) { const error = new Error('platform and fcm_token are required.'); error.statusCode = 422; throw error; }
  const [result] = await pool.execute(
    `INSERT INTO app_devices (user_type, customer_id, platform, device_uuid, fcm_token, app_version, os_version, device_model, locale, last_seen_at)
     VALUES ('customer', ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE fcm_token = VALUES(fcm_token), app_version = VALUES(app_version), last_seen_at = CURRENT_TIMESTAMP`,
    [userId(req), req.body.platform, req.body.device_uuid || null, req.body.fcm_token, req.body.app_version || null,
      req.body.os_version || null, req.body.device_model || null, req.body.locale || null]
  );
  return success(res, { id: result.insertId }, 'Device registered.', 201);
}

async function deleteDevice(req, res) {
  const id = positiveId(req.params.deviceId, 'deviceId');
  const [result] = await pool.execute('DELETE FROM app_devices WHERE id = ? AND customer_id = ?', [id, userId(req)]);
  if (!result.affectedRows) { const error = new Error('Device not found.'); error.statusCode = 404; throw error; }
  return success(res, {}, 'Device deleted.');
}

async function listSupport(req, res) {
  const [rows] = await pool.execute(
    `SELECT id, ticket_reference, booking_id, subject, priority, status, created_at, updated_at
     FROM support_tickets WHERE customer_id = ? ORDER BY created_at DESC`, [userId(req)]
  );
  return success(res, rows);
}

async function createSupport(req, res) {
  if (!req.body.subject || !req.body.message) { const error = new Error('subject and message are required.'); error.statusCode = 422; throw error; }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const reference = `SUP${Date.now().toString(36).toUpperCase()}`.slice(0, 40);
    const [ticket] = await connection.execute(
      `INSERT INTO support_tickets (ticket_reference, booking_id, customer_id, raised_by_type, subject, priority)
       VALUES (?, ?, ?, 'customer', ?, ?)`,
      [reference, req.body.booking_id ? positiveId(req.body.booking_id, 'booking_id') : null, userId(req), req.body.subject, req.body.priority || 'medium']
    );
    await connection.execute(
      `INSERT INTO support_ticket_messages (ticket_id, sender_type, customer_id, message) VALUES (?, 'customer', ?, ?)`,
      [ticket.insertId, userId(req), req.body.message]
    );
    await connection.commit();
    return success(res, { id: ticket.insertId, ticket_reference: reference }, 'Support ticket created.', 201);
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

async function getSupport(req, res) {
  const id = positiveId(req.params.supportId, 'supportId');
  const [tickets] = await pool.execute('SELECT * FROM support_tickets WHERE id = ? AND customer_id = ? LIMIT 1', [id, userId(req)]);
  if (!tickets[0]) { const error = new Error('Support ticket not found.'); error.statusCode = 404; throw error; }
  const [messages] = await pool.execute(
    `SELECT id, sender_type, message, attachment_url, created_at FROM support_ticket_messages WHERE ticket_id = ? ORDER BY created_at`, [id]
  );
  return success(res, { ...tickets[0], messages });
}

async function addSupportMessage(req, res) {
  const id = positiveId(req.params.supportId, 'supportId');
  if (!req.body.message) { const error = new Error('message is required.'); error.statusCode = 422; throw error; }
  const [tickets] = await pool.execute('SELECT id FROM support_tickets WHERE id = ? AND customer_id = ? LIMIT 1', [id, userId(req)]);
  if (!tickets[0]) { const error = new Error('Support ticket not found.'); error.statusCode = 404; throw error; }
  const [result] = await pool.execute(
    `INSERT INTO support_ticket_messages (ticket_id, sender_type, customer_id, message) VALUES (?, 'customer', ?, ?)`,
    [id, userId(req), req.body.message]
  );
  return success(res, { id: result.insertId }, 'Message added.', 201);
}

module.exports = { profile, updateProfile, listSavedPlaces, createSavedPlace, updateSavedPlace, deleteSavedPlace, listBookings, getBooking, cancelBooking, getInvoice, getLiveLocation, rateTrip, notifications, registerDevice, deleteDevice, listSupport, createSupport, getSupport, addSupportMessage };