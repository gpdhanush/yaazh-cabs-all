const pool = require('../config/database');
const { success } = require('../utils/response');

function adminId(req) {
  return Number(req.user.sub);
}

function parseValue(value, type) {
  if (type === 'number') return Number(value);
  if (type === 'boolean') return value === true || value === 'true' || value === 1 || value === '1';
  if (type === 'json') return JSON.parse(value);
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
    `SELECT setting_key AS key, setting_value AS value, value_type AS type, group_name AS group_name
     FROM app_settings ORDER BY group_name, setting_key`
  );
  return success(res, rows.map((row) => ({ ...row, value: parseValue(row.value, row.type) })));
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

module.exports = { profile, updateProfile, settings, updateSetting, listBookings };