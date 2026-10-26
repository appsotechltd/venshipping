const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const env = process.env;

function list(value) {
  return (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const config = {
  env: env.NODE_ENV || 'development',
  port: Number(env.PORT || 4000),
  corsOrigin: env.CORS_ORIGIN || '*',
  databaseUrl: env.DATABASE_URL || 'postgres://ven:ven@localhost:5432/venshipping',
  jwt: {
    secret: env.JWT_SECRET || 'dev-only-secret',
    expiresIn: env.JWT_EXPIRES_IN || '30d',
  },
  customer: {
    code: env.CUSTOMER_CODE || 'FWB2423',
    companyName: env.COMPANY_NAME || 'VEN SHIPPING',
    idPadding: Number(env.CUSTOMER_ID_PADDING || 4),
  },
  mail: {
    host: env.SMTP_HOST || '',
    port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_SECURE === 'true',
    user: env.SMTP_USER || '',
    pass: env.SMTP_PASS || '',
    from: env.MAIL_FROM || 'VEN Shipping <no-reply@venshipping.com>',
    adminRecipients: list(env.ADMIN_NOTIFICATION_EMAIL || 'admin@venshipping.com'),
    supportEmail: env.SUPPORT_EMAIL || 'support@venshipping.com',
    supportPhone: env.SUPPORT_PHONE || '',
  },
  // Staff key for /api/admin and the /admin page. Leave empty to switch staff access off.
  adminApiKey: env.ADMIN_API_KEY || '',
  warehousesFile: path.resolve(__dirname, '..', env.WAREHOUSES_FILE || 'config/warehouses.json'),
};

if (config.env === 'production' && config.jwt.secret === 'dev-only-secret') {
  throw new Error('JWT_SECRET must be set in production');
}

config.loadWarehouses = function loadWarehouses() {
  return JSON.parse(fs.readFileSync(config.warehousesFile, 'utf8'));
};

module.exports = config;
