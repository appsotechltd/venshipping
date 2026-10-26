const express = require('express');
const { requireAdmin } = require('../middleware/admin');
const shipments = require('../services/shipments');

const router = express.Router();

router.use(requireAdmin);

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

// The statuses staff can choose from, in journey order, plus on_hold.
router.get('/shipment-statuses', (req, res) => {
  res.json({ stages: shipments.STAGES, onHold: shipments.ON_HOLD });
});

// Find a customer by ID, name, phone or email when goods arrive.
router.get('/customers', wrap(async (req, res) => {
  res.json({ customers: await shipments.searchCustomers(req.query.q) });
}));

router.get('/shipments', wrap(async (req, res) => {
  res.json({ shipments: await shipments.listShipments(req.query) });
}));

// Goods received at a China warehouse: { customerId or shippingMark, shippingMethod?, description,
// packages, weightKg, volumeCbm, supplierTracking, estimatedArrival, note, location }
router.post('/shipments', wrap(async (req, res) => {
  res.status(201).json({ shipment: await shipments.createShipment(req.body, req.staffName) });
}));

// Move many shipments at once, e.g. a whole container: { trackingNumbers: [...], status, note, location, estimatedArrival }
router.post('/shipments/status', wrap(async (req, res) => {
  res.json({ shipments: await shipments.updateStatus(req.body?.trackingNumbers, req.body, req.staffName) });
}));

router.get('/shipments/:trackingNumber', wrap(async (req, res) => {
  res.json({ shipment: await shipments.getAdminShipment(req.params.trackingNumber) });
}));

router.patch('/shipments/:trackingNumber', wrap(async (req, res) => {
  res.json({ shipment: await shipments.updateDetails(req.params.trackingNumber, req.body) });
}));

// { status, note, location, estimatedArrival }
router.post('/shipments/:trackingNumber/status', wrap(async (req, res) => {
  const [shipment] = await shipments.updateStatus([req.params.trackingNumber], req.body, req.staffName);
  res.json({ shipment });
}));

module.exports = router;
