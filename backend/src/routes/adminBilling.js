const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/admin');
const billing = require('../services/billing');
const { sendInvoiceEmail, sendReceiptEmail } = require('../services/email');

// Staff endpoints for invoices and payments. Mounted at /api/admin; send X-Admin-Key.
const router = express.Router();

router.use(['/invoices', '/billing'], requireAdmin);

function emailInBackground(promise, what) {
  promise.catch((err) => console.error(`${what} email:`, err.message));
}

// Create an invoice and email it to the customer.
// Body: { customerId: "FWB2423-0001", items: [{ description, quantity, unit, unitPrice }],
//         currency?, dueDate?: "YYYY-MM-DD", notes?, shipmentId?, sendEmail?: true }
router.post('/invoices', async (req, res, next) => {
  try {
    const { invoice, customer } = await billing.createInvoice(req.body);
    const result = billing.invoicePublic(invoice);
    if (req.body?.sendEmail !== false) emailInBackground(sendInvoiceEmail(customer, result), 'Invoice');
    res.status(201).json({ invoice: result, customerId: customer.customer_id });
  } catch (err) {
    next(err);
  }
});

router.get('/invoices/:number', async (req, res, next) => {
  try {
    const invoice = await billing.invoiceByNumber(req.params.number);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });
    res.json({ invoice: billing.invoicePublic(invoice) });
  } catch (err) {
    next(err);
  }
});

// Record a payment. The customer is emailed a receipt automatically.
// Body: { amount: 120.5, method: "mobile_money", reference?, paidAt?, sendEmail?: true }
router.post('/invoices/:number/payments', async (req, res, next) => {
  try {
    const { payment, invoice, customer } = await billing.recordPayment(req.params.number, req.body);
    const receipt = billing.receiptPublic(await billing.receiptById(payment.id));
    if (req.body?.sendEmail !== false) emailInBackground(sendReceiptEmail(customer, receipt), 'Receipt');
    res.status(201).json({ receipt, invoice: billing.invoicePublic(invoice) });
  } catch (err) {
    next(err);
  }
});

// Cancel an invoice that has no payments. The customer is told by email.
router.post('/invoices/:number/void', async (req, res, next) => {
  try {
    const invoice = await billing.voidInvoice(req.params.number);
    const result = billing.invoicePublic(invoice);
    const { rows } = await db.query('SELECT * FROM customers WHERE id = $1', [invoice.customer_id]);
    if (req.body?.sendEmail !== false) emailInBackground(sendInvoiceEmail(rows[0], result), 'Invoice cancelled');
    res.json({ invoice: result });
  } catch (err) {
    next(err);
  }
});

// Payment methods and default currency, for staff tools.
router.get('/billing/settings', (req, res) => {
  const settings = billing.billingSettings();
  res.json({ currency: settings.currency, paymentMethods: billing.PAYMENT_METHODS });
});

module.exports = router;
