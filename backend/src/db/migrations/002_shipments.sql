-- Tracking numbers come from a sequence: VEN-100001, VEN-100002, ...
CREATE SEQUENCE IF NOT EXISTS shipment_number_seq START 100001;

-- One row per consignment received at a China warehouse for a customer.
-- status always mirrors the newest row in shipment_events.
CREATE TABLE IF NOT EXISTS shipments (
  id                 BIGSERIAL PRIMARY KEY,
  tracking_number    TEXT NOT NULL UNIQUE,
  customer_id        BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  shipping_method    TEXT NOT NULL CHECK (shipping_method IN ('air', 'sea')),
  description        TEXT NOT NULL DEFAULT '',
  packages           INTEGER CHECK (packages IS NULL OR packages > 0),
  weight_kg          NUMERIC(10, 2) CHECK (weight_kg IS NULL OR weight_kg >= 0),
  volume_cbm         NUMERIC(10, 3) CHECK (volume_cbm IS NULL OR volume_cbm >= 0),
  supplier_tracking  TEXT,
  status             TEXT NOT NULL,
  estimated_arrival  DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shipments_customer_idx ON shipments (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS shipments_status_idx ON shipments (status);

-- The tracking timeline the customer sees. Staff add a row for every status change.
CREATE TABLE IF NOT EXISTS shipment_events (
  id           BIGSERIAL PRIMARY KEY,
  shipment_id  BIGINT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status       TEXT NOT NULL,
  note         TEXT,
  location     TEXT,
  created_by   TEXT,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shipment_events_shipment_idx ON shipment_events (shipment_id, occurred_at);
