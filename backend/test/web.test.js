// Needs a disposable Postgres database. Defaults to venshipping_test; override with TEST_DATABASE_URL.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://ven:ven@localhost:5432/venshipping_test';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'admin-secret-1';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const db = require('../src/db');
const migrate = require('../src/db/migrate');
const app = require('../src/app');
const email = require('../src/services/email');
const { seedAdmin } = require('../src/web/auth');

email.setTransporter({ sendMail: async () => {} });

let adminAuth;
let alice;
let bob;

before(async () => {
  await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate();
  await seedAdmin();
  const res = await request(app).post('/api/web/login').send({ email: 'admin@example.com', password: 'admin-secret-1' }).expect(200);
  adminAuth = { Authorization: `Bearer ${res.body.token}` };
});

after(() => db.pool.end());

async function makeCustomer(name, mail) {
  const created = await request(app)
    .post('/api/web/admin/customers').set(adminAuth)
    .send({ name, email: mail, phone: '+233201234567', address: 'Accra' }).expect(201);
  // Staff-created customers get a random password; set a known one through the reset path-free route.
  await db.query('UPDATE customers SET password_hash = $2 WHERE id = $1', [created.body.id, require('bcryptjs').hashSync('customer-pass-1', 4)]);
  const login = await request(app).post('/api/web/login').send({ email: mail, password: 'customer-pass-1' }).expect(200);
  return { id: created.body.id, auth: { Authorization: `Bearer ${login.body.token}` }, user: login.body.user };
}

test('admin routes need an admin login, and customer tokens do not count', async () => {
  await request(app).get('/api/web/admin/customers').expect(401);
  await request(app).put('/api/web/admin/settings').send({ x: 'y' }).expect(401);
  alice = await makeCustomer('Alice Mensah', 'alice@example.com');
  bob = await makeCustomer('Bob Owusu', 'bob@example.com');
  await request(app).get('/api/web/admin/customers').set(alice.auth).expect(401);
  assert.equal(alice.user.role, 'customer');
});

test('rejects wrong passwords', async () => {
  await request(app).post('/api/web/login').send({ email: 'admin@example.com', password: 'nope' }).expect(401);
  await request(app).post('/api/web/login').send({ email: 'alice@example.com', password: 'nope' }).expect(401);
});

test('shipments round-trip with the website shape, including history and installments', async () => {
  const res = await request(app).post('/api/web/admin/shipments').set(adminAuth).send({
    customerId: alice.id, origin: 'Guangzhou', destination: 'Accra', status: 'Processing', estimatedArrival: '2026-12-01',
    shippedDate: '2026-01-01', carrier: 'MSC', service: 'Sea Freight', weight: '4 CTNS', itemDescription: 'Phone cases',
    orderedQuantity: 500, unit: 'pcs',
    history: [{ date: '2026-01-01', time: '09:30', status: 'Processing', location: 'Guangzhou', details: 'Received' }],
  }).expect(201);
  const trackingId = res.body.trackingId;
  assert.match(trackingId, /^VEN\d+$/);

  await request(app).post(`/api/web/admin/shipments/${trackingId}/installments`).set(adminAuth)
    .send({ quantity: 200, containerNumber: 'MSKU123' }).expect(201);
  await request(app).post(`/api/web/admin/shipments/${trackingId}/installments`).set(adminAuth).send({ quantity: 0 }).expect(400);

  const mine = await request(app).get(`/api/web/customer/shipments/${alice.id}`).set(alice.auth).expect(200);
  assert.equal(mine.body.length, 1);
  const s = mine.body[0];
  assert.equal(s.trackingId, trackingId);
  assert.equal(s.status, 'Processing');
  assert.equal(s.weight, '4 CTNS');
  assert.equal(s.estimatedArrival, '2026-12-01');
  assert.equal(s.fulfilledQuantity, 200);
  assert.equal(s.history[0].details, 'Received');
  assert.ok(s.history.length >= 2, 'installment adds a timeline entry');

  // Updating the status keeps history and maps labels to the app's statuses.
  await request(app).put(`/api/web/admin/shipments/${trackingId}`).set(adminAuth)
    .send({ ...s, status: 'In Transit', history: s.history }).expect(200);
  const { rows } = await db.query('SELECT status, shipping_method FROM shipments WHERE tracking_number = $1', [trackingId]);
  assert.deepEqual(rows[0], { status: 'in_transit', shipping_method: 'sea' });

  // The same shipment shows up in the app's own API.
  const appLogin = await request(app).post('/api/auth/login').send({ email: 'alice@example.com', password: 'customer-pass-1' }).expect(200);
  const appList = await request(app).get('/api/me/shipments').set('Authorization', `Bearer ${appLogin.body.token}`).expect(200);
  assert.equal(appList.body.shipments[0].trackingNumber, trackingId);
  assert.equal(appList.body.shipments[0].status, 'in_transit');

  // Public tracking works and does not reveal the owner.
  const pub = await request(app).get(`/api/web/track/${trackingId.toLowerCase()}`).expect(200);
  assert.equal(pub.body.customerName, undefined);
  assert.equal(pub.body.customerId, undefined);
  await request(app).get('/api/web/track/NOPE').expect(404);
});

test('customers cannot read each other\'s data', async () => {
  await request(app).get(`/api/web/customer/shipments/${alice.id}`).set(bob.auth).expect(403);
  await request(app).get(`/api/web/customer/invoices/${alice.id}`).set(bob.auth).expect(403);
  await request(app).get(`/api/web/customer/invoices/${alice.id}`).expect(401);
});

test('invoices keep website ids, totals and Paid/Unpaid status', async () => {
  const created = await request(app).post('/api/web/admin/invoices').set(adminAuth).send({
    customerId: alice.id, date: '2026-11-02', status: 'Unpaid', type: 'Invoice',
    items: [{ description: 'Freight', quantity: 2, price: 150.25 }, { description: 'Handling', quantity: 1, price: 20 }],
  }).expect(201);
  assert.match(created.body.id, /^INV-/);

  let list = await request(app).get(`/api/web/customer/invoices/${alice.id}`).set(alice.auth).expect(200);
  assert.equal(list.body[0].total, 320.5);
  assert.equal(list.body[0].status, 'Unpaid');
  assert.equal(list.body[0].date, '2026-11-02');

  await request(app).put(`/api/web/admin/invoices/${created.body.id}`).set(adminAuth).send({
    customerId: alice.id, date: '2026-11-02', status: 'Paid', type: 'Receipt', items: [{ description: 'Freight', quantity: 1, price: 100 }],
  }).expect(200);
  list = await request(app).get(`/api/web/customer/invoices/${alice.id}`).set(alice.auth).expect(200);
  assert.equal(list.body[0].status, 'Paid');
  assert.equal(list.body[0].type, 'Receipt');
  assert.equal(list.body[0].total, 100);

  await request(app).post('/api/web/admin/invoices').set(adminAuth).send({ customerId: alice.id, items: [] }).expect(400);
});

test('customers with shipments cannot be deleted', async () => {
  await request(app).delete(`/api/web/admin/customers/${alice.id}`).set(adminAuth).expect(409);
  await request(app).delete(`/api/web/admin/customers/${bob.id}`).set(adminAuth).expect(204);
});

test('content: public reads, admin writes, approved testimonials only', async () => {
  await request(app).post('/api/web/admin/services').set(adminAuth)
    .send({ name: 'Air Freight', shortDescription: 's', longDescription: 'l', iconName: 'plane', image: '/x.png', keyFeatures: ['Fast'] }).expect(201);
  const services = await request(app).get('/api/web/content/services').expect(200);
  assert.deepEqual(services.body[0].keyFeatures, ['Fast']);
  assert.equal(services.body[0].id, 'air-freight');

  await request(app).put('/api/web/admin/homepage').set(adminAuth).send({ heroTitle: 'Hi', stats: [{ label: 'a', value: 1 }] }).expect(200);
  const home = await request(app).get('/api/web/content/homepage').expect(200);
  assert.equal(home.body.heroTitle, 'Hi');
  assert.deepEqual(home.body.stats, [{ label: 'a', value: 1 }]);

  await request(app).put('/api/web/admin/settings').set(adminAuth).send({ companyName: 'VEN', admin_password: 'sneaky' }).expect(200);
  const settings = await request(app).get('/api/web/content/settings').expect(200);
  assert.equal(settings.body.companyName, 'VEN');
  assert.equal(settings.body.admin_password, undefined);

  await request(app).post('/api/web/testimonials').send({ name: 'Z', message: 'Great', rating: 5 }).expect(201);
  await request(app).post('/api/web/testimonials').send({ name: 'Z', message: 'Great', rating: 9 }).expect(400);
  assert.equal((await request(app).get('/api/web/content/testimonials').expect(200)).body.length, 0);
  const all = await request(app).get('/api/web/admin/testimonials').set(adminAuth).expect(200);
  await request(app).put(`/api/web/admin/testimonials/${all.body[0].id}`).set(adminAuth).send({ status: 'approved' }).expect(200);
  assert.equal((await request(app).get('/api/web/content/testimonials').expect(200)).body.length, 1);

  await request(app).post('/api/web/newsletter/subscribe').send({ email: 'n@example.com' }).expect(200);
  await request(app).post('/api/web/newsletter/subscribe').send({ email: 'n@example.com' }).expect(400);
});
