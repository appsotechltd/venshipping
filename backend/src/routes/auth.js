const express = require('express');
const { createCustomer, authenticate, toPublic } = require('../services/customers');
const { addressesFor } = require('../services/warehouse');
const { sendRegistrationEmails } = require('../services/email');
const { signToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const customer = await createCustomer(req.body);
    // Fired automatically on every successful registration; staff never send these by hand.
    // Not awaited so the customer gets their address in the app without waiting on SMTP.
    sendRegistrationEmails(customer).catch((err) => console.error('Registration emails:', err));
    res.status(201).json({
      token: signToken(customer),
      customer: toPublic(customer),
      warehouseAddresses: addressesFor(customer),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const customer = await authenticate(req.body?.email, req.body?.password);
    if (!customer) return res.status(401).json({ error: 'Incorrect email or password.' });
    res.json({ token: signToken(customer), customer: toPublic(customer) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
