const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const authRoutes = require('./routes/auth');
const meRoutes = require('./routes/me');
const adminShipmentRoutes = require('./routes/adminShipments');
const billingRoutes = require('./routes/billing');
const adminBillingRoutes = require('./routes/adminBilling');
const { shippingInstructions } = require('./services/warehouse');
const web = require('./web');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }));
app.use(express.json({ limit: '100kb' }));

// Staff page for receiving goods and updating shipment statuses. It signs in with ADMIN_API_KEY.
app.use('/admin', express.static(path.join(__dirname, '..', 'public', 'admin')));
// Uploaded images and videos for the website.
app.use('/uploads', express.static(web.uploadDir));
app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/web', web.router);
app.use('/api/auth', authRoutes);
app.use('/api/me', meRoutes);
app.use('/api/admin', adminShipmentRoutes);
app.use('/api/me', billingRoutes);
app.use('/api/admin', adminBillingRoutes);
app.get('/api/shipping-instructions', (req, res) => res.json(shippingInstructions()));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.status === 404) return res.status(404).json({ error: err.message });
  if (err.status === 422) return res.status(422).json({ error: err.message, fields: err.fields });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

module.exports = app;
