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

module.exports = { profile, updateProfile, listSavedPlaces, createSavedPlace, deleteSavedPlace, listBookings, getBooking, cancelBooking };