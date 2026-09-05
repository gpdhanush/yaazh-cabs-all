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
  const password = required(req.body.password, 'password');
  return success(res, await service.login(type, identifier, password, req), 'Login successful.');
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
  const email = required(req.body.email, 'email');
  const newPassword = req.body.new_password ?? req.body.password;
  await service.resetAdminPasswordByEmail(email, password(newPassword));
  return success(res, {}, 'Password reset successfully.');
}

module.exports = { registerCustomer, login, refresh, logout, logoutAll, changeAdminPassword, resetAdminPasswordByEmail };