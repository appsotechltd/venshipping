// Needs a disposable Postgres database. Defaults to venshipping_test; override with TEST_DATABASE_URL.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://ven:ven@localhost:5432/venshipping_test';
process.env.ADMIN_API_KEY = 'test-staff-key';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const db = require('../src/db');
const migrate = require('../src/db/migrate');
const app = require('../src/app');
const email = require('../src/services/email');
const { onShipmentEvent } = require('../src/services/notifications');

email.setTransporter({ sendMail: async () => {} });

const staff = { 'X-Admin-Key': 'test-staff-key', 'X-Staff-Name': 'Grace' };
let notifications = [];
onShipmentEvent((payload) => notifications.push(payload));

async function registerCustomer(emailAddress, method = 'sea') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      fullName: 'Ama Mensah',
      email: emailAddress,
      phone: '+233 20 123 4567',
      password: 'secret123',
      deliveryDestination: 'Accra, Ghana',
      preferredShippingMethod: method,
    })
    .expect(201);
  return { auth: { Authorization: `Bearer ${res.body.token}` }, customerId: res.body.customer.customerId };
}

before(async () => {
  await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate();
});

beforeEach(async () => {
  await db.query(`TRUNCATE customers, email_log, shipments, shipment_events RESTART IDENTITY CASCADE;
    SELECT setval('customer_number_seq', 1, false); SELECT setval('shipment_number_seq', 100001, false);`);
  notifications = [];
});

after(() => db.pool.end());

test('staff endpoints need the staff key', async () => {
  await request(app).get('/api/admin/shipments').expect(401);
  await request(app).get('/api/admin/shipments').set('X-Admin-Key', 'wrong').expect(401);
  await request(app).get('/api/admin/shipments').set(staff).expect(200);
});

test('staff record goods received and the customer sees them in the app', async () => {
  const ama = await registerCustomer('ama@example.com', 'sea');

  const created = await request(app)
    .post('/api/admin/shipments')
    .set(staff)
    .send({
      shippingMark: 'fwb2423-0001 (VEN SHIPPING)',
      description: '3 cartons of shoes',
      packages: 3,
      weightKg: 42.5,
      volumeCbm: 0.35,
      supplierTracking: 'SF1234567890',
      location: 'Guangzhou',
    })
    .expect(201);
  const s = created.body.shipment;
  assert.equal(s.trackingNumber, 'VEN-100001');
  assert.equal(s.shippingMethod, 'sea', 'defaults to the customer preference');
  assert.equal(s.status, 'received');
  assert.equal(s.statusLabel, 'Received at China warehouse');
  assert.equal(s.customer.customerId, ama.customerId);
  assert.equal(s.events[0].createdBy, 'Grace');

  const list = await request(app).get('/api/me/shipments').set(ama.auth).expect(200);
  assert.equal(list.body.shipments.length, 1);
  assert.equal(list.body.shipments[0].weightKg, 42.5);
  assert.equal(list.body.shipments[0].progressStep, 0);

  const detail = await request(app).get('/api/me/shipments/ven-100001').set(ama.auth).expect(200);
  assert.equal(detail.body.shipment.events.length, 1);
  assert.equal(detail.body.shipment.events[0].location, 'Guangzhou');
  assert.equal(detail.body.shipment.events[0].createdBy, undefined, 'staff names stay internal');

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, 'shipment.created');
  assert.equal(notifications[0].customer.email, 'ama@example.com');
});

test('status updates build the timeline and fire notification hooks', async () => {
  const ama = await registerCustomer('ama@example.com');
  await request(app).post('/api/admin/shipments').set(staff).send({ customerId: ama.customerId, shippingMethod: 'air' }).expect(201);

  await request(app)
    .post('/api/admin/shipments/VEN-100001/status')
    .set(staff)
    .send({ status: 'departed', note: 'Flight CZ3061', estimatedArrival: '2026-11-08' })
    .expect(200);
  await request(app)
    .post('/api/admin/shipments/VEN-100001/status')
    .set(staff)
    .send({ status: 'on_hold', note: 'Customs inspection' })
    .expect(200);

  const { body } = await request(app).get('/api/me/shipments/VEN-100001').set(ama.auth).expect(200);
  assert.equal(body.shipment.status, 'on_hold');
  assert.equal(body.shipment.progressStep, 1, 'on hold keeps the progress already made');
  assert.equal(body.shipment.estimatedArrival, '2026-11-08');
  assert.deepEqual(body.shipment.events.map((e) => e.status), ['on_hold', 'departed', 'received']);

  const changed = notifications.filter((n) => n.type === 'shipment.status_changed');
  assert.deepEqual(changed.map((n) => [n.previousStatus, n.event.status]), [['received', 'departed'], ['departed', 'on_hold']]);
  assert.equal(changed[1].shipment.trackingNumber, 'VEN-100001');

  await request(app).post('/api/admin/shipments/VEN-100001/status').set(staff).send({ status: 'lost' }).expect(422);
  await request(app).post('/api/admin/shipments/VEN-999999/status').set(staff).send({ status: 'departed' }).expect(404);
});

test('a whole container can be updated at once, all or nothing', async () => {
  const ama = await registerCustomer('ama@example.com');
  for (let i = 0; i < 2; i++) {
    await request(app).post('/api/admin/shipments').set(staff).send({ customerId: ama.customerId }).expect(201);
  }

  await request(app)
    .post('/api/admin/shipments/status')
    .set(staff)
    .send({ trackingNumbers: ['VEN-100001', 'VEN-404'], status: 'departed' })
    .expect(404);
  let list = await request(app).get('/api/me/shipments').set(ama.auth).expect(200);
  assert.ok(list.body.shipments.every((s) => s.status === 'received'));

  const res = await request(app)
    .post('/api/admin/shipments/status')
    .set(staff)
    .send({ trackingNumbers: ['VEN-100001', 'VEN-100002'], status: 'in_transit', location: 'Tema port' })
    .expect(200);
  assert.equal(res.body.shipments.length, 2);
  list = await request(app).get('/api/me/shipments').set(ama.auth).expect(200);
  assert.ok(list.body.shipments.every((s) => s.status === 'in_transit' && s.progressStep === 2));
});

test('customers only see their own shipments', async () => {
  const ama = await registerCustomer('ama@example.com');
  const kofi = await registerCustomer('kofi@example.com');
  await request(app).post('/api/admin/shipments').set(staff).send({ customerId: ama.customerId }).expect(201);

  await request(app).get('/api/me/shipments/VEN-100001').set(kofi.auth).expect(404);
  const list = await request(app).get('/api/me/shipments').set(kofi.auth).expect(200);
  assert.deepEqual(list.body.shipments, []);
  await request(app).get('/api/me/shipments').expect(401);
});

test('staff can look up customers, edit details and filter shipments', async () => {
  const ama = await registerCustomer('ama@example.com');
  const found = await request(app).get('/api/admin/customers?q=mensah').set(staff).expect(200);
  assert.equal(found.body.customers[0].customerId, ama.customerId);

  await request(app).post('/api/admin/shipments').set(staff).send({ customerId: 'FWB2423-0099' }).expect(422);
  await request(app).post('/api/admin/shipments').set(staff).send({ customerId: ama.customerId, packages: 0 }).expect(422);
  await request(app).post('/api/admin/shipments').set(staff).send({ customerId: ama.customerId }).expect(201);

  const patched = await request(app)
    .patch('/api/admin/shipments/VEN-100001')
    .set(staff)
    .send({ weightKg: 12, description: 'Phone accessories' })
    .expect(200);
  assert.equal(patched.body.shipment.weightKg, 12);
  assert.equal(patched.body.shipment.description, 'Phone accessories');

  const byStatus = await request(app).get('/api/admin/shipments?status=delivered').set(staff).expect(200);
  assert.equal(byStatus.body.shipments.length, 0);
  const bySearch = await request(app).get('/api/admin/shipments?q=phone').set(staff).expect(200);
  assert.equal(bySearch.body.shipments.length, 1);
});
