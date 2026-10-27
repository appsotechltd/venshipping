-- Website support: CMS content, admin accounts, installments, and the extra shipment/invoice
-- fields the website uses. Everything is additive, so the app's existing queries are unaffected.

CREATE TABLE IF NOT EXISTS admins (
  id             BIGSERIAL PRIMARY KEY,
  email          TEXT NOT NULL,
  name           TEXT NOT NULL DEFAULT 'Admin',
  password_hash  TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS admins_email_lower_idx ON admins (lower(email));

-- Key/value content blocks: scope is one of homepage, settings, popup, booking_page.
CREATE TABLE IF NOT EXISTS site_content (
  scope  TEXT NOT NULL,
  key    TEXT NOT NULL,
  value  TEXT,
  PRIMARY KEY (scope, key)
);

CREATE TABLE IF NOT EXISTS site_services (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  short_description  TEXT,
  long_description   TEXT,
  icon_name          TEXT,
  image              TEXT,
  key_features       JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS site_faqs (
  id        BIGSERIAL PRIMARY KEY,
  question  TEXT NOT NULL,
  answer    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_slides (
  id          BIGSERIAL PRIMARY KEY,
  type        TEXT,
  url         TEXT,
  title       TEXT,
  subtitle    TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS testimonials (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  company     TEXT,
  message     TEXT NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_addresses (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT,
  address     TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 99
);

CREATE TABLE IF NOT EXISTS site_phones (
  id              BIGSERIAL PRIMARY KEY,
  label           TEXT,
  number          TEXT,
  show_in_header  BOOLEAN NOT NULL DEFAULT false,
  sort_order      INTEGER NOT NULL DEFAULT 99
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id             BIGSERIAL PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  name           TEXT,
  subscribed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fields the website's shipment form collects that the app's shipments table does not have.
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS origin            TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS destination       TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS carrier           TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS service           TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shipped_date      TEXT;
-- The website takes weight as free text ("4 CTNS", "0.3 cbm"); weight_kg only holds plain kilogram figures.
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS weight_text       TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS ordered_quantity  INTEGER;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS unit              TEXT;

CREATE TABLE IF NOT EXISTS shipment_installments (
  id                BIGSERIAL PRIMARY KEY,
  shipment_id       BIGINT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  container_number  TEXT,
  photo_url         TEXT,
  qr_code_data_url  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shipment_installments_shipment_idx ON shipment_installments (shipment_id, created_at);

-- The website distinguishes Invoice / Receipt / Proforma documents.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS doc_type TEXT NOT NULL DEFAULT 'Invoice'
  CHECK (doc_type IN ('Invoice', 'Receipt', 'Proforma'));
