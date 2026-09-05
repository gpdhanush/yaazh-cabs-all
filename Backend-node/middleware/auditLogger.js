const pool = require('../config/database');

function clientIp(req) {
  const forwarded = process.env.TRUST_PROXY === 'true' ? req.get('x-forwarded-for')?.split(',')[0]?.trim() : null;
  const value = forwarded || req.ip || req.socket.remoteAddress || null;
  return value?.startsWith('::ffff:') ? value.slice(7) : value;
}

function auditLogger(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

  res.on('finish', () => {
    if (res.statusCode >= 400 || req.user?.typ !== 'admin') return;

    const path = req.route?.path || req.path;
    const action = `${req.method} ${path}`.slice(0, 120);
    const entityType = path.split('/').filter(Boolean).at(-2) || null;
    const entityId = Number(req.params?.id || Object.values(req.params || {})[0]);
    const ipAddress = clientIp(req);
    const userAgent = req.get('user-agent') || null;

    pool.execute(
      `INSERT INTO audit_logs (admin_user_id, action, entity_type, entity_id, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [Number(req.user.sub), action, entityType, Number.isInteger(entityId) && entityId > 0 ? entityId : null, ipAddress, userAgent],
    ).catch((error) => {
      console.error('[AUDIT] Failed to record admin mutation:', error.code || error.message);
    });
  });

  next();
}

module.exports = auditLogger;
