# Moving the old website (MySQL) onto this backend

The website used to run on its own Express + MySQL server. It now uses `backend/` (Postgres) through `/api/web`.

## One-off data import

1. Export the old database to JSON (every table as `{ "customers": [...], "shipments": [...] }`). Do this on the old server with its own credentials; the file holds plaintext customer passwords, so keep it out of git and delete it afterwards.
2. Dry run against a scratch database. Nothing is saved; it prints what would be imported and what needs a human decision:

   ```
   DATABASE_URL=postgres://.../scratch node scripts/migrate-from-mysql.js dump.json
   ```
3. Import for real into an empty production database:

   ```
   node scripts/migrate-from-mysql.js dump.json --commit
   ```

The script refuses to run if the target already has customers.

### What it does
- Customers get new `FWB2423-xxxx` IDs, in their old order. Passwords are bcrypt-hashed, so existing logins keep working.
- Shipments keep their `VEN…` tracking numbers. Status labels map to the app's statuses (`Processing` → received, `In Transit` → in_transit, …). The free-text weight is kept as written. Each timeline entry becomes a shipment event.
- Invoices keep their numbers, are stored in cents, and are priced in `WEB_CURRENCY` (default `NGN`).
- Website content (services, FAQs, slides, homepage, settings, popup, booking page, addresses, phones, testimonials, newsletter) is copied across.
- Admin credentials are **not** imported. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` on the server; the first start creates the admin account.

## Deploying
- Create a `venshipping` Postgres database, set `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_API_KEY`, SMTP settings and `CORS_ORIGIN`.
- Serve `/uploads` and `/api` from the backend in nginx, and the built `web/dist` for the site.
- Customers must log in again once (the website now uses tokens).
