const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { toPublic } = require('../services/customers');
const { addressesFor } = require('../services/warehouse');
const { listForCustomer, getForCustomer } = require('../services/shipments');

const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  res.json({ customer: toPublic(req.customer) });
});

router.get('/warehouse-addresses', (req, res) => {
  res.json({ warehouseAddresses: addressesFor(req.customer) });
});

router.get('/shipments', async (req, res, next) => {
  try {
    res.json({ shipments: await listForCustomer(req.customer.id) });
  } catch (err) {
    next(err);
  }
});

// Full tracking timeline for one shipment. Customers only ever see their own shipments.
router.get('/shipments/:trackingNumber', async (req, res, next) => {
  try {
    res.json({ shipment: await getForCustomer(req.customer.id, req.params.trackingNumber) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
