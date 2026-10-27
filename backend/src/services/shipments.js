const db = require('../db');
const config = require('../config');
const { METHODS } = require('./warehouse');
const { ValidationError } = require('./customers');
const { emitShipmentEvent } = require('./notifications');

// The journey every shipment follows, in order. The app draws its progress tracker from this.
const STAGES = [
  { status: 'received', label: 'Received at China warehouse' },
  { status: 'departed', label: 'Departed China' },
  { status: 'in_transit', label: 'In transit' },
  { status: 'arrived', label: 'Arrived at destination' },
  { status: 'ready_for_pickup', label: 'Ready for pickup' },
  { status: 'delivered', label: 'Delivered' },
];
// Can be set at any point (customs check, missing shipping mark...) without moving the shipment back.
const ON_HOLD = { status: 'on_hold', label: 'On hold' };

const LABELS = Object.fromEntries([...STAGES, ON_HOLD].map((s) => [s.status, s.label]));
const STATUSES = Object.keys(LABELS);

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.status = 404;
  }
}

function text(value, max = 500) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim().slice(0, max);
  return s || null;
}

function optionalNumber(value, field, fields, { integer = false } = {}) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || (integer && (!Number.isInteger(n) || n < 1))) {
    fields[field] = integer ? 'Enter a whole number of packages.' : 'Enter a number, 0 or more.';
    return null;
  }
  return n;
}

function optionalDate(value, field, fields) {
  if (value === undefined || value === null || value === '') return null;
  const s = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) {
    fields[field] = 'Use a date like 2026-11-30.';
    return null;
  }
  return s;
}

// Accepts the customer ID on its own or anything containing it, such as the full shipping mark
// copied off a carton: "FWB2423-0001 (VEN SHIPPING)".
function parseCustomerRef(value) {
  const code = config.customer.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(value || '').toUpperCase().match(new RegExp(`${code}-\\d+`));
  return match ? match[0] : null;
}

function stageIndex(status) {
  return STAGES.findIndex((s) => s.status === status);
}

function toPublicEvent(row) {
  return {
    status: row.status,
    statusLabel: LABELS[row.status] || row.status,
    note: row.note,
    location: row.location,
    occurredAt: row.occurred_at,
  };
}

// The shape the app and the notification hooks see. events are newest first.
function toPublicShipment(row, events) {
  // While on hold, progress stays at the last real stage reached.
  const reached = (events || []).map((e) => stageIndex(e.status)).filter((i) => i >= 0);
  const current = stageIndex(row.status);
  const progressStep = current >= 0 ? current : reached.length ? Math.max(...reached) : 0;
  const shipment = {
    trackingNumber: row.tracking_number,
    shippingMethod: row.shipping_method,
    description: row.description,
    packages: row.packages,
    weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
    volumeCbm: row.volume_cbm === null ? null : Number(row.volume_cbm),
    supplierTracking: row.supplier_tracking,
    status: row.status,
    statusLabel: LABELS[row.status] || row.status,
    progressStep,
    isDelivered: row.status === 'delivered',
    estimatedArrival: row.estimated_arrival,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (events) shipment.events = events.map(toPublicEvent);
  return shipment;
}

function toAdminShipment(row, events) {
  return {
    ...toPublicShipment(row, events),
    customer: { customerId: row.customer_code, fullName: row.customer_name, phone: row.customer_phone },
    ...(events && { events: events.map((e) => ({ ...toPublicEvent(e), createdBy: e.created_by })) }),
  };
}

const SELECT_WITH_CUSTOMER = `
  SELECT s.*, c.customer_id AS customer_code, c.full_name AS customer_name, c.phone AS customer_phone
  FROM shipments s JOIN customers c ON c.id = s.customer_id`;

async function eventsFor(client, shipmentId) {
  const { rows } = await client.query(
    'SELECT * FROM shipment_events WHERE shipment_id = $1 ORDER BY occurred_at DESC, id DESC',
    [shipmentId],
  );
  return rows;
}

// ---- Customer side ----

async function listForCustomer(customerDbId) {
  const { rows } = await db.query(
    `SELECT s.*, COALESCE(
        (SELECT json_agg(e.status) FROM shipment_events e WHERE e.shipment_id = s.id), '[]') AS event_statuses
     FROM shipments s WHERE s.customer_id = $1
     ORDER BY (s.status = 'delivered'), s.updated_at DESC`,
    [customerDbId],
  );
  return rows.map((r) => {
    const shipment = toPublicShipment(r, r.event_statuses.map((status) => ({ status })));
    delete shipment.events;
    return shipment;
  });
}

async function getForCustomer(customerDbId, trackingNumber) {
  const { rows } = await db.query('SELECT * FROM shipments WHERE customer_id = $1 AND tracking_number = $2', [
    customerDbId,
    String(trackingNumber || '').toUpperCase(),
  ]);
  if (!rows[0]) throw new NotFoundError('Shipment not found.');
  return toPublicShipment(rows[0], await eventsFor(db, rows[0].id));
}

// ---- Staff side ----

async function findCustomer(client, ref) {
  const customerId = parseCustomerRef(ref);
  if (!customerId) return null;
  const { rows } = await client.query('SELECT * FROM customers WHERE customer_id = $1', [customerId]);
  return rows[0] || null;
}

async function searchCustomers(q) {
  const term = String(q || '').trim();
  if (term.length < 2) return [];
  const { rows } = await db.query(
    `SELECT customer_id, full_name, phone, email, delivery_destination, preferred_shipping_method
     FROM customers
     WHERE customer_id ILIKE $1 OR full_name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1
     ORDER BY customer_number LIMIT 20`,
    [`%${term}%`],
  );
  return rows.map((r) => ({
    customerId: r.customer_id,
    fullName: r.full_name,
    phone: r.phone,
    email: r.email,
    deliveryDestination: r.delivery_destination,
    preferredShippingMethod: r.preferred_shipping_method,
  }));
}

function validateDetails(body, fields, { partial }) {
  const details = {};
  const has = (k) => !partial || Object.prototype.hasOwnProperty.call(body, k);
  if (has('shippingMethod')) {
    const method = String(body.shippingMethod || '').trim().toLowerCase();
    if (!METHODS.includes(method)) fields.shippingMethod = 'Choose air or sea freight.';
    details.shipping_method = method;
  }
  if (has('description')) details.description = text(body.description) || '';
  if (has('packages')) details.packages = optionalNumber(body.packages, 'packages', fields, { integer: true });
  if (has('weightKg')) details.weight_kg = optionalNumber(body.weightKg, 'weightKg', fields);
  if (has('volumeCbm')) details.volume_cbm = optionalNumber(body.volumeCbm, 'volumeCbm', fields);
  if (has('supplierTracking')) details.supplier_tracking = text(body.supplierTracking, 100);
  if (has('estimatedArrival')) details.estimated_arrival = optionalDate(body.estimatedArrival, 'estimatedArrival', fields);
  return details;
}

// Records goods arriving at a China warehouse. The shipment starts at 'received'.
async function createShipment(body = {}, staffName) {
  const fields = {};
  const details = validateDetails(body, fields, { partial: true });
  const client = await db.pool.connect();
  let created;
  try {
    const customer = await findCustomer(client, body.customerId || body.shippingMark);
    if (!customer) fields.customerId = 'No customer with that ID or shipping mark.';
    if (!body.shippingMethod && customer) details.shipping_method = customer.preferred_shipping_method;
    if (Object.keys(fields).length) throw new ValidationError(fields);

    await client.query('BEGIN');
    const { rows: seq } = await client.query("SELECT nextval('shipment_number_seq')::int AS n");
    const columns = { ...details, tracking_number: `VEN-${seq[0].n}`, customer_id: customer.id, status: 'received' };
    const keys = Object.keys(columns);
    const { rows } = await client.query(
      `INSERT INTO shipments (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      keys.map((k) => columns[k]),
    );
    const { rows: ev } = await client.query(
      `INSERT INTO shipment_events (shipment_id, status, note, location, created_by)
       VALUES ($1, 'received', $2, $3, $4) RETURNING *`,
      [rows[0].id, text(body.note), text(body.location, 120), staffName],
    );
    await client.query('COMMIT');
    created = { row: rows[0], event: ev[0], customer };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  const shipment = toPublicShipment(created.row, [created.event]);
  emitShipmentEvent({ type: 'shipment.created', shipment, customer: created.customer, event: toPublicEvent(created.event), previousStatus: null });
  return getAdminShipment(created.row.tracking_number);
}

async function getAdminShipment(trackingNumber) {
  const { rows } = await db.query(`${SELECT_WITH_CUSTOMER} WHERE s.tracking_number = $1`, [
    String(trackingNumber || '').toUpperCase(),
  ]);
  if (!rows[0]) throw new NotFoundError('Shipment not found.');
  return toAdminShipment(rows[0], await eventsFor(db, rows[0].id));
}

async function listShipments({ status, customerId, q, limit } = {}) {
  const where = [];
  const params = [];
  if (status) {
    params.push(String(status));
    where.push(`s.status = $${params.length}`);
  }
  if (customerId) {
    params.push(parseCustomerRef(customerId) || String(customerId));
    where.push(`c.customer_id = $${params.length}`);
  }
  if (q) {
    params.push(`%${String(q).trim()}%`);
    const p = `$${params.length}`;
    where.push(`(s.tracking_number ILIKE ${p} OR s.description ILIKE ${p} OR s.supplier_tracking ILIKE ${p}
               OR c.customer_id ILIKE ${p} OR c.full_name ILIKE ${p})`);
  }
  params.push(Math.min(Math.max(Number(limit) || 100, 1), 500));
  const { rows } = await db.query(
    `${SELECT_WITH_CUSTOMER} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY s.updated_at DESC LIMIT $${params.length}`,
    params,
  );
  return rows.map((r) => toAdminShipment(r));
}

async function updateDetails(trackingNumber, body = {}) {
  const fields = {};
  const details = validateDetails(body, fields, { partial: true });
  if (Object.keys(fields).length) throw new ValidationError(fields);
  const keys = Object.keys(details);
  if (keys.length) {
    const { rowCount } = await db.query(
      `UPDATE shipments SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')}, updated_at = now()
       WHERE tracking_number = $1`,
      [String(trackingNumber || '').toUpperCase(), ...keys.map((k) => details[k])],
    );
    if (!rowCount) throw new NotFoundError('Shipment not found.');
  }
  return getAdminShipment(trackingNumber);
}

// Moves one or more shipments to a new status, e.g. every shipment loaded into one container.
// All or nothing: if any tracking number is unknown, nothing changes.
async function updateStatus(trackingNumbers, body = {}, staffName) {
  const numbers = [...new Set((trackingNumbers || []).map((t) => String(t).trim().toUpperCase()).filter(Boolean))];
  const status = String(body.status || '').trim();
  const fields = {};
  if (!numbers.length) fields.trackingNumbers = 'Choose at least one shipment.';
  if (!STATUSES.includes(status)) fields.status = `Status must be one of: ${STATUSES.join(', ')}.`;
  const eta = optionalDate(body.estimatedArrival, 'estimatedArrival', fields);
  if (Object.keys(fields).length) throw new ValidationError(fields);

  const client = await db.pool.connect();
  const changes = [];
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT * FROM shipments WHERE tracking_number = ANY($1) ORDER BY id FOR UPDATE',
      [numbers],
    );
    const missing = numbers.filter((n) => !rows.some((r) => r.tracking_number === n));
    if (missing.length) throw new NotFoundError(`Shipment not found: ${missing.join(', ')}`);

    for (const row of rows) {
      const { rows: ev } = await client.query(
        `INSERT INTO shipment_events (shipment_id, status, note, location, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [row.id, status, text(body.note), text(body.location, 120), staffName],
      );
      const { rows: updated } = await client.query(
        `UPDATE shipments SET status = $2, estimated_arrival = COALESCE($3, estimated_arrival), updated_at = now()
         WHERE id = $1 RETURNING *`,
        [row.id, status, eta],
      );
      changes.push({ row: updated[0], event: ev[0], previousStatus: row.status });
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  const results = [];
  for (const change of changes) {
    const { rows: c } = await db.query('SELECT * FROM customers WHERE id = $1', [change.row.customer_id]);
    const events = await eventsFor(db, change.row.id);
    emitShipmentEvent({
      type: 'shipment.status_changed',
      shipment: toPublicShipment(change.row, events),
      customer: c[0],
      event: toPublicEvent(change.event),
      previousStatus: change.previousStatus,
    });
    results.push(await getAdminShipment(change.row.tracking_number));
  }
  return results;
}

module.exports = {
  STAGES,
  ON_HOLD,
  STATUSES,
  NotFoundError,
  parseCustomerRef,
  toPublicShipment,
  listForCustomer,
  getForCustomer,
  searchCustomers,
  createShipment,
  getAdminShipment,
  listShipments,
  updateDetails,
  updateStatus,
};
