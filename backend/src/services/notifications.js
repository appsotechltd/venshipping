// Hooks for anything that should react to shipment activity: status emails, push
// notifications, SMS. Handlers run after the database change has committed, one after
// another, and a failing handler is logged without affecting the request or other handlers.
//
//   const { onShipmentEvent } = require('./notifications');
//   onShipmentEvent(async ({ type, shipment, customer, event, previousStatus }) => { ... });
//
// type is 'shipment.created' or 'shipment.status_changed'. shipment is the public shape from
// shipments.toPublicShipment (the app sees the same fields), customer is the customers row,
// event is the new timeline entry and previousStatus is null for 'shipment.created'.

const handlers = [];

function onShipmentEvent(handler) {
  handlers.push(handler);
  return () => {
    const i = handlers.indexOf(handler);
    if (i !== -1) handlers.splice(i, 1);
  };
}

async function emitShipmentEvent(payload) {
  for (const handler of [...handlers]) {
    try {
      await handler(payload);
    } catch (err) {
      console.error(`[notifications] ${payload.type} handler failed for ${payload.shipment?.trackingNumber}:`, err.message);
    }
  }
}

module.exports = { onShipmentEvent, emitShipmentEvent };
