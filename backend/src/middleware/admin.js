const crypto = require('crypto');
const config = require('../config');

function sameKey(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Staff endpoints. Send the key as "X-Admin-Key: <ADMIN_API_KEY>" and, optionally,
// "X-Staff-Name: Grace" so status changes record who made them.
function requireAdmin(req, res, next) {
  if (!config.adminApiKey) return res.status(503).json({ error: 'Staff access is not set up. Set ADMIN_API_KEY on the server.' });
  if (!sameKey(req.get('x-admin-key') || '', config.adminApiKey)) return res.status(401).json({ error: 'Invalid staff key.' });
  req.staffName = String(req.get('x-staff-name') || 'staff').trim().slice(0, 80) || 'staff';
  next();
}

module.exports = { requireAdmin };
