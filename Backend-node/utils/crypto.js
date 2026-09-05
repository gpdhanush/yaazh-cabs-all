const crypto = require('crypto');

function randomToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

module.exports = { randomToken, sha256 };