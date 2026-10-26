const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const authRoutes = require('./routes/auth');
const meRoutes = require('./routes/me');
const { shippingInstructions } = require('./services/warehouse');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }));
app.use(express.json({ limit: '100kb' }));

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/me', meRoutes);
app.get('/api/shipping-instructions', (req, res) => res.json(shippingInstructions()));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.status === 422) return res.status(422).json({ error: err.message, fields: err.fields });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

module.exports = app;
