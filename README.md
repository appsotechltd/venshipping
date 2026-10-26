# VEN Shipping

Customers download the app, register, and immediately get their own China warehouse address and shipping mark. No staff involvement needed.

- `backend/`: Express + Postgres API
- `app/`: Flutter + Riverpod mobile app

## How registration works

1. The customer registers in the app (name, email, phone, delivery destination, preferred air or sea freight, password).
2. The backend assigns the next customer ID from a Postgres sequence: `FWB2423-0001`, `FWB2423-0002`, …
3. Their shipping mark is `FWB2423-0001 (VEN SHIPPING)`. It is inserted into the air and sea warehouse addresses to make their personalised address.
4. The app opens straight onto the dashboard showing **OUR CHINA WAREHOUSE ADDRESS**, with Copy, Share, Download (PDF) and Shipping Instructions buttons. The address is cached on the phone so it also shows offline.
5. At the same time the backend automatically sends two emails:
   - to `ADMIN_NOTIFICATION_EMAIL`: name, customer ID, phone, email, registration date, delivery destination
   - to the customer: welcome email with their warehouse addresses, shipping mark, customer ID and shipping instructions

   Every email is recorded in the `email_log` table (`sent` / `failed`). An email failure never blocks registration.

## Backend

```bash
cd backend
cp .env.example .env        # set DATABASE_URL, JWT_SECRET, SMTP_*, ADMIN_NOTIFICATION_EMAIL
npm install
npm run migrate
npm start                   # http://localhost:4000
npm test                    # needs a throwaway Postgres DB (TEST_DATABASE_URL, default venshipping_test)
```

With `SMTP_HOST` empty, emails are built and logged but not sent, which is handy for development.

**Warehouse addresses** live in `backend/config/warehouses.json` (one entry per shipping method). The current entries are placeholders: replace them with the real VEN Shipping China warehouses before launch. `{mark}` is replaced with each customer's shipping mark. Changes apply immediately to every customer, in the app and in new emails.

| Endpoint | |
| --- | --- |
| `POST /api/auth/register` | create account, returns token, customer and warehouse addresses |
| `POST /api/auth/login` | |
| `GET /api/me` | signed-in customer |
| `GET /api/me/warehouse-addresses` | personalised addresses, preferred method first |
| `GET /api/shipping-instructions` | steps and support contact |

## App

The repo holds the Dart code, assets and config; generate the platform folders once with Flutter installed:

```bash
cd app
flutter create . --org com.venshipping --platforms=android,ios,web
flutter pub get
dart run flutter_launcher_icons          # app icon from assets/images/app_icon.png
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000
```

Brand colours come from the logo: navy `#17174A`, lime `#B5CF30`, white (see `app/lib/theme.dart`).
