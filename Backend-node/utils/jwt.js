const jwt = require('jsonwebtoken');

function getSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return process.env.JWT_SECRET;
}

function signAccessToken(payload) {
  return jwt.sign(payload, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    algorithm: 'HS256'
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, getSecret(), { algorithms: ['HS256'] });
}

function signPasswordResetToken(adminId) {
  return jwt.sign({ sub: String(adminId), purpose: 'admin_password_reset' }, getSecret(), { expiresIn: '15m', algorithm: 'HS256' });
}

function verifyPasswordResetToken(token) {
  const payload = jwt.verify(token, getSecret(), { algorithms: ['HS256'] });
  if (payload.purpose !== 'admin_password_reset') throw new Error('Invalid reset token.');
  return payload;
}

module.exports = { signAccessToken, verifyAccessToken, signPasswordResetToken, verifyPasswordResetToken };