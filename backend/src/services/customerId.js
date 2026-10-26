const config = require('../config');

// FWB2423 + sequence number -> FWB2423-0001. Numbers past the padding keep growing (FWB2423-10000).
function formatCustomerId(number, { code, idPadding } = config.customer) {
  return `${code}-${String(number).padStart(idPadding, '0')}`;
}

// The mark suppliers write on every carton and in the recipient name: FWB2423-0001 (VEN SHIPPING)
function shippingMark(customerId, { companyName } = config.customer) {
  return `${customerId} (${companyName})`;
}

module.exports = { formatCustomerId, shippingMark };
