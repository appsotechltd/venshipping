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

## Invoices and receipts

Staff create invoices and record payments through the staff API (send `X-Admin-Key: <ADMIN_API_KEY>`). Customers see them in the app under **Invoices & receipts** and get each one by email automatically.

1. Staff create an invoice for a customer ID with one or more charges (e.g. `12.5 kg × $9.50`). The customer is emailed the invoice straight away. Numbers run `INV-000001`, `INV-000002`, …
2. When the customer pays, staff record the payment (cash, bank transfer, mobile money, card). Each payment gets a receipt number (`RCT-000001`, …), updates the balance (part paid / paid), and the customer is emailed a receipt.
3. In the app the customer sees what they owe, every invoice with its charges and how to pay, and every receipt. They can download a branded PDF or email themselves a copy.

Currency, company details and payment instructions (bank / mobile money) live in `backend/config/billing.json`. **The payment details there are placeholders:** replace them before launch.

```bash
# Create an invoice (emails the customer)
curl -X POST $API/api/admin/invoices -H "X-Admin-Key: $KEY" -H 'Content-Type: application/json' -d '{
  "customerId": "FWB2423-0001", "dueDate": "2026-11-30", "notes": "3 cartons, air freight",
  "items": [{ "description": "Air freight Guangzhou to Accra", "quantity": 12.5, "unit": "kg", "unitPrice": 9.5 },
            { "description": "Handling fee", "unitPrice": 15 }] }'

# Record a payment (emails the receipt)
curl -X POST $API/api/admin/invoices/INV-000001/payments -H "X-Admin-Key: $KEY" -H 'Content-Type: application/json' \
  -d '{ "amount": 133.75, "method": "mobile_money", "reference": "MTN-123" }'
```

## Emails

Every email uses one branded design (`backend/src/services/emailLayout.js`): navy header with the logo, lime accents, mobile-friendly, with a plain-text version. The logo is embedded in the email, so nothing needs hosting; set `EMAIL_LOGO_URL` to use a hosted copy instead. Set `APP_URL` to add an "Open the VEN Shipping app" button.

| Email | Sent when |
| --- | --- |
| Welcome + China warehouse address | customer registers |
| New customer notification (to staff) | customer registers |
| Password reset code | customer taps "Forgot password?" |
| Password changed | password reset completes |
| Invoice | staff create an invoice (or the customer taps "Email me a copy") |
| Payment receipt | staff record a payment (or "Email me a copy") |

Every email is recorded in `email_log`.

## Forgot password

The customer taps **Forgot password?** on the login screen and enters their email. If it has an account, we email a 6-digit code (valid 30 minutes, 5 tries, one code at a time). They enter the code and a new password and are signed straight in; every other device is signed out and they get a "password changed" email. The screen answers the same way for unknown emails so nobody can probe which emails are registered.

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
| `POST /api/auth/forgot-password` | `{ email }`: emails a 6-digit code |
| `POST /api/auth/reset-password` | `{ email, code, password }`: returns token and customer |
| `GET /api/me/invoices` | invoices, newest first, plus `outstanding` per currency |
| `GET /api/me/invoices/:number` | invoice with charges, payments and how to pay |
| `GET /api/me/receipts`, `GET /api/me/receipts/:number` | payment receipts |
| `POST /api/me/invoices/:number/email`, `POST /api/me/receipts/:number/email` | email the customer a copy |
| `POST /api/admin/invoices` | staff: create an invoice and email it |
| `GET /api/admin/invoices/:number` | staff: view an invoice |
| `POST /api/admin/invoices/:number/payments` | staff: record a payment and email the receipt |
| `POST /api/admin/invoices/:number/void` | staff: cancel an invoice with no payments |

Amounts in the API are in minor units (`totalCents: 13375` is $133.75). Staff send prices in normal units (`unitPrice: 9.5`).

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
