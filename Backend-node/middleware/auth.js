const { verifyAccessToken } = require('../utils/jwt');
const repository = require('../repositories/auth.repository');

function unauthorized(res, message = 'Invalid or expired token.') {
  return res.status(401).json({ success: false, message });
}

function requireAuth(...allowedTypes) {
  return async (req, res, next) => {
    const header = req.get('authorization') || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Missing bearer token.' });
    }

    try {
      const token = header.slice(7).trim();
      if (!token) throw new Error('empty token');
      const decoded = verifyAccessToken(token);
      if (allowedTypes.length && !allowedTypes.includes(decoded.typ)) {
        return res.status(403).json({ success: false, message: 'Wrong account type for this endpoint.' });
      }
      const userId = Number(decoded.sub);
      const session = await repository.findAccessSession(Number(decoded.sid), decoded.typ, userId);
      if (!session || session.revoked_at || new Date(session.expires_at) <= new Date()) {
        return unauthorized(res);
      }
      const user = await repository.findUserById(decoded.typ, userId);
      if (!user || !user.is_active || (decoded.typ === 'customer' && user.app_status !== 'active')) {
        return unauthorized(res, 'Account is inactive.');
      }
      req.user = decoded;
      req.account = user;
      if (decoded.typ === 'admin') req.permissions = await repository.loadAdminPermissions(userId);
      return next();
    } catch (error) {
      return unauthorized(res);
    }
  };
}

function requirePermission(...permissions) {
  return (req, res, next) => {
    if (req.user?.typ !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required.' });
    if (permissions.some((permission) => req.permissions?.includes(permission))) return next();
    return res.status(403).json({ success: false, message: 'You do not have permission for this action.' });
  };
}

function requireAnyPermission(...permissions) {
  return requirePermission(...permissions);
}

module.exports = { requireAuth, requirePermission, requireAnyPermission };