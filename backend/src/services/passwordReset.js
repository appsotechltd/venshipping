const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('../config');
const db = require('../db');
const { ValidationError } = require('./customers');

// A new code is not sent if one went out less than this long ago, so the button can't be used to flood an inbox.
const RESEND_AFTER_SECONDS = 60;

function generateCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

/**
 * Creates a reset code for the account with this email, if there is one.
 * Returns { customer, code } when an email should be sent, otherwise null. Callers must answer
 * the same way either way so the endpoint doesn't reveal which emails have accounts.
 */
async function startPasswordReset(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) throw new ValidationError({ email: 'Enter your email address.' });
  const { rows } = await db.query('SELECT * FROM customers WHERE lower(email) = $1', [normalized]);
  const customer = rows[0];
  if (!customer) return null;

  const { rows: recent } = await db.query(
    `SELECT 1 FROM password_resets
      WHERE customer_id = $1 AND used_at IS NULL AND created_at > now() - make_interval(secs => $2)`,
    [customer.id, RESEND_AFTER_SECONDS],
  );
  if (recent.length) return null;

  const code = generateCode();
  // Only the newest code works.
  await db.query('UPDATE password_resets SET used_at = now() WHERE customer_id = $1 AND used_at IS NULL', [customer.id]);
  await db.query(
    `INSERT INTO password_resets (customer_id, code_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(mins => $3))`,
    [customer.id, await bcrypt.hash(code, 10), config.passwordReset.codeTtlMinutes],
  );
  return { customer, code };
}

const INVALID = 'That code is incorrect or has expired. Check the latest email from us or request a new code.';

/** Checks the code and sets the new password. Returns the updated customer. */
async function completePasswordReset({ email, code, password } = {}) {
  const fields = {};
  const cleanCode = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanCode)) fields.code = 'Enter the 6-digit code from the email.';
  if (String(password || '').length < 8) fields.password = 'Use at least 8 characters.';
  if (Object.keys(fields).length) throw new ValidationError(fields);

  const { rows } = await db.query(
    `SELECT r.*, c.id AS cid FROM password_resets r JOIN customers c ON c.id = r.customer_id
      WHERE lower(c.email) = lower($1) AND r.used_at IS NULL
      ORDER BY r.created_at DESC LIMIT 1`,
    [String(email || '').trim()],
  );
  const reset = rows[0];
  if (!reset || new Date(reset.expires_at) < new Date() || reset.attempts >= config.passwordReset.maxAttempts) {
    throw new ValidationError({ code: INVALID });
  }
  if (!(await bcrypt.compare(cleanCode, reset.code_hash))) {
    await db.query('UPDATE password_resets SET attempts = attempts + 1 WHERE id = $1', [reset.id]);
    throw new ValidationError({ code: INVALID });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    // Marking it used inside the transaction means a code can only ever be redeemed once.
    const { rowCount } = await client.query('UPDATE password_resets SET used_at = now() WHERE id = $1 AND used_at IS NULL', [reset.id]);
    if (!rowCount) throw new ValidationError({ code: INVALID });
    const { rows: updated } = await client.query(
      'UPDATE customers SET password_hash = $2, password_changed_at = now() WHERE id = $1 RETURNING *',
      [reset.cid, passwordHash],
    );
    await client.query('COMMIT');
    return updated[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { startPasswordReset, completePasswordReset, generateCode };
