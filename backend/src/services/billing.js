const config = require('../config');
const db = require('../db');
const { ValidationError } = require('./customers');

const PAYMENT_METHODS = {
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  mobile_money: 'Mobile money',
  card: 'Card',
  other: 'Other',
};

const STATUS_LABELS = {
  unpaid: 'Unpaid',
  part_paid: 'Part paid',
  paid: 'Paid',
  void: 'Cancelled',
};

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.status = 404;
  }
}

// 12.5 or "12.50" -> 1250. Returns null for anything that is not a non-negative amount.
function toCents(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function formatMoney(cents, currency) {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

function formatInvoiceNumber(n) {
  return `INV-${String(n).padStart(6, '0')}`;
}

function formatReceiptNumber(n) {
  return `RCT-${String(n).padStart(6, '0')}`;
}

function billingSettings() {
  const settings = config.loadBilling();
  return {
    currency: settings.currency || 'USD',
    company: settings.company || { name: 'VEN International Logistics Ltd', addressLines: [] },
    paymentInstructions: settings.paymentInstructions || [],
    invoiceFooter: settings.invoiceFooter || '',
  };
}

function validateInvoice(body = {}) {
  const fields = {};
  const customerId = String(body.customerId || '').trim().toUpperCase();
  if (!customerId) fields.customerId = 'Enter the customer ID, e.g. FWB2423-0001.';

  const currency = String(body.currency || billingSettings().currency).trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) fields.currency = 'Use a 3-letter currency code, e.g. USD or GHS.';

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = [];
  rawItems.forEach((item, i) => {
    const description = String(item?.description || '').trim();
    const quantity = item?.quantity === undefined || item?.quantity === '' ? 1 : Number(item.quantity);
    const unitPriceCents = toCents(item?.unitPrice);
    if (!description) fields[`items.${i}.description`] = 'Describe this charge.';
    if (!Number.isFinite(quantity) || quantity <= 0) fields[`items.${i}.quantity`] = 'Quantity must be more than 0.';
    if (unitPriceCents === null) fields[`items.${i}.unitPrice`] = 'Enter a price of 0 or more.';
    items.push({
      description,
      quantity: Math.round(quantity * 1000) / 1000,
      unit: String(item?.unit || '').trim() || null,
      unitPriceCents,
      amountCents: Math.round(quantity * unitPriceCents),
    });
  });
  if (!items.length) fields.items = 'Add at least one charge.';

  let dueDate = null;
  if (body.dueDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.dueDate)) || Number.isNaN(Date.parse(body.dueDate))) {
      fields.dueDate = 'Use the date format YYYY-MM-DD.';
    } else {
      dueDate = String(body.dueDate);
    }
  }

  let shipmentId = null;
  if (body.shipmentId !== undefined && body.shipmentId !== null && body.shipmentId !== '') {
    shipmentId = Number(body.shipmentId);
    if (!Number.isInteger(shipmentId) || shipmentId <= 0) fields.shipmentId = 'Invalid shipment.';
  }

  if (Object.keys(fields).length) throw new ValidationError(fields);
  return {
    customerId,
    currency,
    items,
    dueDate,
    shipmentId,
    notes: String(body.notes || '').trim() || null,
  };
}

async function loadInvoice(where, params, client = db) {
  const { rows } = await client.query(`SELECT * FROM invoices WHERE ${where}`, params);
  const invoice = rows[0];
  if (!invoice) return null;
  const [{ rows: items }, { rows: payments }] = await Promise.all([
    client.query('SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY position', [invoice.id]),
    client.query('SELECT * FROM payments WHERE invoice_id = $1 ORDER BY paid_at, id', [invoice.id]),
  ]);
  return { ...invoice, items, payments };
}

async function loadCustomer(id, client = db) {
  const { rows } = await client.query('SELECT * FROM customers WHERE id = $1', [id]);
  return rows[0];
}

// Staff create an invoice for a customer by their customer ID (FWB2423-0001).
async function createInvoice(body) {
  const input = validateInvoice(body);
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: found } = await client.query('SELECT * FROM customers WHERE upper(customer_id) = $1', [input.customerId]);
    const customer = found[0];
    if (!customer) throw new ValidationError({ customerId: `No customer with ID ${input.customerId}.` });

    const subtotal = input.items.reduce((sum, item) => sum + item.amountCents, 0);
    const { rows: seq } = await client.query("SELECT nextval('invoice_number_seq')::int AS n");
    const { rows } = await client.query(
      `INSERT INTO invoices (invoice_number, customer_id, shipment_id, currency, subtotal_cents, total_cents, notes, due_date)
       VALUES ($1, $2, $3, $4, $5, $5, $6, $7) RETURNING id`,
      [formatInvoiceNumber(seq[0].n), customer.id, input.shipmentId, input.currency, subtotal, input.notes, input.dueDate],
    );
    const invoiceId = rows[0].id;
    for (const [i, item] of input.items.entries()) {
      await client.query(
        `INSERT INTO invoice_items (invoice_id, position, description, quantity, unit, unit_price_cents, amount_cents)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [invoiceId, i + 1, item.description, item.quantity, item.unit, item.unitPriceCents, item.amountCents],
      );
    }
    const invoice = await loadInvoice('id = $1', [invoiceId], client);
    await client.query('COMMIT');
    return { invoice, customer };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function validatePayment(body = {}, invoice) {
  const fields = {};
  const amountCents = toCents(body.amount);
  const balance = Number(invoice.total_cents) - Number(invoice.paid_cents);
  if (!amountCents) fields.amount = 'Enter the amount paid.';
  else if (amountCents > balance) fields.amount = `This is more than the ${formatMoney(balance, invoice.currency)} still owed.`;
  const method = String(body.method || '').trim().toLowerCase();
  if (!PAYMENT_METHODS[method]) fields.method = `Choose one of: ${Object.keys(PAYMENT_METHODS).join(', ')}.`;
  let paidAt = new Date();
  if (body.paidAt) {
    paidAt = new Date(body.paidAt);
    if (Number.isNaN(paidAt.getTime())) fields.paidAt = 'Invalid payment date.';
  }
  if (Object.keys(fields).length) throw new ValidationError(fields);
  return { amountCents, method, paidAt, reference: String(body.reference || '').trim() || null };
}

// Records a payment against an invoice. Each payment gets its own receipt number.
async function recordPayment(invoiceNumber, body) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM invoices WHERE upper(invoice_number) = upper($1) FOR UPDATE', [invoiceNumber]);
    const invoice = rows[0];
    if (!invoice) throw new NotFoundError('Invoice not found.');
    if (invoice.status === 'void') throw new ValidationError({ invoice: 'This invoice has been cancelled.' });
    if (invoice.status === 'paid') throw new ValidationError({ invoice: 'This invoice is already paid in full.' });

    const input = validatePayment(body, invoice);
    const { rows: seq } = await client.query("SELECT nextval('receipt_number_seq')::int AS n");
    const { rows: inserted } = await client.query(
      `INSERT INTO payments (receipt_number, invoice_id, customer_id, amount_cents, currency, method, reference, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [formatReceiptNumber(seq[0].n), invoice.id, invoice.customer_id, input.amountCents, invoice.currency, input.method, input.reference, input.paidAt],
    );
    const paid = Number(invoice.paid_cents) + input.amountCents;
    await client.query('UPDATE invoices SET paid_cents = $2, status = $3 WHERE id = $1', [
      invoice.id,
      paid,
      paid >= Number(invoice.total_cents) ? 'paid' : 'part_paid',
    ]);
    const updated = await loadInvoice('id = $1', [invoice.id], client);
    const customer = await loadCustomer(invoice.customer_id, client);
    await client.query('COMMIT');
    return { payment: inserted[0], invoice: updated, customer };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function voidInvoice(invoiceNumber) {
  const { rows } = await db.query('SELECT * FROM invoices WHERE upper(invoice_number) = upper($1)', [invoiceNumber]);
  const invoice = rows[0];
  if (!invoice) throw new NotFoundError('Invoice not found.');
  if (Number(invoice.paid_cents) > 0) throw new ValidationError({ invoice: 'This invoice has payments, so it cannot be cancelled.' });
  await db.query("UPDATE invoices SET status = 'void', voided_at = now() WHERE id = $1", [invoice.id]);
  return loadInvoice('id = $1', [invoice.id]);
}

async function invoicesForCustomer(customerDbId) {
  const { rows } = await db.query(
    `SELECT i.*, (SELECT count(*)::int FROM invoice_items WHERE invoice_id = i.id) AS item_count
       FROM invoices i WHERE i.customer_id = $1 ORDER BY i.issued_at DESC, i.id DESC`,
    [customerDbId],
  );
  return rows;
}

async function invoiceForCustomer(customerDbId, invoiceNumber) {
  return loadInvoice('customer_id = $1 AND upper(invoice_number) = upper($2)', [customerDbId, invoiceNumber]);
}

async function invoiceByNumber(invoiceNumber) {
  return loadInvoice('upper(invoice_number) = upper($1)', [invoiceNumber]);
}

// Receipts with the invoice they paid and what was still owed after each one.
const RECEIPT_SQL = `
  SELECT p.*, i.invoice_number, i.total_cents AS invoice_total_cents, i.status AS invoice_status,
         sum(p.amount_cents) OVER (PARTITION BY p.invoice_id ORDER BY p.paid_at, p.id) AS paid_to_date_cents
    FROM payments p JOIN invoices i ON i.id = p.invoice_id`;

async function receiptsForCustomer(customerDbId) {
  const { rows } = await db.query(`SELECT * FROM (${RECEIPT_SQL} WHERE p.customer_id = $1) r ORDER BY paid_at DESC, id DESC`, [customerDbId]);
  return rows;
}

async function receiptForCustomer(customerDbId, receiptNumber) {
  const { rows } = await db.query(
    `SELECT * FROM (${RECEIPT_SQL} WHERE p.customer_id = $1) r WHERE upper(receipt_number) = upper($2)`,
    [customerDbId, receiptNumber],
  );
  return rows[0] || null;
}

async function receiptById(paymentId) {
  const { rows } = await db.query(`SELECT * FROM (${RECEIPT_SQL}) r WHERE id = $1`, [paymentId]);
  return rows[0] || null;
}

function isOverdue(invoice) {
  if (!invoice.due_date || !['unpaid', 'part_paid'].includes(invoice.status)) return false;
  const due = new Date(invoice.due_date);
  due.setHours(23, 59, 59, 999);
  return due < new Date();
}

function dateOnly(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function invoiceSummary(invoice) {
  const total = Number(invoice.total_cents);
  const paid = Number(invoice.paid_cents);
  return {
    invoiceNumber: invoice.invoice_number,
    status: invoice.status,
    statusLabel: STATUS_LABELS[invoice.status],
    overdue: isOverdue(invoice),
    currency: invoice.currency,
    totalCents: total,
    paidCents: paid,
    balanceCents: invoice.status === 'void' ? 0 : total - paid,
    issuedAt: invoice.issued_at,
    dueDate: dateOnly(invoice.due_date),
    shipmentId: invoice.shipment_id === null ? null : Number(invoice.shipment_id),
    itemCount: invoice.item_count ?? invoice.items?.length ?? 0,
  };
}

function receiptPublic(receipt) {
  const invoiceTotal = Number(receipt.invoice_total_cents);
  const paidToDate = Number(receipt.paid_to_date_cents);
  return {
    receiptNumber: receipt.receipt_number,
    invoiceNumber: receipt.invoice_number,
    currency: receipt.currency,
    amountCents: Number(receipt.amount_cents),
    method: receipt.method,
    methodLabel: PAYMENT_METHODS[receipt.method],
    reference: receipt.reference,
    paidAt: receipt.paid_at,
    invoiceTotalCents: invoiceTotal,
    paidToDateCents: paidToDate,
    balanceAfterCents: Math.max(invoiceTotal - paidToDate, 0),
  };
}

function invoicePublic(invoice) {
  const settings = billingSettings();
  let paidSoFar = 0;
  return {
    ...invoiceSummary(invoice),
    subtotalCents: Number(invoice.subtotal_cents),
    notes: invoice.notes,
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unit: item.unit,
      unitPriceCents: Number(item.unit_price_cents),
      amountCents: Number(item.amount_cents),
    })),
    payments: invoice.payments.map((p) => {
      paidSoFar += Number(p.amount_cents);
      return receiptPublic({
        ...p,
        invoice_number: invoice.invoice_number,
        invoice_total_cents: invoice.total_cents,
        paid_to_date_cents: paidSoFar,
      });
    }),
    billing: {
      company: settings.company,
      paymentInstructions: settings.paymentInstructions,
      footer: settings.invoiceFooter,
    },
  };
}

module.exports = {
  PAYMENT_METHODS,
  STATUS_LABELS,
  NotFoundError,
  toCents,
  formatMoney,
  formatInvoiceNumber,
  formatReceiptNumber,
  billingSettings,
  createInvoice,
  recordPayment,
  voidInvoice,
  invoicesForCustomer,
  invoiceForCustomer,
  invoiceByNumber,
  receiptsForCustomer,
  receiptForCustomer,
  receiptById,
  invoiceSummary,
  invoicePublic,
  receiptPublic,
};
