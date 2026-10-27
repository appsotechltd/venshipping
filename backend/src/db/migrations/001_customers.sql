-- Customer numbers come from a sequence so concurrent registrations never collide.
CREATE SEQUENCE IF NOT EXISTS customer_number_seq START 1;

CREATE TABLE IF NOT EXISTS customers (
  id                        BIGSERIAL PRIMARY KEY,
  customer_number           INTEGER NOT NULL UNIQUE DEFAULT nextval('customer_number_seq'),
  customer_id               TEXT NOT NULL UNIQUE,
  full_name                 TEXT NOT NULL,
  email                     TEXT NOT NULL,
  phone                     TEXT NOT NULL,
  password_hash             TEXT NOT NULL,
  delivery_destination      TEXT NOT NULL,
  preferred_shipping_method TEXT NOT NULL DEFAULT 'air'
                              CHECK (preferred_shipping_method IN ('air', 'sea')),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS customers_email_lower_idx ON customers (lower(email));

-- Every automatic email is recorded so staff can see what was sent and spot failures.
CREATE TABLE IF NOT EXISTS email_log (
  id           BIGSERIAL PRIMARY KEY,
  customer_id  BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  kind         TEXT NOT NULL,
  recipient    TEXT NOT NULL,
  subject      TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
