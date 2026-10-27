const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

// Admin tokens are signed with a different secret from customer tokens, so one can never pass for the other.
const adminSecret = () => `${config.jwt.secret}:web-admin`;

function signAdminToken(admin) {
  return jwt.sign({ sub: String(admin.id), role: 'admin' }, adminSecret(), { expiresIn: '12h' });
}

function bearer(req) {
  const header = req.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function requireAdminLogin(req, res, next) {
  const token = bearer(req);
  if (!token) return res.status(401).json({ message: 'Please log in.' });
  try {
    const payload = jwt.verify(token, adminSecret());
    const { rows } = await db.query('SELECT * FROM admins WHERE id = $1', [payload.sub]);
    if (!rows[0]) return res.status(401).json({ message: 'Account not found.' });
    req.admin = rows[0];
    next();
  } catch {
    res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }
}

// Customers may only read their own data; the :customerId in the URL must be their database id.
function requireSelf(req, res, next) {
  if (String(req.customer.id) !== String(req.params.customerId)) {
    return res.status(403).json({ message: 'You can only view your own account.' });
  }
  next();
}

// Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD when none exists yet.
async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || !password) return;
  const { rowCount } = await db.query('SELECT 1 FROM admins LIMIT 1');
  if (rowCount) return;
  await db.query('INSERT INTO admins (email, name, password_hash) VALUES ($1, $2, $3)', [
    email,
    process.env.ADMIN_NAME || 'Admin',
    await bcrypt.hash(password, 10),
  ]);
  console.log(`Created admin account for ${email}`);
}

function randomPassword() {
  return crypto.randomBytes(9).toString('base64url');
}

module.exports = { signAdminToken, requireAdminLogin, requireSelf, seedAdmin, randomPassword };
