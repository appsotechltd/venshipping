#!/usr/bin/env node
// One-off import of the old MySQL website database into this Postgres schema.
//
//   node scripts/migrate-from-mysql.js <mysql-dump.json>             dry run: imports, prints a report, rolls back
//   node scripts/migrate-from-mysql.js <mysql-dump.json> --commit    imports for real
//
// The dump is a JSON object of table name -> rows, produced from the old database (see docs/MIGRATION.md).
// It contains plaintext customer passwords: keep it out of git and delete it after the import.
// Customer passwords are bcrypt-hashed on the way in. Admin credentials are NOT imported; set
// ADMIN_EMAIL and ADMIN_PASSWORD on the server instead.
//
// Aborts if the target already has customers, so it cannot be run twice by accident.

const fs = require('fs');
const bcrypt = require('bcryptjs');
const db = require('../src/db');
const migrate = require('../src/db/migrate');
const { formatCustomerId } = require('../src/services/customerId');

const SLUGS = {
  processing: 'received',
  'in transit': 'in_transit',
  arrived: 'arrived',
  delivered: 'delivered',
  departed: 'departed',
  'ready for pickup': 'ready_for_pickup',
  'on hold': 'on_hold',
};
const toSlug = (label) => SLUGS[String(label || '').trim().toLowerCase()] || null;
const methodFor = (service) => (/sea|ocean|vessel|container|fcl|lcl/i.test(String(service || '')) ? 'sea' : 'air');
const validDate = (v) => (/^\d{4}-\d{2}-\d{2}/.test(String(v || '')) && !Number.isNaN(Date.parse(String(v).slice(0, 10))) ? String(v).slice(0, 10) : null);
const json = (v, fallback) => {
  if (v === null || v === undefined) return fallback;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return fallback; }
};
const CURRENCY = process.env.WEB_CURRENCY || 'NGN';

async function run(dump, { commit }) {
  const report = { counts: {}, issues: [] };
  const issue = (msg) => report.issues.push(msg);
  const count = (name, inCount, outCount) => { report.counts[name] = `${outCount} of ${inCount}`; };

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: existing } = await client.query('SELECT count(*)::int AS n FROM customers');
    if (existing[0].n > 0) throw new Error('The target database already has customers. Refusing to import twice.');

    // ---- customers
    const customerMap = new Map(); // legacy id -> new id
    const { rows: seq } = await client.query('SELECT COALESCE(max(customer_number), 0) AS n FROM customers');
    let number = Number(seq[0].n);
    const customers = [...(dump.customers || [])].sort((a, b) => a.id - b.id);
    for (const c of customers) {
      number += 1;
      const mail = String(c.email || '').trim().toLowerCase();
      if (!mail) { issue(`customer #${c.id} (${c.name}) has no email: skipped`); number -= 1; continue; }
      const plain = String(c.password || '');
      if (!plain) issue(`customer #${c.id} (${mail}) has no password: they must use "Forgot password"`);
      const { rows } = await client.query(
        `INSERT INTO customers (customer_number, customer_id, full_name, email, phone, password_hash, delivery_destination, preferred_shipping_method)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'air') RETURNING id`,
        [number, formatCustomerId(number), String(c.name || mail).trim(), mail, String(c.phone || '').trim() || 'N/A',
          await bcrypt.hash(plain || require('crypto').randomBytes(12).toString('hex'), 10), String(c.address || '').trim() || 'To be confirmed'],
      );
      customerMap.set(c.id, rows[0].id);
    }
    count('customers', customers.length, customerMap.size);

    // ---- shipments
    const shipmentMap = new Map(); // legacy trackingId -> new id
    let eventCount = 0;
    for (const s of dump.shipments || []) {
      const owner = customerMap.get(s.customerId);
      if (!owner) { issue(`shipment ${s.trackingId} has no (valid) customer: NOT imported. Assign it to a customer and add it by hand.`); continue; }
      const status = toSlug(s.status);
      if (!status) issue(`shipment ${s.trackingId}: unknown status "${s.status}" kept as-is`);
      const eta = validDate(s.estimatedArrival);
      if (s.estimatedArrival && !eta) issue(`shipment ${s.trackingId}: estimated arrival "${s.estimatedArrival}" is not a date, dropped`);
      const weightText = s.weight === null || s.weight === undefined || String(s.weight).trim() === '' ? null : String(s.weight).trim();
      const plain = /^(\d+(?:\.\d+)?)\s*(?:kg)?$/i.exec(weightText || '');
      const created = validDate(s.shippedDate) || new Date().toISOString().slice(0, 10);
      const { rows } = await client.query(
        `INSERT INTO shipments (tracking_number, customer_id, shipping_method, description, packages, weight_kg, weight_text, status,
                                estimated_arrival, created_at, updated_at, origin, destination, carrier, service, shipped_date, ordered_quantity, unit)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
        [String(s.trackingId).toUpperCase(), owner, methodFor(s.service), s.itemDescription || '',
          Number.isInteger(s.pieces) && s.pieces > 0 ? s.pieces : null, plain ? Number(plain[1]) : null, weightText,
          status || String(s.status || 'received'), eta, created, s.origin || null, s.destination || null, s.carrier || null,
          s.service || null, s.shippedDate || null, Number.isInteger(s.orderedQuantity) && s.orderedQuantity > 0 ? s.orderedQuantity : null, s.unit || null],
      );
      shipmentMap.set(s.trackingId, rows[0].id);

      let history = json(s.history, []);
      if (!Array.isArray(history)) history = [];
      if (!history.length) history = [{ date: created, time: '00:00', status: s.status, location: s.origin, details: 'Imported from the previous system' }];
      for (const h of history) {
        const at = Date.parse(`${h.date}T${h.time || '00:00'}:00Z`);
        await client.query(
          'INSERT INTO shipment_events (shipment_id, status, note, location, created_by, occurred_at) VALUES ($1,$2,$3,$4,$5,$6)',
          [rows[0].id, toSlug(h.status) || String(h.status || ''), h.details || null, h.location || null, 'import', Number.isNaN(at) ? new Date(created) : new Date(at)],
        );
        eventCount += 1;
      }
    }
    count('shipments', (dump.shipments || []).length, shipmentMap.size);
    report.counts['shipment events'] = String(eventCount);

    let installments = 0;
    for (const i of dump.shipment_installments || []) {
      const sid = shipmentMap.get(i.trackingId);
      if (!sid) { issue(`installment #${i.id} belongs to a shipment that was not imported: skipped`); continue; }
      await client.query(
        'INSERT INTO shipment_installments (shipment_id, quantity, container_number, photo_url, qr_code_data_url, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
        [sid, i.quantity, i.containerNumber || null, i.photoUrl || null, i.qrCodeDataUrl || null, i.createdAt || new Date()],
      );
      installments += 1;
    }
    count('installments', (dump.shipment_installments || []).length, installments);

    // ---- invoices
    let invoices = 0;
    for (const inv of dump.invoices || []) {
      const owner = customerMap.get(inv.customerId);
      if (!owner) { issue(`invoice ${inv.id} has no (valid) customer: skipped`); continue; }
      const items = json(inv.items, []);
      if (!Array.isArray(items) || !items.length) { issue(`invoice ${inv.id} has no line items: skipped`); continue; }
      const lines = items.map((it, n) => {
        const qty = Number(it.quantity) || 1;
        const unit = Math.round((Number(it.price) || 0) * 100);
        return { n: n + 1, description: String(it.description || 'Item'), qty, unit, amount: Math.round(qty * unit) };
      });
      const total = lines.reduce((sum, l) => sum + l.amount, 0);
      const paid = inv.status === 'Paid';
      const shipment = inv.shipmentId ? shipmentMap.get(inv.shipmentId) : null;
      if (inv.shipmentId && !shipment) issue(`invoice ${inv.id}: shipment ${inv.shipmentId} was not imported, link dropped`);
      const type = ['Invoice', 'Receipt', 'Proforma'].includes(inv.type) ? inv.type : 'Invoice';
      const { rows } = await client.query(
        `INSERT INTO invoices (invoice_number, customer_id, shipment_id, currency, subtotal_cents, total_cents, paid_cents, status, issued_at, doc_type)
         VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$8,$9) RETURNING id`,
        [inv.id, owner, shipment || null, CURRENCY, total, paid ? total : 0, paid ? 'paid' : 'unpaid', validDate(inv.date) || new Date(), type],
      );
      for (const l of lines) {
        await client.query(
          'INSERT INTO invoice_items (invoice_id, position, description, quantity, unit_price_cents, amount_cents) VALUES ($1,$2,$3,$4,$5,$6)',
          [rows[0].id, l.n, l.description, l.qty, l.unit, l.amount],
        );
      }
      invoices += 1;
    }
    count('invoices', (dump.invoices || []).length, invoices);
    if ((dump.invoices || []).some((i) => i.status === 'Paid')) {
      issue('Paid invoices are imported as fully paid but without payment records, so they have no receipt in the app.');
    }

    // ---- website content
    const scoped = [['homepage_content', 'homepage'], ['site_settings', 'settings'], ['popup_settings', 'popup'], ['booking_page_content', 'booking_page']];
    for (const [table, scope] of scoped) {
      let n = 0;
      for (const r of dump[table] || []) {
        if (scope === 'settings' && /^admin_/.test(r.key)) continue; // admin credentials are not carried over
        const value = r.value === null || r.value === undefined ? null : typeof r.value === 'string' ? r.value : JSON.stringify(r.value);
        await client.query('INSERT INTO site_content (scope, key, value) VALUES ($1,$2,$3)', [scope, r.key, value]);
        n += 1;
      }
      count(table, (dump[table] || []).length, n);
    }

    for (const r of dump.services || []) {
      await client.query(
        'INSERT INTO site_services (id, name, short_description, long_description, icon_name, image, key_features) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [r.id, r.name, r.shortDescription, r.longDescription, r.iconName, r.image, JSON.stringify(json(r.keyFeatures, []))],
      );
    }
    count('services', (dump.services || []).length, (dump.services || []).length);
    for (const r of dump.faqs || []) await client.query('INSERT INTO site_faqs (question, answer) VALUES ($1,$2)', [r.question, r.answer]);
    count('faqs', (dump.faqs || []).length, (dump.faqs || []).length);
    for (const r of dump.slides || []) {
      await client.query('INSERT INTO site_slides (type, url, title, subtitle, sort_order) VALUES ($1,$2,$3,$4,$5)', [r.type, r.url, r.title, r.subtitle, r.sortOrder ?? 0]);
    }
    count('slides', (dump.slides || []).length, (dump.slides || []).length);
    for (const r of dump.addresses || []) {
      await client.query('INSERT INTO site_addresses (title, address, sort_order) VALUES ($1,$2,$3)', [r.title, r.address, r.sort_order ?? 99]);
    }
    count('addresses', (dump.addresses || []).length, (dump.addresses || []).length);
    for (const r of dump.phone_numbers || []) {
      await client.query('INSERT INTO site_phones (label, number, show_in_header, sort_order) VALUES ($1,$2,$3,$4)', [r.label, r.number, !!r.show_in_header, r.sort_order ?? 99]);
    }
    count('phone_numbers', (dump.phone_numbers || []).length, (dump.phone_numbers || []).length);
    for (const r of dump.testimonials || []) {
      await client.query(
        'INSERT INTO testimonials (name, company, message, rating, status, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
        [r.name, r.company, r.message, r.rating, r.status || 'pending', r.created_at || new Date()],
      );
    }
    count('testimonials', (dump.testimonials || []).length, (dump.testimonials || []).length);
    for (const r of dump.newsletter_subscribers || []) {
      await client.query('INSERT INTO newsletter_subscribers (email, name, subscribed_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [String(r.email).toLowerCase(), r.name, r.subscribed_at || new Date()]);
    }
    count('newsletter_subscribers', (dump.newsletter_subscribers || []).length, (dump.newsletter_subscribers || []).length);

    // Hand the sequences on, so the next customer registered continues after the imported ones.
    if (number > 0) await client.query("SELECT setval('customer_number_seq', $1)", [number]);

    if ((dump.site_settings || []).find((r) => r.key === 'admin_password')?.value === 'admin123') {
      issue('The old admin password is the default "admin123". It was NOT imported; set ADMIN_EMAIL / ADMIN_PASSWORD on the new server.');
    }

    if (commit) await client.query('COMMIT');
    else await client.query('ROLLBACK');
    return report;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  const [file, ...flags] = process.argv.slice(2);
  if (!file) {
    console.error('Usage: node scripts/migrate-from-mysql.js <mysql-dump.json> [--commit]');
    process.exit(2);
  }
  const commit = flags.includes('--commit');
  const dump = JSON.parse(fs.readFileSync(file, 'utf8'));
  await migrate();
  const report = await run(dump, { commit });
  console.log(commit ? '\nIMPORT COMMITTED\n' : '\nDRY RUN (nothing was saved)\n');
  console.log('Imported (written of read):');
  for (const [k, v] of Object.entries(report.counts)) console.log(`  ${k.padEnd(24)} ${v}`);
  console.log(`\nThings to review (${report.issues.length}):`);
  for (const i of report.issues) console.log(`  - ${i}`);
}

module.exports = { run };

if (require.main === module) {
  main()
    .then(() => db.pool.end())
    .catch((err) => {
      console.error('\nFAILED:', err.message);
      db.pool.end().finally(() => process.exit(1));
    });
}
