const express = require('express');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const db = require('../db');
const config = require('../config');
const { signToken, requireAuth } = require('../middleware/auth');
const { authenticate, createCustomer } = require('../services/customers');
const { startPasswordReset, completePasswordReset } = require('../services/passwordReset');
const { toPublicShipment } = require('../services/shipments');
const { emitShipmentEvent } = require('../services/notifications');
const billing = require('../services/billing');
const email = require('../services/email');
const { signAdminToken, requireAdminLogin, requireSelf, randomPassword } = require('./auth');
const { sendMail } = require('./mail');

// The website's own API. Response shapes match what the React site already expects.
const router = express.Router();
const admin = express.Router();
admin.use(requireAdminLogin);

// The website has always priced in Naira.
const WEB_CURRENCY = process.env.WEB_CURRENCY || 'NGN';

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const bad = (res, message, status = 400) => res.status(status).json({ message });

// ---------------------------------------------------------------- status mapping
const SLUG_TO_LABEL = {
  received: 'Processing',
  departed: 'Departed',
  in_transit: 'In Transit',
  arrived: 'Arrived',
  ready_for_pickup: 'Ready for Pickup',
  delivered: 'Delivered',
  on_hold: 'On Hold',
};
const LABEL_TO_SLUG = Object.fromEntries(Object.entries(SLUG_TO_LABEL).map(([slug, label]) => [label.toLowerCase(), slug]));
const toLabel = (slug) => SLUG_TO_LABEL[slug] || slug;
const toSlug = (label) => LABEL_TO_SLUG[String(label || '').trim().toLowerCase()] || null;

const dateOnly = (v) => (v ? new Date(v).toISOString().slice(0, 10) : null);
const validDate = (v) => (/^\d{4}-\d{2}-\d{2}/.test(String(v || '')) && !Number.isNaN(Date.parse(String(v).slice(0, 10))) ? String(v).slice(0, 10) : null);
const methodFor = (service) => (/sea|ocean|vessel|container/i.test(String(service || '')) ? 'sea' : 'air');

// ---------------------------------------------------------------- mappers
function customerOut(c) {
  return { id: Number(c.id), name: c.full_name, email: c.email, phone: c.phone, address: c.delivery_destination, customerCode: c.customer_id };
}

async function loadShipments(whereSql, params) {
  const { rows } = await db.query(
    `SELECT s.*, c.full_name AS customer_name
       FROM shipments s LEFT JOIN customers c ON c.id = s.customer_id
      ${whereSql} ORDER BY s.created_at DESC`,
    params,
  );
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [{ rows: events }, { rows: inst }] = await Promise.all([
    db.query('SELECT * FROM shipment_events WHERE shipment_id = ANY($1) ORDER BY occurred_at, id', [ids]),
    db.query('SELECT * FROM shipment_installments WHERE shipment_id = ANY($1) ORDER BY created_at, id', [ids]),
  ]);
  return rows.map((s) => {
    const installments = inst.filter((i) => i.shipment_id === s.id).map((i) => ({
      id: Number(i.id), trackingId: s.tracking_number, quantity: i.quantity, containerNumber: i.container_number,
      photoUrl: i.photo_url, qrCodeDataUrl: i.qr_code_data_url, createdAt: i.created_at,
    }));
    return {
      trackingId: s.tracking_number,
      customerId: Number(s.customer_id),
      customerName: s.customer_name,
      origin: s.origin,
      destination: s.destination,
      status: toLabel(s.status),
      estimatedArrival: dateOnly(s.estimated_arrival),
      shippedDate: s.shipped_date,
      carrier: s.carrier,
      service: s.service,
      weight: s.weight_text ?? (s.weight_kg === null ? null : String(Number(s.weight_kg))),
      itemDescription: s.description,
      orderedQuantity: s.ordered_quantity,
      unit: s.unit,
      history: events.filter((e) => e.shipment_id === s.id).map((e) => ({
        date: new Date(e.occurred_at).toISOString().slice(0, 10),
        time: new Date(e.occurred_at).toISOString().slice(11, 16),
        status: toLabel(e.status),
        location: e.location || '',
        details: e.note || '',
      })),
      installments,
      fulfilledQuantity: installments.reduce((sum, i) => sum + i.quantity, 0),
    };
  });
}

function invoiceOut(inv, items, c) {
  const cents = Number(inv.total_cents);
  return {
    id: inv.invoice_number,
    customerId: Number(inv.customer_id),
    customerName: c?.full_name,
    customerEmail: c?.email,
    customerPhone: c?.phone,
    shipmentId: inv.shipment_tracking || null,
    date: dateOnly(inv.issued_at),
    status: inv.status === 'paid' ? 'Paid' : 'Unpaid',
    type: inv.doc_type,
    items: items.map((i) => ({ description: i.description, quantity: Number(i.quantity), price: Number(i.unit_price_cents) / 100 })),
    total: cents / 100,
  };
}

async function loadInvoices(whereSql, params) {
  const { rows } = await db.query(
    `SELECT i.*, s.tracking_number AS shipment_tracking, c.full_name, c.email, c.phone
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
       LEFT JOIN shipments s ON s.id = i.shipment_id
      ${whereSql} ORDER BY i.issued_at DESC, i.id DESC`,
    params,
  );
  if (!rows.length) return [];
  const { rows: items } = await db.query('SELECT * FROM invoice_items WHERE invoice_id = ANY($1) ORDER BY position', [rows.map((r) => r.id)]);
  return rows.map((r) => invoiceOut(r, items.filter((i) => i.invoice_id === r.id), { full_name: r.full_name, email: r.email, phone: r.phone }));
}

// ---------------------------------------------------------------- auth
router.post('/login', wrap(async (req, res) => {
  const { email: addr, password } = req.body || {};
  if (!addr || !password) return bad(res, 'Email and password are required');

  const { rows } = await db.query('SELECT * FROM admins WHERE lower(email) = lower($1)', [String(addr).trim()]);
  if (rows[0] && (await bcrypt.compare(String(password), rows[0].password_hash))) {
    return res.json({
      user: { name: rows[0].name, email: rows[0].email, role: 'admin' },
      token: signAdminToken(rows[0]),
      message: 'Admin login successful',
    });
  }

  const customer = await authenticate(addr, password);
  if (customer) {
    return res.json({
      user: { id: Number(customer.id), name: customer.full_name, email: customer.email, role: 'customer' },
      token: signToken(customer),
      message: 'Customer login successful',
    });
  }
  bad(res, 'Invalid email or password', 401);
}));

router.post('/change-password', wrap(async (req, res) => {
  const { email: addr, oldPassword, newPassword, role } = req.body || {};
  if (!newPassword || String(newPassword).length < 8) return bad(res, 'Use at least 8 characters.');
  if (role === 'admin') {
    // Admins change their own password, so this needs an admin session.
    return requireAdminLogin(req, res, async () => {
      if (!(await bcrypt.compare(String(oldPassword || ''), req.admin.password_hash))) return bad(res, 'Incorrect old password.', 401);
      await db.query('UPDATE admins SET password_hash = $2 WHERE id = $1', [req.admin.id, await bcrypt.hash(String(newPassword), 10)]);
      res.json({ success: true, message: 'Password changed successfully.' });
    });
  }
  return requireAuth(req, res, async () => {
    if (String(addr || '').toLowerCase() !== req.customer.email.toLowerCase()) return bad(res, 'Incorrect email.', 401);
    if (!(await bcrypt.compare(String(oldPassword || ''), req.customer.password_hash))) return bad(res, 'Incorrect old password.', 401);
    await db.query('UPDATE customers SET password_hash = $2, password_changed_at = now() WHERE id = $1', [
      req.customer.id, await bcrypt.hash(String(newPassword), 10),
    ]);
    res.json({ success: true, message: 'Password changed successfully.' });
  });
}));

// Customers get a 6-digit code by email; the reset page's "token" field takes that code.
router.post('/auth/forgot-password', wrap(async (req, res) => {
  const started = await startPasswordReset(req.body?.email);
  if (started) {
    email.sendPasswordResetEmail(started.customer, started.code, config.passwordReset.codeTtlMinutes)
      .catch((err) => console.error('Password reset email:', err.message));
  }
  res.json({ success: true, message: 'If an account exists, a reset code has been sent.' });
}));

router.post('/auth/reset-password', wrap(async (req, res) => {
  const { email: addr, token, newPassword } = req.body || {};
  const customer = await completePasswordReset({ email: addr, code: token, password: newPassword });
  email.sendPasswordChangedEmail(customer).catch((err) => console.error('Password changed email:', err.message));
  res.json({ success: true, message: 'Password reset successfully.' });
}));

// ---------------------------------------------------------------- public tracking
router.get('/track/:trackingId', wrap(async (req, res) => {
  const [s] = await loadShipments('WHERE upper(s.tracking_number) = upper($1)', [req.params.trackingId]);
  if (!s) return bad(res, 'Shipment not found. Please check the tracking ID.', 404);
  // Public lookups don't need to expose who owns the shipment.
  const { customerName, customerId, ...pub } = s;
  res.json(pub);
}));

// ---------------------------------------------------------------- customer area
router.get('/customer/shipments/:customerId', requireAuth, requireSelf, wrap(async (req, res) => {
  res.json(await loadShipments('WHERE s.customer_id = $1', [req.customer.id]));
}));

router.get('/customer/invoices/:customerId', requireAuth, requireSelf, wrap(async (req, res) => {
  res.json(await loadInvoices('WHERE i.customer_id = $1', [req.customer.id]));
}));

router.post('/customer/documents/:id/send', requireAuth, wrap(async (req, res) => {
  const inv = await billing.invoiceByNumber(req.params.id);
  if (!inv || String(inv.customer_id) !== String(req.customer.id)) return bad(res, 'Document not found', 404);
  await email.sendInvoiceEmail(req.customer, billing.invoicePublic(inv));
  res.json({ success: true, message: 'Sent to your email address.' });
}));

// ---------------------------------------------------------------- admin: customers
admin.get('/customers', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM customers ORDER BY full_name');
  res.json(rows.map(customerOut));
}));

admin.post('/customers', wrap(async (req, res) => {
  const { name, email: addr, phone, address } = req.body || {};
  const password = randomPassword();
  const customer = await createCustomer({
    fullName: name, email: addr, phone, password, deliveryDestination: address || 'To be confirmed', preferredShippingMethod: 'air',
  });
  // Staff-created accounts get their login details by email, as before.
  sendMail({
    to: customer.email,
    subject: 'Welcome to Ven Logistics - Your Account Details',
    text: `Dear ${customer.full_name},\n\nYour account has been created.\n\nEmail: ${customer.email}\nPassword: ${password}\nCustomer ID: ${customer.customer_id}\n\nPlease log in and change your password after your first login.\n\nVen Logistics Team`,
  }).catch((err) => console.error('Welcome email:', err.message));
  res.status(201).json(customerOut(customer));
}));

admin.put('/customers/:id', wrap(async (req, res) => {
  const { name, email: addr, phone, address } = req.body || {};
  const { rows } = await db.query(
    'UPDATE customers SET full_name=$1, email=$2, phone=$3, delivery_destination=$4 WHERE id=$5 RETURNING *',
    [name, String(addr || '').trim().toLowerCase(), phone, address, req.params.id],
  );
  if (!rows[0]) return bad(res, 'Customer not found.', 404);
  res.json(customerOut(rows[0]));
}));

admin.delete('/customers/:id', wrap(async (req, res) => {
  try {
    await db.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
  } catch (err) {
    // Shipments keep a hard link to their owner, so a customer with shipments can't be removed.
    if (err.code === '23503') return bad(res, 'This customer still has shipments. Delete or reassign them first.', 409);
    throw err;
  }
  res.status(204).end();
}));

// ---------------------------------------------------------------- admin: shipments
admin.get('/shipments', wrap(async (req, res) => res.json(await loadShipments('', []))));

async function writeHistory(client, shipmentId, history) {
  await client.query('DELETE FROM shipment_events WHERE shipment_id = $1', [shipmentId]);
  for (const h of Array.isArray(history) ? history : []) {
    const at = Date.parse(`${h.date}T${h.time || '00:00'}:00Z`);
    await client.query(
      'INSERT INTO shipment_events (shipment_id, status, note, location, created_by, occurred_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [shipmentId, toSlug(h.status) || String(h.status || ''), h.details || null, h.location || null, 'website', Number.isNaN(at) ? new Date() : new Date(at)],
    );
  }
}

function shipmentValues(b) {
  const plain = /^\s*(\d+(?:\.\d+)?)\s*(?:kg)?\s*$/i.exec(String(b.weight ?? ''));
  return {
    status: toSlug(b.status) || String(b.status || 'received'),
    weightText: b.weight === undefined || b.weight === null || b.weight === '' ? null : String(b.weight),
    weightKg: plain ? Number(plain[1]) : null,
    estimated: validDate(b.estimatedArrival),
    method: methodFor(b.service),
    ordered: Number.isInteger(Number(b.orderedQuantity)) && Number(b.orderedQuantity) > 0 ? Number(b.orderedQuantity) : null,
  };
}

admin.post('/shipments', wrap(async (req, res) => {
  const b = req.body || {};
  if (!b.customerId) return bad(res, 'Choose a customer for this shipment.');
  const v = shipmentValues(b);
  const trackingId = `VEN${Date.now().toString().slice(-9)}`;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO shipments (tracking_number, customer_id, shipping_method, description, weight_kg, weight_text, status, estimated_arrival,
                              origin, destination, carrier, service, shipped_date, ordered_quantity, unit)
       VALUES ($1,$2,$3,$4,$5,$15,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [trackingId, b.customerId, v.method, b.itemDescription || '', v.weightKg, v.status, v.estimated,
        b.origin, b.destination, b.carrier, b.service, b.shippedDate, v.ordered, b.unit, v.weightText],
    );
    await writeHistory(client, rows[0].id, b.history);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23503') return bad(res, 'Customer not found.');
    throw err;
  } finally {
    client.release();
  }
  res.status(201).json({ ...b, trackingId });
}));

admin.put('/shipments/:trackingId', wrap(async (req, res) => {
  const b = req.body || {};
  const v = shipmentValues(b);
  const { rows: before } = await db.query('SELECT * FROM shipments WHERE tracking_number = $1', [req.params.trackingId]);
  if (!before[0]) return bad(res, 'Shipment not found.', 404);
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE shipments SET customer_id=COALESCE($2, customer_id), shipping_method=$3, description=$4, weight_kg=$5, weight_text=$15, status=$6,
              estimated_arrival=$7, origin=$8, destination=$9, carrier=$10, service=$11, shipped_date=$12,
              ordered_quantity=$13, unit=$14, updated_at=now()
        WHERE id=$1`,
      [before[0].id, b.customerId || null, v.method, b.itemDescription || '', v.weightKg, v.status, v.estimated,
        b.origin, b.destination, b.carrier, b.service, b.shippedDate, v.ordered, b.unit, v.weightText],
    );
    if (Array.isArray(b.history)) await writeHistory(client, before[0].id, b.history);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  if (before[0].status !== v.status) {
    const { rows } = await db.query('SELECT * FROM shipments WHERE id = $1', [before[0].id]);
    const { rows: c } = await db.query('SELECT * FROM customers WHERE id = $1', [rows[0].customer_id]);
    const { rows: events } = await db.query('SELECT * FROM shipment_events WHERE shipment_id = $1 ORDER BY occurred_at DESC, id DESC', [rows[0].id]);
    emitShipmentEvent({
      type: 'shipment.status_changed',
      shipment: toPublicShipment(rows[0], events),
      customer: c[0],
      event: events[0] ? { status: events[0].status, note: events[0].note, location: events[0].location } : null,
      previousStatus: before[0].status,
    });
  }
  res.json({ ...b, trackingId: req.params.trackingId });
}));

admin.delete('/shipments/:trackingId', wrap(async (req, res) => {
  await db.query('DELETE FROM shipments WHERE tracking_number = $1', [req.params.trackingId]);
  res.status(204).end();
}));

admin.post('/shipments/:trackingId/installments', wrap(async (req, res) => {
  const { quantity, containerNumber, photoUrl } = req.body || {};
  if (!quantity || Number(quantity) <= 0 || !Number.isInteger(Number(quantity))) return bad(res, 'Quantity must be a positive whole number.');
  const { rows } = await db.query('SELECT * FROM shipments WHERE tracking_number = $1', [req.params.trackingId]);
  const s = rows[0];
  if (!s) return bad(res, 'Shipment not found.', 404);

  let qr = null;
  try {
    qr = await QRCode.toDataURL(`${process.env.WEB_URL || 'https://venshipping.com'}/#/track?id=${s.tracking_number}`);
  } catch (err) {
    console.error('QR code:', err.message);
  }
  const ins = await db.query(
    `INSERT INTO shipment_installments (shipment_id, quantity, container_number, photo_url, qr_code_data_url)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at`,
    [s.id, Number(quantity), containerNumber || null, photoUrl || null, qr],
  );
  // Each installment also shows up on the tracking timeline.
  await db.query(
    'INSERT INTO shipment_events (shipment_id, status, note, location, created_by) VALUES ($1,$2,$3,$4,$5)',
    [s.id, s.status, `${quantity} ${s.unit || 'units'} loaded into container ${containerNumber || 'N/A'}.`, s.origin || null, 'website'],
  );
  res.status(201).json({
    id: Number(ins.rows[0].id), trackingId: s.tracking_number, quantity: Number(quantity), containerNumber: containerNumber || null,
    photoUrl: photoUrl || null, qrCodeDataUrl: qr, createdAt: ins.rows[0].created_at,
  });
}));

admin.delete('/shipments/:trackingId/installments/:id', wrap(async (req, res) => {
  await db.query(
    `DELETE FROM shipment_installments WHERE id = $1
        AND shipment_id = (SELECT id FROM shipments WHERE tracking_number = $2)`,
    [req.params.id, req.params.trackingId],
  );
  res.status(204).end();
}));

// ---------------------------------------------------------------- admin: invoices
admin.get('/invoices', wrap(async (req, res) => res.json(await loadInvoices('', []))));

const DOC_PREFIX = { Invoice: 'INV', Receipt: 'RCP', Proforma: 'PRF' };

async function saveInvoice(client, id, b) {
  const items = Array.isArray(b.items) ? b.items : [];
  if (!items.length) throw Object.assign(new Error('Add at least one line item.'), { status: 400 });
  const lines = items.map((i, n) => {
    const qty = Number(i.quantity);
    const unit = Math.round(Number(i.price) * 100);
    return { n: n + 1, description: String(i.description || 'Item'), qty, unit, amount: Math.round(qty * unit) };
  });
  if (lines.some((l) => !(l.qty > 0) || !Number.isFinite(l.unit) || l.unit < 0)) {
    throw Object.assign(new Error('Each item needs a quantity above 0 and a price of 0 or more.'), { status: 400 });
  }
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  const paid = b.status === 'Paid';
  let shipmentDbId = null;
  if (b.shipmentId) {
    const { rows } = await client.query('SELECT id FROM shipments WHERE tracking_number = $1', [b.shipmentId]);
    shipmentDbId = rows[0]?.id || null;
  }
  const issued = validDate(b.date) || new Date().toISOString().slice(0, 10);
  const type = DOC_PREFIX[b.type] ? b.type : 'Invoice';
  await client.query(
    `UPDATE invoices SET customer_id=$2, shipment_id=$3, doc_type=$4, issued_at=$5, subtotal_cents=$6, total_cents=$6,
            paid_cents=$7, status=$8 WHERE id=$1`,
    [id, b.customerId, shipmentDbId, type, issued, total, paid ? total : 0, paid ? 'paid' : 'unpaid'],
  );
  await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
  for (const l of lines) {
    await client.query(
      `INSERT INTO invoice_items (invoice_id, position, description, quantity, unit_price_cents, amount_cents) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, l.n, l.description, l.qty, l.unit, l.amount],
    );
  }
}

admin.post('/invoices', wrap(async (req, res) => {
  const b = req.body || {};
  if (!b.customerId) return bad(res, 'Choose a customer.');
  const number = `${DOC_PREFIX[b.type] || 'INV'}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO invoices (invoice_number, customer_id, currency, subtotal_cents, total_cents) VALUES ($1,$2,$3,0,0) RETURNING id`,
      [number, b.customerId, WEB_CURRENCY],
    );
    await saveInvoice(client, rows[0].id, b);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23503') return bad(res, 'Customer not found.');
    throw err;
  } finally {
    client.release();
  }
  res.status(201).json({ ...b, id: number });
}));

admin.put('/invoices/:id', wrap(async (req, res) => {
  const b = req.body || {};
  const { rows } = await db.query('SELECT id FROM invoices WHERE invoice_number = $1', [req.params.id]);
  if (!rows[0]) return bad(res, 'Document not found', 404);
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await saveInvoice(client, rows[0].id, b);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  res.json({ ...b, id: req.params.id });
}));

admin.delete('/invoices/:id', wrap(async (req, res) => {
  await db.query('DELETE FROM invoices WHERE invoice_number = $1', [req.params.id]);
  res.status(204).end();
}));

admin.post('/documents/:id/send', wrap(async (req, res) => {
  const inv = await billing.invoiceByNumber(req.params.id);
  if (!inv) return bad(res, 'Document not found', 404);
  const { rows } = await db.query('SELECT * FROM customers WHERE id = $1', [inv.customer_id]);
  await email.sendInvoiceEmail(rows[0], billing.invoicePublic(inv));
  res.json({ success: true, message: `${inv.doc_type} sent successfully via email!` });
}));

module.exports = { router, admin };
