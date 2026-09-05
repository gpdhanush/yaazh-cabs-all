const service = require('../services/auth.service');
const repository = require('../repositories/auth.repository');
const { sha256 } = require('../utils/crypto');
const { success } = require('../utils/response');

function required(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    const error = new Error(`${field} is required.`);
    error.statusCode = 422;
    throw error;
  }
  return value.trim();
}

async function registerCustomer(req, res) {
  const name = required(req.body.name, 'name');
  const phone = required(req.body.phone, 'phone');
  const password = required(req.body.password, 'password');
  if (password.length < 8) { const error = new Error('Password must be at least 8 characters.'); error.statusCode = 422; throw error; }
  return success(res, await service.registerCustomer({ name, phone, password, email: req.body.email }, req), 'Customer registered.', 201);
}

async function login(req, res) {
  const type = req.params.type;
  const identifier = required(req.body[type === 'admin' ? 'email' : 'phone'], type === 'admin' ? 'email' : 'phone');
  const normalizedIdentifier = type === 'admin' ? identifier.toLowerCase() : identifier;
  const password = required(req.body.password, 'password');
  return success(res, await service.login(type, normalizedIdentifier, password, req), 'Login successful.');
}

async function refresh(req, res) {
  return success(res, await service.refresh(req.params.type, req.body.refresh_token, req), 'Token refreshed.');
}

async function logout(req, res) {
  if (req.body.refresh_token) {
    await repository.revokeSessionByHash(sha256(req.body.refresh_token), req.params.type);
  }
  return success(res, {}, 'Logged out.');
}

async function logoutAll(req, res) {
  await repository.revokeAllSessions(req.user.typ, Number(req.user.sub));
  return success(res, {}, 'All sessions logged out.');
}

function password(value, field = 'new_password') {
  const result = required(value, field);
  if (result.length < 8) { const error = new Error(`${field} must be at least 8 characters.`); error.statusCode = 422; throw error; }
  return result;
}

async function changeAdminPassword(req, res) {
  const newPassword = req.body.new_password ?? req.body.password;
  await service.resetAdminPassword(Number(req.user.sub), password(newPassword));
  return success(res, {}, 'Password changed successfully.');
}

async function resetAdminPasswordByEmail(req, res) {
  const email = required(req.body.email, 'email').toLowerCase();
  await service.requestAdminPasswordReset(email, process.env.ADMIN_APP_URL || 'http://localhost:4200');
  return success(res, {}, 'If that admin email exists, a reset link has been sent.');
}

async function completeAdminPasswordReset(req, res) {
  const token = required(req.body.token, 'token');
  await service.resetAdminPasswordByToken(token, password(req.body.new_password ?? req.body.password));
  return success(res, {}, 'Password reset successfully.');
}

async function createAdminUserPublic(req, res) {
  const bootstrapKey = req.get('x-admin-bootstrap-key');
  if (!process.env.ADMIN_BOOTSTRAP_KEY || bootstrapKey !== process.env.ADMIN_BOOTSTRAP_KEY) {
    const error = new Error('Admin bootstrap key is required.'); error.statusCode = 401; throw error;
  }
  const name = required(req.body.name, 'name');
  const email = required(req.body.email, 'email').toLowerCase();
  const passwordValue = password(req.body.password);
  const roleId = Number(req.body.role_id || 1);
  if (!Number.isInteger(roleId) || roleId < 1) { const error = new Error('role_id must be a positive integer.'); error.statusCode = 422; throw error; }
  const user = await service.createAdminUser({ name, email, phone: req.body.phone || null, password: passwordValue, roleId });
  return success(res, { id: String(user.id), name: user.name, email: user.email, phone: user.phone, role_id: String(roleId) }, 'Admin user created.', 201);
}

module.exports = { registerCustomer, login, refresh, logout, logoutAll, changeAdminPassword, resetAdminPasswordByEmail, completeAdminPasswordReset, createAdminUserPublic };