const pool = require('../config/database');
const { success } = require('../utils/response');

function driverId(req) {
  return Number(req.user.sub);
}

function positiveId(value, field) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    const error = new Error(`${field} must be a positive integer.`);
    error.statusCode = 422;
    throw error;
  }
  return id;
}

async function profile(req, res) {
  const [rows] = await pool.execute(
    `SELECT id, name, email, phone, profile_image_url, license_no, license_expiry_date,
      address, online_status, availability_status, current_latitude, current_longitude,
      last_location_at, rating_avg, total_completed_trips, verification_status
     FROM drivers WHERE id = ? AND is_active = 1 LIMIT 1`, [driverId(req)]
  );
  if (!rows[0]) {
    const error = new Error('Driver not found.');
    error.statusCode = 404;
    throw error;
  }
  return success(res, { ...rows[0], id: String(rows[0].id), rating_avg: Number(rows[0].rating_avg) });
}

async function updateProfile(req, res) {
  const fields = ['name', 'email', 'profile_image_url', 'address'];
  const updates = [];
  const values = [];
  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }
  if (!updates.length) {
    const error = new Error('No supported profile fields supplied.');
    error.statusCode = 422;
    throw error;
  }
  values.push(driverId(req));
  await pool.execute(`UPDATE drivers SET ${updates.join(', ')} WHERE id = ? AND is_active = 1`, values);
  return profile(req, res);
}

async function status(req, res) {
  if (req.body.online_status !== undefined) {
    const onlineStatus = String(req.body.online_status);
    if (!['offline', 'online', 'busy'].includes(onlineStatus)) {
      const error = new Error('online_status must be offline, online, or busy.');
      error.statusCode = 422;
      throw error;
    }
    await pool.execute('UPDATE drivers SET online_status = ? WHERE id = ? AND is_active = 1', [onlineStatus, driverId(req)]);
  }
  if (req.body.availability_status !== undefined) {
    const availabilityStatus = String(req.body.availability_status);
    if (!['available', 'on_trip', 'on_leave', 'suspended'].includes(availabilityStatus)) {
      const error = new Error('Invalid availability_status.');
      error.statusCode = 422;
      throw error;
    }
    await pool.execute('UPDATE drivers SET availability_status = ? WHERE id = ? AND is_active = 1', [availabilityStatus, driverId(req)]);
  }
  return profile(req, res);
}

async function listOffers(req, res) {
  const [rows] = await pool.execute(
    `SELECT o.id, o.booking_id, o.vehicle_id, o.offered_fare, o.offer_type, o.status,
      o.sent_at, o.expires_at, b.booking_reference, b.trip_type, b.pickup_location,
      b.drop_location, b.pickup_at, b.customer_name, b.customer_phone
     FROM booking_driver_offers o INNER JOIN bookings b ON b.id = o.booking_id
     WHERE o.driver_id = ? ORDER BY o.created_at DESC LIMIT 100`, [driverId(req)]
  );
  return success(res, rows.map((row) => ({ ...row, id: String(row.id), booking_id: String(row.booking_id), vehicle_id: row.vehicle_id == null ? null : String(row.vehicle_id) })));
}

async function getOffer(req, res) {
  const offerId = positiveId(req.params.offerId, 'offerId');
  const [rows] = await pool.execute(
    `SELECT o.*, b.booking_reference, b.trip_type, b.pickup_location, b.drop_location,
      b.pickup_at, b.return_at, b.customer_name, b.customer_phone, b.passenger_count
     FROM booking_driver_offers o INNER JOIN bookings b ON b.id = o.booking_id
     WHERE o.id = ? AND o.driver_id = ? LIMIT 1`, [offerId, driverId(req)]
  );
  if (!rows[0]) {
    const error = new Error('Offer not found.');
    error.statusCode = 404;
    throw error;
  }
  return success(res, { ...rows[0], id: String(rows[0].id), booking_id: String(rows[0].booking_id) });
}

async function respondToOffer(req, res, accepted) {
  const offerId = positiveId(req.params.offerId, 'offerId');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [offers] = await connection.execute(
      `SELECT id, booking_id, status FROM booking_driver_offers
       WHERE id = ? AND driver_id = ? FOR UPDATE`, [offerId, driverId(req)]
    );
    if (!offers[0]) {
      const error = new Error('Offer not found.');
      error.statusCode = 404;
      throw error;
    }
    if (!['sent', 'seen'].includes(offers[0].status)) {
      const error = new Error('Offer is no longer available.');
      error.statusCode = 409;
      throw error;
    }
    const nextOfferStatus = accepted ? 'accepted' : 'rejected';
    const nextBookingStatus = accepted ? 'driver_accepted' : 'driver_rejected';
    await connection.execute(
      `UPDATE booking_driver_offers SET status = ?, rejection_reason = ?, responded_at = CURRENT_TIMESTAMP
       WHERE id = ?`, [nextOfferStatus, accepted ? null : (req.body.reason || null), offerId]
    );
    await connection.execute('UPDATE bookings SET status = ? WHERE id = ? AND assigned_driver_id = ?', [nextBookingStatus, offers[0].booking_id, driverId(req)]);
    await connection.execute(
      `INSERT INTO booking_status_history
       (booking_id, old_status, new_status, changed_by_type, changed_by_driver_id, note)
       VALUES (?, ?, ?, 'driver', ?, ?)`,
      [offers[0].booking_id, 'driver_notified', nextBookingStatus, driverId(req), accepted ? 'Driver accepted offer' : (req.body.reason || 'Driver rejected offer')]
    );
    await connection.execute(
      `INSERT INTO trip_events (booking_id, driver_id, event_type, event_note, created_by_type)
       VALUES (?, ?, ?, ?, 'driver')`,
      [offers[0].booking_id, driverId(req), accepted ? 'driver_accepted' : 'driver_rejected', req.body.reason || null]
    );
    await connection.commit();
    return success(res, { offer_id: String(offerId), booking_id: String(offers[0].booking_id), status: nextOfferStatus }, accepted ? 'Offer accepted.' : 'Offer rejected.');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function acceptOffer(req, res) { return respondToOffer(req, res, true); }
async function rejectOffer(req, res) { return respondToOffer(req, res, false); }

async function listTrips(req, res) {
  const [rows] = await pool.execute(
    `SELECT b.id, b.booking_reference, b.status, b.trip_type, b.customer_name, b.customer_phone,
      b.pickup_location, b.drop_location, b.pickup_at, b.return_at, b.estimated_total,
      b.final_total, b.payment_status, b.created_at
     FROM bookings b WHERE b.assigned_driver_id = ?
     ORDER BY b.pickup_at DESC, b.id DESC LIMIT 100`, [driverId(req)]
  );
  return success(res, rows.map((row) => ({ ...row, id: String(row.id) })));
}

async function getTrip(req, res) {
  const bookingId = positiveId(req.params.bookingId, 'bookingId');
  const [rows] = await pool.execute(
    `SELECT b.*, v.name AS vehicle_category_name
     FROM bookings b INNER JOIN vehicle_categories v ON v.id = b.vehicle_category_id
     WHERE b.id = ? AND b.assigned_driver_id = ? LIMIT 1`, [bookingId, driverId(req)]
  );
  if (!rows[0]) {
    const error = new Error('Trip not found.');
    error.statusCode = 404;
    throw error;
  }
  const [events] = await pool.execute(
    `SELECT event_type, event_note, latitude, longitude, created_at
     FROM trip_events WHERE booking_id = ? AND driver_id = ? ORDER BY created_at`, [bookingId, driverId(req)]
  );
  return success(res, { ...rows[0], id: String(rows[0].id), vehicle_category: rows[0].vehicle_category_name, events });
}

async function updateLocation(req, res) {
  const latitude = Number(req.body.latitude);
  const longitude = Number(req.body.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    const error = new Error('Valid latitude and longitude are required.');
    error.statusCode = 422;
    throw error;
  }
  const bookingId = req.body.booking_id == null ? null : positiveId(req.body.booking_id, 'booking_id');
  await pool.execute(
    `INSERT INTO driver_locations
      (driver_id, booking_id, latitude, longitude, heading, speed_kmph, accuracy_meters, battery_percentage, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [driverId(req), bookingId, latitude, longitude, req.body.heading ?? null, req.body.speed_kmph ?? null, req.body.accuracy_meters ?? null, req.body.battery_percentage ?? null]
  );
  await pool.execute(
    `UPDATE drivers SET current_latitude = ?, current_longitude = ?, last_location_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [latitude, longitude, driverId(req)]
  );
  return success(res, { latitude, longitude, recorded_at: new Date().toISOString() }, 'Location updated.');
}

module.exports = { profile, updateProfile, status, listOffers, getOffer, acceptOffer, rejectOffer, listTrips, getTrip, updateLocation };
