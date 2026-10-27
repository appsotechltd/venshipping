// Needs a disposable Postgres database. Defaults to venshipping_test; override with TEST_DATABASE_URL.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://ven:ven@localhost:5432/venshipping_test';
process.env.ADMIN_NOTIFICATION_EMAIL = 'admin@venshipping.com';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const db = require('../src/db');
const migrate = require('../src/db/migrate');
const app = require('../src/app');
const email = require('../src/services/email');
const { formatCustomerId } = require('../src/services/customerId');

let sent = [];
email.setTransporter({ sendMail: async (msg) => sent.push(msg) });

const valid = {
  fullName: 'Ama Mensah',
  email: 'ama@example.com',
  phone: '+233 20 123 4567',
  password: 'secret123',
  deliveryDestination: 'Accra, Ghana',
  preferredShippingMethod: 'sea',
};

// Emails go out in the background after the response, so wait until both are logged.
async function waitForEmailLog(status, count = 2) {
  for (let i = 0; i < 100; i++) {
    const { rows } = await db.query('SELECT count(*)::int AS n FROM email_log WHERE status = $1', [status]);
    if (rows[0].n >= count) return;
    await new Promise((r) => setTimeout(r, 20));
  }
}

before(async () => {
  await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate();
});

beforeEach(async () => {
  await db.query("TRUNCATE customers, email_log RESTART IDENTITY CASCADE; SELECT setval('customer_number_seq', 1, false);");
  sent = [];
});

after(() => db.pool.end());

test('formats customer IDs with the FWB2423 code', () => {
  assert.equal(formatCustomerId(1), 'FWB2423-0001');
  assert.equal(formatCustomerId(42), 'FWB2423-0042');
  assert.equal(formatCustomerId(12345), 'FWB2423-12345');
});

test('registration assigns a customer ID and personalised warehouse addresses', async () => {
  const res = await request(app).post('/api/auth/register').send(valid).expect(201);
  assert.ok(res.body.token);
  assert.equal(res.body.customer.customerId, 'FWB2423-0001');
  assert.equal(res.body.customer.shippingMark, 'FWB2423-0001 (VEN SHIPPING)');
  assert.equal(res.body.customer.passwordHash, undefined);

  const addresses = res.body.warehouseAddresses;
  assert.deepEqual(addresses.map((a) => a.method), ['sea', 'air'], 'preferred method comes first');
  for (const a of addresses) {
    assert.match(a.recipient, /FWB2423-0001 \(VEN SHIPPING\)/);
    assert.match(a.fullText, /Shipping mark: FWB2423-0001 \(VEN SHIPPING\)/);
  }

  const second = await request(app).post('/api/auth/register').send({ ...valid, email: 'kofi@example.com' }).expect(201);
  assert.equal(second.body.customer.customerId, 'FWB2423-0002');
});

test('registration sends the admin notification and customer welcome email', async () => {
  await request(app).post('/api/auth/register').send(valid).expect(201);
  await waitForEmailLog('sent');
  assert.equal(sent.length, 2);

  const admin = sent.find((m) => m.to === 'admin@venshipping.com');
  for (const field of ['Ama Mensah', 'FWB2423-0001', '+233 20 123 4567', 'ama@example.com', 'Accra, Ghana', 'Registration date']) {
    assert.ok(admin.text.includes(field), `admin email includes ${field}`);
  }

  const welcome = sent.find((m) => m.to === 'ama@example.com');
  assert.match(welcome.text, /OUR CHINA WAREHOUSE ADDRESS/);
  assert.match(welcome.text, /Shipping mark: FWB2423-0001 \(VEN SHIPPING\)/);
  assert.match(welcome.text, /How to send goods/);

  const { rows } = await db.query("SELECT kind, status FROM email_log ORDER BY kind");
  assert.deepEqual(rows, [
    { kind: 'admin_new_customer', status: 'sent' },
    { kind: 'customer_welcome', status: 'sent' },
  ]);
});

test('registration still succeeds when email sending fails', async () => {
  email.setTransporter({ sendMail: async () => { throw new Error('SMTP down'); } });
  try {
    await request(app).post('/api/auth/register').send(valid).expect(201);
    await waitForEmailLog('failed');
    const { rows } = await db.query("SELECT count(*)::int AS n FROM email_log WHERE status = 'failed'");
    assert.equal(rows[0].n, 2);
  } finally {
    email.setTransporter({ sendMail: async (msg) => sent.push(msg) });
  }
});

test('rejects invalid and duplicate registrations', async () => {
  const bad = await request(app).post('/api/auth/register').send({ email: 'nope' }).expect(422);
  assert.ok(bad.body.fields.fullName);
  assert.ok(bad.body.fields.email);
  assert.ok(bad.body.fields.password);

  await request(app).post('/api/auth/register').send(valid).expect(201);
  const dup = await request(app).post('/api/auth/register').send({ ...valid, email: 'AMA@example.com' }).expect(422);
  assert.ok(dup.body.fields.email);
});

test('logged-in customers can fetch their profile and addresses', async () => {
  await request(app).post('/api/auth/register').send(valid).expect(201);
  await request(app).post('/api/auth/login').send({ email: valid.email, password: 'wrong-pass' }).expect(401);
  const login = await request(app).post('/api/auth/login').send({ email: valid.email, password: valid.password }).expect(200);
  const auth = { Authorization: `Bearer ${login.body.token}` };

  const me = await request(app).get('/api/me').set(auth).expect(200);
  assert.equal(me.body.customer.customerId, 'FWB2423-0001');

  const addr = await request(app).get('/api/me/warehouse-addresses').set(auth).expect(200);
  assert.equal(addr.body.warehouseAddresses.length, 2);

  await request(app).get('/api/me').expect(401);
  const instructions = await request(app).get('/api/shipping-instructions').expect(200);
  assert.ok(instructions.body.steps.length > 0);
});
