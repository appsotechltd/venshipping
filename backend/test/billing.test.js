// Needs a disposable Postgres database. Defaults to venshipping_test; override with TEST_DATABASE_URL.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://ven:ven@localhost:5432/venshipping_test';
process.env.ADMIN_API_KEY = 'test-admin-key';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const db = require('../src/db');
const migrate = require('../src/db/migrate');
const app = require('../src/app');
const email = require('../src/services/email');

let sent = [];
email.setTransporter({ sendMail: async (msg) => sent.push(msg) });

const admin = { 'X-Admin-Key': 'test-admin-key' };

async function register(overrides = {}) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      fullName: 'Ama Mensah',
      email: 'ama@example.com',
      phone: '+233 20 123 4567',
      password: 'secret123',
      deliveryDestination: 'Accra, Ghana',
      preferredShippingMethod: 'air',
      ...overrides,
    })
    .expect(201);
  return { token: res.body.token, auth: { Authorization: `Bearer ${res.body.token}` }, customer: res.body.customer };
}

// Emails go out in the background after the response.
async function waitForEmail(kind, count = 1) {
  for (let i = 0; i < 100; i++) {
    const found = sent.filter((m) => m.kind === kind);
    if (found.length >= count) return found;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error(`No ${kind} email was sent`);
}

before(async () => {
  await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate();
});

beforeEach(async () => {
  await db.query(`TRUNCATE customers, email_log RESTART IDENTITY CASCADE;
    SELECT setval('customer_number_seq', 1, false), setval('invoice_number_seq', 1, false), setval('receipt_number_seq', 1, false);`);
  sent = [];
  email.setTransporter({
    sendMail: async (msg) => {
      const kind = msg.subject.includes('reset code') ? 'reset'
        : msg.subject.startsWith('Invoice') ? 'invoice'
        : msg.subject.startsWith('Payment received') ? 'receipt'
        : msg.subject.includes('password was changed') ? 'changed'
        : 'other';
      sent.push({ ...msg, kind });
    },
  });
});

after(() => db.pool.end());

const invoiceBody = {
  customerId: 'FWB2423-0001',
  currency: 'USD',
  dueDate: '2030-01-31',
  notes: 'Air freight, 3 cartons',
  items: [
    { description: 'Air freight Guangzhou to Accra', quantity: 12.5, unit: 'kg', unitPrice: 9.5 },
    { description: 'Handling fee', unitPrice: 15 },
  ],
};

test('staff endpoints need the admin key', async () => {
  await request(app).post('/api/admin/invoices').send(invoiceBody).expect(401);
  await request(app).post('/api/admin/invoices').set({ 'X-Admin-Key': 'wrong' }).send(invoiceBody).expect(401);
});

test('staff create an invoice; the customer sees it in the app and gets it by email', async () => {
  const { auth } = await register();
  const res = await request(app).post('/api/admin/invoices').set(admin).send(invoiceBody).expect(201);
  const inv = res.body.invoice;
  assert.equal(inv.invoiceNumber, 'INV-000001');
  assert.equal(inv.status, 'unpaid');
  assert.equal(inv.items[0].amountCents, 11875); // 12.5 kg x 9.50
  assert.equal(inv.totalCents, 13375);
  assert.equal(inv.balanceCents, 13375);
  assert.equal(inv.dueDate, '2030-01-31');

  const [mail] = await waitForEmail('invoice');
  assert.equal(mail.to, 'ama@example.com');
  assert.match(mail.subject, /INV-000001.*\$133\.75 due/);
  assert.match(mail.html, /cid:ven-logo@venshipping/);
  assert.ok(mail.attachments.some((a) => a.cid === 'ven-logo@venshipping'), 'logo is embedded');
  assert.match(mail.html, /Air freight Guangzhou to Accra/);
  assert.match(mail.html, /How to pay/);
  assert.match(mail.text, /Balance due: \$133\.75/);

  const list = await request(app).get('/api/me/invoices').set(auth).expect(200);
  assert.equal(list.body.invoices.length, 1);
  assert.deepEqual(list.body.outstanding, [{ currency: 'USD', amountCents: 13375 }]);

  const detail = await request(app).get('/api/me/invoices/inv-000001').set(auth).expect(200);
  assert.equal(detail.body.invoice.items.length, 2);
  assert.ok(detail.body.invoice.billing.paymentInstructions.length > 0);
});

test('customers cannot see other customers’ invoices', async () => {
  await register();
  const other = await register({ email: 'kofi@example.com' });
  await request(app).post('/api/admin/invoices').set(admin).send(invoiceBody).expect(201);
  await request(app).get('/api/me/invoices/INV-000001').set(other.auth).expect(404);
  const list = await request(app).get('/api/me/invoices').set(other.auth).expect(200);
  assert.equal(list.body.invoices.length, 0);
});

test('payments issue receipts, update the balance and email the customer', async () => {
  const { auth } = await register();
  await request(app).post('/api/admin/invoices').set(admin).send(invoiceBody).expect(201);

  const first = await request(app)
    .post('/api/admin/invoices/INV-000001/payments')
    .set(admin)
    .send({ amount: 100, method: 'mobile_money', reference: 'MTN-123' })
    .expect(201);
  assert.equal(first.body.receipt.receiptNumber, 'RCT-000001');
  assert.equal(first.body.receipt.balanceAfterCents, 3375);
  assert.equal(first.body.invoice.status, 'part_paid');

  await request(app).post('/api/admin/invoices/INV-000001/payments').set(admin).send({ amount: 50, method: 'cash' }).expect(422);

  const second = await request(app)
    .post('/api/admin/invoices/INV-000001/payments')
    .set(admin)
    .send({ amount: '33.75', method: 'cash' })
    .expect(201);
  assert.equal(second.body.receipt.balanceAfterCents, 0);
  assert.equal(second.body.invoice.status, 'paid');

  const receipts = await waitForEmail('receipt', 2);
  assert.match(receipts[0].subject, /\$100\.00 \(receipt RCT-000001\)/);
  assert.match(receipts[1].html, /paid in full/);

  const list = await request(app).get('/api/me/receipts').set(auth).expect(200);
  assert.deepEqual(list.body.receipts.map((r) => r.receiptNumber), ['RCT-000002', 'RCT-000001']);
  assert.equal(list.body.receipts[1].balanceAfterCents, 3375);

  const one = await request(app).get('/api/me/receipts/RCT-000001').set(auth).expect(200);
  assert.equal(one.body.receipt.methodLabel, 'Mobile money');

  await request(app).post('/api/me/receipts/RCT-000001/email').set(auth).expect(200);
  await waitForEmail('receipt', 3);

  await request(app).post('/api/admin/invoices/INV-000001/payments').set(admin).send({ amount: 1, method: 'cash' }).expect(422);
});

test('validates invoices and only cancels unpaid ones', async () => {
  await register();
  const bad = await request(app).post('/api/admin/invoices').set(admin).send({ customerId: 'FWB2423-0099', items: [] }).expect(422);
  assert.ok(bad.body.fields.items);
  const unknown = await request(app).post('/api/admin/invoices').set(admin).send({ ...invoiceBody, customerId: 'FWB2423-0099' }).expect(422);
  assert.match(unknown.body.fields.customerId, /No customer/);

  await request(app).post('/api/admin/invoices').set(admin).send({ ...invoiceBody, sendEmail: false }).expect(201);
  const voided = await request(app).post('/api/admin/invoices/INV-000001/void').set(admin).send({}).expect(200);
  assert.equal(voided.body.invoice.status, 'void');
  assert.equal(voided.body.invoice.balanceCents, 0);
  await request(app).post('/api/admin/invoices/INV-000001/payments').set(admin).send({ amount: 1, method: 'cash' }).expect(422);
  await request(app).post('/api/admin/invoices/INV-999999/payments').set(admin).send({ amount: 1, method: 'cash' }).expect(404);
});

test('forgot password: emailed code resets the password and signs out old sessions', async () => {
  const { auth: oldAuth } = await register();

  const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' }).expect(200);
  const known = await request(app).post('/api/auth/forgot-password').send({ email: 'AMA@example.com' }).expect(200);
  assert.equal(unknown.body.message, known.body.message, 'does not reveal which emails have accounts');

  const [mail] = await waitForEmail('reset');
  const code = mail.text.match(/Your reset code: (\d{6})/)[1];
  assert.match(mail.html, new RegExp(code));
  assert.match(mail.html, /cid:ven-logo@venshipping/);

  // A second request straight away does not send another code.
  await request(app).post('/api/auth/forgot-password').send({ email: 'ama@example.com' }).expect(200);

  const wrong = code === '000000' ? '111111' : '000000';
  const bad = await request(app).post('/api/auth/reset-password').send({ email: 'ama@example.com', code: wrong, password: 'newsecret1' }).expect(422);
  assert.ok(bad.body.fields.code);

  // Tokens are compared to the second; make sure the old one is from an earlier second.
  await new Promise((r) => setTimeout(r, 1100));
  const ok = await request(app).post('/api/auth/reset-password').send({ email: 'ama@example.com', code, password: 'newsecret1' }).expect(200);
  assert.ok(ok.body.token);
  await waitForEmail('changed');
  assert.equal(sent.filter((m) => m.kind === 'reset').length, 1);

  await request(app).post('/api/auth/reset-password').send({ email: 'ama@example.com', code, password: 'another123' }).expect(422);
  await request(app).get('/api/me').set(oldAuth).expect(401);
  await request(app).get('/api/me').set({ Authorization: `Bearer ${ok.body.token}` }).expect(200);
  await request(app).post('/api/auth/login').send({ email: 'ama@example.com', password: 'secret123' }).expect(401);
  await request(app).post('/api/auth/login').send({ email: 'ama@example.com', password: 'newsecret1' }).expect(200);
});

test('reset codes stop working after too many wrong guesses', async () => {
  await register();
  await request(app).post('/api/auth/forgot-password').send({ email: 'ama@example.com' }).expect(200);
  const [mail] = await waitForEmail('reset');
  const code = mail.text.match(/Your reset code: (\d{6})/)[1];
  const wrong = code === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) {
    await request(app).post('/api/auth/reset-password').send({ email: 'ama@example.com', code: wrong, password: 'newsecret1' }).expect(422);
  }
  await request(app).post('/api/auth/reset-password').send({ email: 'ama@example.com', code, password: 'newsecret1' }).expect(422);
});
