const bcrypt = require('bcryptjs');
const argon2 = require('argon2');
const repository = require('../repositories/auth.repository');
const { randomToken, sha256 } = require('../utils/crypto');
const { signAccessToken } = require('../utils/jwt');

const TYPES = ['customer', 'driver', 'admin'];

function publicUser(user, type) {
  const result = { id: String(user.id), name: user.name, email: user.email, phone: user.phone, type };
  if (type === 'driver') result.verification_status = user.verification_status;
  if (type === 'admin') result.role_name = user.role_name;
  return result;
}

function passwordHashType(hash) {
  if (hash && hash.startsWith('$2')) return 'bcrypt';
  if (hash && hash.startsWith('$argon2')) return 'argon2';
  return null;
}

function ensurePasswordHashSupported(hash) {
  if (!passwordHashType(hash)) {
    throw Object.assign(new Error('Stored password requires migration to bcrypt before this account can log in.'), { statusCode: 503 });
  }
}

async function verifyPassword(password, hash) {
  const type = passwordHashType(hash);
  const valid = type === 'argon2'
    ? await argon2.verify(hash, password)
    : await bcrypt.compare(password, hash);

  return { valid, type };
}

async function issueTokens(type, user, request) {
  const refreshToken = randomToken();
  const refreshDays = Number(process.env.JWT_REFRESH_DAYS || 30);
  const expiresAt = new Date(Date.now() + refreshDays * 86400000);
  const sessionId = await repository.createSession({
    type, userId: user.id, refreshHash: sha256(refreshToken), expiresAt,
    ipAddress: request.ip, userAgent: request.get('user-agent')
  });
  return {
    access_token: signAccessToken({ sub: String(user.id), typ: type, sid: String(sessionId) }),
    refresh_token: refreshToken,
    token_type: 'Bearer',
    user: publicUser(user, type)
  };
}

async function login(type, identifier, password, request) {
  const user = await repository.findUser(type, identifier);
  if (!user || !user.is_active || (type === 'customer' && user.app_status !== 'active')) {
    throw Object.assign(new Error('Invalid credentials.'), { statusCode: 401 });
  }
  ensurePasswordHashSupported(user.password_hash);
  const verification = await verifyPassword(password, user.password_hash);
  if (!verification.valid) {
    throw Object.assign(new Error('Invalid credentials.'), { statusCode: 401 });
  }
  if (verification.type === 'argon2') {
    await repository.updatePassword(type, user.id, await bcrypt.hash(password, 12));
  }
  await repository.updateLastLogin(type, user.id);
  return issueTokens(type, user, request);
}

async function registerCustomer(input, request) {
  const existing = await repository.findUser('customer', input.phone);
  if (existing) throw Object.assign(new Error('Phone already registered.'), { statusCode: 409 });
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await repository.createCustomer({ ...input, passwordHash });
  return issueTokens('customer', user, request);
}

async function refresh(type, refreshToken, request) {
  if (!TYPES.includes(type) || !refreshToken) throw Object.assign(new Error('Refresh token is required.'), { statusCode: 400 });
  const session = await repository.findSession(sha256(refreshToken), type);
  if (!session || session.revoked_at || new Date(session.expires_at) <= new Date()) {
    throw Object.assign(new Error('Invalid or expired refresh token.'), { statusCode: 401 });
  }
  const user = await repository.findUserById(type, session.user_id);
  if (!user || !user.is_active || (type === 'customer' && user.app_status !== 'active')) {
    throw Object.assign(new Error('Account is not active.'), { statusCode: 401 });
  }
  await repository.revokeSession(session.id);
  return issueTokens(type, user, request);
}

async function resetAdminPassword(adminId, newPassword) {
  const admin = await repository.findUserById('admin', adminId);
  if (!admin || !admin.is_active) throw Object.assign(new Error('Admin account is not active.'), { statusCode: 401 });
  await repository.updateAdminPassword(adminId, await bcrypt.hash(newPassword, 12));
}

async function resetAdminPasswordByEmail(email, newPassword) {
  const admin = await repository.findUser('admin', email);
  if (!admin || !admin.is_active) throw Object.assign(new Error('Admin account not found or inactive.'), { statusCode: 404 });
  await repository.updateAdminPassword(admin.id, await bcrypt.hash(newPassword, 12));
}

module.exports = { login, registerCustomer, refresh, resetAdminPassword, resetAdminPasswordByEmail, publicUser };