const express = require('express');
const { requireAuth } = require('../middleware/auth');
const billing = require('../services/billing');
const { sendInvoiceEmail, sendReceiptEmail } = require('../services/email');

// The signed-in customer's invoices and payment receipts. Mounted at /api/me.
const router = express.Router();

router.use(requireAuth);

router.get('/invoices', async (req, res, next) => {
  try {
    const invoices = await billing.invoicesForCustomer(req.customer.id);
    const summaries = invoices.map(billing.invoiceSummary);
    // Totals per currency so the app can show "You owe" without adding up mixed currencies.
    const outstanding = {};
    for (const s of summaries) {
      if (s.balanceCents > 0) outstanding[s.currency] = (outstanding[s.currency] || 0) + s.balanceCents;
    }
    res.json({
      invoices: summaries,
      outstanding: Object.entries(outstanding).map(([currency, amountCents]) => ({ currency, amountCents })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/invoices/:number', async (req, res, next) => {
  try {
    const invoice = await billing.invoiceForCustomer(req.customer.id, req.params.number);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });
    res.json({ invoice: billing.invoicePublic(invoice) });
  } catch (err) {
    next(err);
  }
});

// "Email me a copy" in the app.
router.post('/invoices/:number/email', async (req, res, next) => {
  try {
    const invoice = await billing.invoiceForCustomer(req.customer.id, req.params.number);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });
    await sendInvoiceEmail(req.customer, billing.invoicePublic(invoice));
    res.json({ message: `We've emailed invoice ${invoice.invoice_number} to ${req.customer.email}.` });
  } catch (err) {
    next(err);
  }
});

router.get('/receipts', async (req, res, next) => {
  try {
    const receipts = await billing.receiptsForCustomer(req.customer.id);
    res.json({ receipts: receipts.map(billing.receiptPublic) });
  } catch (err) {
    next(err);
  }
});

router.get('/receipts/:number', async (req, res, next) => {
  try {
    const receipt = await billing.receiptForCustomer(req.customer.id, req.params.number);
    if (!receipt) return res.status(404).json({ error: 'Receipt not found.' });
    res.json({ receipt: billing.receiptPublic(receipt) });
  } catch (err) {
    next(err);
  }
});

router.post('/receipts/:number/email', async (req, res, next) => {
  try {
    const receipt = await billing.receiptForCustomer(req.customer.id, req.params.number);
    if (!receipt) return res.status(404).json({ error: 'Receipt not found.' });
    await sendReceiptEmail(req.customer, billing.receiptPublic(receipt));
    res.json({ message: `We've emailed receipt ${receipt.receipt_number} to ${req.customer.email}.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
