const crypto = require('crypto');

function requestLogger(req, res, next) {
  const requestId = crypto.randomBytes(8).toString('hex');
  const startedAt = process.hrtime.bigint();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms request_id=${requestId}`;
    if (res.statusCode >= 500) console.error('[ERROR]', line);
    else console.log('[INFO]', line);
  });

  next();
}

module.exports = requestLogger;