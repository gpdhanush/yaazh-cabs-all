const pool = require('../config/database');

const userQueries = {
  customer: {
    find: 'SELECT id, name, email, phone, password_hash, app_status, is_active FROM customers WHERE phone = ? LIMIT 1',
    byId: 'SELECT id, name, email, phone, app_status, is_active FROM customers WHERE id = ? LIMIT 1',
    insert: 'INSERT INTO customers (name, email, phone, password_hash, phone_verified_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
    updateLogin: 'UPDATE customers SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?'
  },
  driver: {
    find: 'SELECT id, name, email, phone, password_hash, verification_status, is_active FROM drivers WHERE phone = ? LIMIT 1',
    byId: 'SELECT id, name, email, phone, verification_status, is_active FROM drivers WHERE id = ? LIMIT 1',
    updateLogin: 'UPDATE drivers SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?'
  },
  admin: {
    find: `SELECT u.id, u.name, u.email, u.phone, u.password_hash, u.is_active,
      r.name AS role_name FROM admin_users u INNER JOIN admin_roles r ON r.id = u.role_id
      WHERE u.email = ? LIMIT 1`,
    byId: `SELECT u.id, u.name, u.email, u.phone, u.is_active, r.name AS role_name
      FROM admin_users u INNER JOIN admin_roles r ON r.id = u.role_id WHERE u.id = ? LIMIT 1`,
    updateLogin: 'UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?'
  }
};

async function findUser(type, identifier) {
  const [rows] = await pool.execute(userQueries[type].find, [identifier]);
  return rows[0] || null;
}

async function findUserById(type, id) {
  const [rows] = await pool.execute(userQueries[type].byId, [id]);
  return rows[0] || null;
}

async function createCustomer({ name, email, phone, passwordHash }) {
  const [result] = await pool.execute(userQueries.customer.insert, [name, email || null, phone, passwordHash]);
  return findUserById('customer', result.insertId);
}

async function updateLastLogin(type, id) {
  await pool.execute(userQueries[type].updateLogin, [id]);
}

async function createSession({ type, userId, refreshHash, expiresAt, ipAddress, userAgent }) {
  const columns = { customer: 'customer_id', driver: 'driver_id', admin: 'admin_user_id' };
  const [result] = await pool.execute(
    `INSERT INTO auth_sessions (user_type, ${columns[type]}, refresh_token_hash, ip_address, user_agent, expires_at, last_used_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [type, userId, refreshHash, ipAddress || null, userAgent || null, expiresAt]
  );
  return result.insertId;
}

async function findSession(refreshHash, type) {
  const columns = { customer: 'customer_id', driver: 'driver_id', admin: 'admin_user_id' };
  const [rows] = await pool.execute(
    `SELECT id, ${columns[type]} AS user_id, expires_at, revoked_at FROM auth_sessions
     WHERE refresh_token_hash = ? AND user_type = ? LIMIT 1`,
    [refreshHash, type]
  );
  return rows[0] || null;
}

async function findAccessSession(id, type, userId) {
  const columns = { customer: 'customer_id', driver: 'driver_id', admin: 'admin_user_id' };
  const [rows] = await pool.execute(
    `SELECT id, expires_at, revoked_at FROM auth_sessions
     WHERE id = ? AND user_type = ? AND ${columns[type]} = ? LIMIT 1`, [id, type, userId]
  );
  return rows[0] || null;
}

async function revokeSession(id) {
  await pool.execute('UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = ? AND revoked_at IS NULL', [id]);
}

async function revokeSessionByHash(refreshHash, type) {
  const columns = { customer: 'customer_id', driver: 'driver_id', admin: 'admin_user_id' };
  await pool.execute(
    `UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP
     WHERE refresh_token_hash = ? AND user_type = ? AND revoked_at IS NULL`,
    [refreshHash, type]
  );
}

async function revokeAllSessions(type, userId) {
  const columns = { customer: 'customer_id', driver: 'driver_id', admin: 'admin_user_id' };
  await pool.execute(`UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_type = ? AND ${columns[type]} = ? AND revoked_at IS NULL`, [type, userId]);
}

async function loadAdminPermissions(userId) {
  const [rows] = await pool.execute(
    `SELECT CONCAT(p.module, '.', p.action) AS permission
     FROM admin_users u INNER JOIN role_permissions rp ON rp.role_id = u.role_id
     INNER JOIN permissions p ON p.id = rp.permission_id WHERE u.id = ?`, [userId]
  );
  return rows.map((row) => row.permission);
}

async function updateAdminPassword(userId, passwordHash) {
  return updatePassword('admin', userId, passwordHash);
}

async function createAdminUser({ name, email, phone, passwordHash, roleId }) {
  const [result] = await pool.execute(
    `INSERT INTO admin_users (role_id, name, email, phone, password_hash)
     VALUES (?, ?, ?, ?, ?)`,
    [roleId, name, email, phone || null, passwordHash],
  );
  return findUserById('admin', result.insertId);
}

async function findAdminByEmail(email) {
  const [rows] = await pool.execute('SELECT id FROM admin_users WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}

async function updatePassword(type, userId, passwordHash) {
  const table = { customer: 'customers', driver: 'drivers', admin: 'admin_users' }[type];
  if (!table) throw new Error(`Unsupported user type: ${type}`);
  const [result] = await pool.execute(
    `UPDATE ${table} SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_active = 1`,
    [passwordHash, userId]
  );
  return result.affectedRows > 0;
}

module.exports = { findUser, findUserById, createCustomer, createAdminUser, findAdminByEmail, updateLastLogin, createSession, findSession, findAccessSession, revokeSession, revokeSessionByHash, revokeAllSessions, loadAdminPermissions, updateAdminPassword, updatePassword };