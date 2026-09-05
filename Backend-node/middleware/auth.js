const { verifyAccessToken } = require('../utils/jwt');

function requireAuth(...allowedTypes) {
  return (req, res, next) => {
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
      req.user = decoded;
      return next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
  };
}

module.exports = { requireAuth };