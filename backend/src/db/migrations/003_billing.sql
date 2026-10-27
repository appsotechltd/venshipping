-- Invoices, payments (each payment is a receipt) and forgot-password codes.
-- Money is stored in minor units (cents/pesewas) so totals never drift through rounding.

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

CREATE TABLE IF NOT EXISTS invoices (
  id              BIGSERIAL PRIMARY KEY,
  invoice_number  TEXT NOT NULL UNIQUE,
  customer_id     BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  -- Links to shipments(id) once shipment tracking is merged; the FK is added then.
  shipment_id     BIGINT,
  currency        TEXT NOT NULL,
  subtotal_cents  BIGINT NOT NULL CHECK (subtotal_cents >= 0),
  total_cents     BIGINT NOT NULL CHECK (total_cents >= 0),
  paid_cents      BIGINT NOT NULL DEFAULT 0 CHECK (paid_cents >= 0),
  status          TEXT NOT NULL DEFAULT 'unpaid'
                    CHECK (status IN ('unpaid', 'part_paid', 'paid', 'void')),
  notes           TEXT,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date        DATE,
  voided_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS invoices_customer_idx ON invoices (customer_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS invoices_shipment_idx ON invoices (shipment_id);

CREATE TABLE IF NOT EXISTS invoice_items (
  id                BIGSERIAL PRIMARY KEY,
  invoice_id        BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  position          INTEGER NOT NULL,
  description       TEXT NOT NULL,
  quantity          NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
  unit              TEXT,
  unit_price_cents  BIGINT NOT NULL CHECK (unit_price_cents >= 0),
  amount_cents      BIGINT NOT NULL CHECK (amount_cents >= 0)
);

CREATE INDEX IF NOT EXISTS invoice_items_invoice_idx ON invoice_items (invoice_id, position);

CREATE TABLE IF NOT EXISTS payments (
  id              BIGSERIAL PRIMARY KEY,
  receipt_number  TEXT NOT NULL UNIQUE,
  invoice_id      BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id     BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount_cents    BIGINT NOT NULL CHECK (amount_cents > 0),
  currency        TEXT NOT NULL,
  method          TEXT NOT NULL
                    CHECK (method IN ('cash', 'bank_transfer', 'mobile_money', 'card', 'other')),
  reference       TEXT,
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_customer_idx ON payments (customer_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS payments_invoice_idx ON payments (invoice_id, paid_at);

-- Six-digit codes emailed for "Forgot password". Only a hash is stored.
CREATE TABLE IF NOT EXISTS password_resets (
  id           BIGSERIAL PRIMARY KEY,
  customer_id  BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  code_hash    TEXT NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_resets_customer_idx ON password_resets (customer_id, created_at DESC);

-- Login tokens issued before a password change stop working.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- Which invoice or receipt an email was about.
ALTER TABLE email_log ADD COLUMN IF NOT EXISTS reference TEXT;
