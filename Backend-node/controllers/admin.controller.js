const pool = require('../config/database');
const { success } = require('../utils/response');
const bcrypt = require('bcryptjs');
const { createInvoicePdf } = require('../utils/invoice-pdf');
const { sendBookingInvoice } = require('../utils/mailer');

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
    pool.execute("SELECT COUNT(*) AS active_drivers FROM drivers WHERE is_active = 1 AND verification_status = 'approved' AND online_status <> 'offline'"),
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

async function invoiceData(bookingId) {
  const [bookings] = await pool.execute(
    `SELECT id, booking_reference, customer_name, customer_phone, customer_email,
      pickup_location, drop_location, pickup_at, estimated_total, final_total
     FROM bookings WHERE id = ? LIMIT 1`, [bookingId],
  );
  if (!bookings[0]) { const error = new Error('Booking not found.'); error.statusCode = 404; throw error; }
  const [invoices] = await pool.execute('SELECT * FROM booking_invoices WHERE booking_id = ? LIMIT 1', [bookingId]);
  return { booking: bookings[0], invoice: invoices[0] || null };
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
  await sendBookingInvoice({ to: email, name: data.booking.customer_name, bookingReference: data.booking.booking_reference, pdf });
  return success(res, { email, booking_reference: data.booking.booking_reference }, 'Invoice sent.');
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
        d.is_active, d.rating_avg, d.total_completed_trips, d.created_at
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
      last_location_at, rating_avg, total_completed_trips, is_active, created_at
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
  const values = fields.map((field) => req.body[field] ?? null);
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

module.exports = { profile, updateProfile, settings, updateSetting, dashboard, listBookings, getBooking, downloadBookingInvoice, resendBookingInvoice, confirmBooking, rejectBooking, cancelBooking, assignDriver, listCustomers, getCustomer, listDrivers, getDriver, saveDriver, deleteDriver, listVehicleCategories, getVehicleCategory, saveVehicleCategory, deleteVehicleCategory, registerAdminDevice, reports, listReviews, listEnquiries, getEnquiry, updateEnquiry, listNotifications, deleteNotification, listAdminUsers, getAdminUser, saveAdminUser, activateAdminUser, deactivateAdminUser, uploadMedia, uploadDriverPhoto, listRemoteConfig, createRemoteConfig, updateRemoteConfig, listAuditLogs, getAuditLog, listAdminRoles, getAdminRole, listPermissions, listRoutes, listAdminCities, getRoute, saveRoute, deleteRoute, listTariffs, getTariff, saveTariff, deleteTariff, listFaqs, getFaq, saveFaq, deleteFaq, listGallery, createGalleryGroup, createGalleryImage, updateGalleryImage, deleteGalleryRecord, listReviewsAdmin, saveReview, getReview, moderateReview, deleteReview, listVehicles, getVehicle, saveVehicle, deleteVehicle, listAssignments, createAssignment, endAssignment };