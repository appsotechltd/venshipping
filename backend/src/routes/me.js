const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { toPublic } = require('../services/customers');
const { addressesFor } = require('../services/warehouse');

const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  res.json({ customer: toPublic(req.customer) });
});

router.get('/warehouse-addresses', (req, res) => {
  res.json({ warehouseAddresses: addressesFor(req.customer) });
});

module.exports = router;
