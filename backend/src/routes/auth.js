const express = require('express');
const { createCustomer, authenticate, toPublic } = require('../services/customers');
const { addressesFor } = require('../services/warehouse');
const { sendRegistrationEmails, sendPasswordResetEmail, sendPasswordChangedEmail } = require('../services/email');
const { startPasswordReset, completePasswordReset } = require('../services/passwordReset');
const config = require('../config');
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

// Emails a 6-digit code. Answers the same whether or not the email has an account.
router.post('/forgot-password', async (req, res, next) => {
  try {
    const started = await startPasswordReset(req.body?.email);
    if (started) {
      sendPasswordResetEmail(started.customer, started.code, config.passwordReset.codeTtlMinutes).catch((err) =>
        console.error('Password reset email:', err.message),
      );
    }
    res.json({
      message: 'If an account uses that email, we have sent it a 6-digit code. It can take a minute to arrive.',
      codeTtlMinutes: config.passwordReset.codeTtlMinutes,
    });
  } catch (err) {
    next(err);
  }
});

// Checks the code, sets the new password and logs the customer straight in.
router.post('/reset-password', async (req, res, next) => {
  try {
    const customer = await completePasswordReset(req.body);
    sendPasswordChangedEmail(customer).catch((err) => console.error('Password changed email:', err.message));
    res.json({ token: signToken(customer), customer: toPublic(customer) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
