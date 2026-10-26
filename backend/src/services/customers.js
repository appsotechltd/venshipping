const bcrypt = require('bcryptjs');
const db = require('../db');
const { formatCustomerId, shippingMark } = require('./customerId');
const { METHODS } = require('./warehouse');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s\-()]{7,20}$/;

class ValidationError extends Error {
  constructor(fields) {
    super('Please check the highlighted fields.');
    this.status = 422;
    this.fields = fields;
  }
}

function validateRegistration(body = {}) {
  const input = {
    fullName: String(body.fullName || '').trim(),
    email: String(body.email || '').trim().toLowerCase(),
    phone: String(body.phone || '').trim(),
    password: String(body.password || ''),
    deliveryDestination: String(body.deliveryDestination || '').trim(),
    preferredShippingMethod: String(body.preferredShippingMethod || 'air').trim().toLowerCase(),
  };
  const fields = {};
  if (input.fullName.length < 2) fields.fullName = 'Enter your full name.';
  if (!EMAIL_RE.test(input.email)) fields.email = 'Enter a valid email address.';
  if (!PHONE_RE.test(input.phone)) fields.phone = 'Enter a valid phone number.';
  if (input.password.length < 8) fields.password = 'Use at least 8 characters.';
  if (!input.deliveryDestination) fields.deliveryDestination = 'Tell us where to deliver your goods.';
  if (!METHODS.includes(input.preferredShippingMethod)) fields.preferredShippingMethod = 'Choose air or sea freight.';
  if (Object.keys(fields).length) throw new ValidationError(fields);
  return input;
}

async function createCustomer(body) {
  const input = validateRegistration(body);
  const passwordHash = await bcrypt.hash(input.password, 10);
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: seq } = await client.query("SELECT nextval('customer_number_seq')::int AS n");
    const number = seq[0].n;
    const { rows } = await client.query(
      `INSERT INTO customers
         (customer_number, customer_id, full_name, email, phone, password_hash,
          delivery_destination, preferred_shipping_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        number,
        formatCustomerId(number),
        input.fullName,
        input.email,
        input.phone,
        passwordHash,
        input.deliveryDestination,
        input.preferredShippingMethod,
      ],
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505' && /email/.test(err.constraint || '')) {
      throw new ValidationError({ email: 'An account with this email already exists. Please log in.' });
    }
    throw err;
  } finally {
    client.release();
  }
}

async function authenticate(email, password) {
  const { rows } = await db.query('SELECT * FROM customers WHERE lower(email) = lower($1)', [String(email || '').trim()]);
  const customer = rows[0];
  if (!customer || !(await bcrypt.compare(String(password || ''), customer.password_hash))) return null;
  return customer;
}

function toPublic(customer) {
  return {
    customerId: customer.customer_id,
    shippingMark: shippingMark(customer.customer_id),
    fullName: customer.full_name,
    email: customer.email,
    phone: customer.phone,
    deliveryDestination: customer.delivery_destination,
    preferredShippingMethod: customer.preferred_shipping_method,
    registeredAt: customer.created_at,
  };
}

module.exports = { createCustomer, authenticate, toPublic, validateRegistration, ValidationError };
