const config = require('../config');
const { shippingMark } = require('./customerId');

const METHODS = ['air', 'sea'];

function fill(template, mark) {
  return String(template || '').split('{mark}').join(mark);
}

function personalise(warehouse, customer) {
  const mark = shippingMark(customer.customer_id);
  const address = {
    method: warehouse.method,
    label: warehouse.label,
    shippingMark: mark,
    recipient: fill(warehouse.recipient, mark),
    phone: warehouse.phone,
    addressLine: fill(warehouse.addressLine, mark),
    city: warehouse.city,
    province: warehouse.province,
    postalCode: warehouse.postalCode,
    country: warehouse.country,
    transitTime: warehouse.transitTime || null,
    notes: warehouse.notes || [],
  };
  address.fullText = [
    `Recipient: ${address.recipient}`,
    `Phone: ${address.phone}`,
    `Address: ${address.addressLine}`,
    `${address.city}, ${address.province} ${address.postalCode}`.trim(),
    address.country,
    `Shipping mark: ${mark}`,
  ].join('\n');
  return address;
}

// Returns the customer's personalised address for each shipping method, preferred method first.
function addressesFor(customer) {
  const { warehouses } = config.loadWarehouses();
  const preferred = customer.preferred_shipping_method;
  return warehouses
    .filter((w) => METHODS.includes(w.method))
    .sort((a, b) => (a.method === preferred ? -1 : b.method === preferred ? 1 : 0))
    .map((w) => personalise(w, customer));
}

function shippingInstructions() {
  const { instructions = [] } = config.loadWarehouses();
  return {
    steps: instructions,
    support: { email: config.mail.supportEmail, phone: config.mail.supportPhone || null },
  };
}

module.exports = { METHODS, addressesFor, shippingInstructions };
