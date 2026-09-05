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

module.exports = { profile, updateProfile, settings, updateSetting };