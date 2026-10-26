const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

function signToken(customer) {
  return jwt.sign({ sub: String(customer.id) }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

async function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please log in.' });
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
  try {
    const { rows } = await db.query('SELECT * FROM customers WHERE id = $1', [payload.sub]);
    if (!rows[0]) return res.status(401).json({ error: 'Account not found.' });
    // Changing the password signs out every device that logged in before the change.
    const changedAt = rows[0].password_changed_at;
    if (changedAt && payload.iat < Math.floor(new Date(changedAt).getTime() / 1000)) {
      return res.status(401).json({ error: 'Your password was changed. Please log in again.' });
    }
    req.customer = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { signToken, requireAuth };
