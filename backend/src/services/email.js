const nodemailer = require('nodemailer');
const config = require('../config');
const db = require('../db');
const { addressesFor, shippingInstructions } = require('./warehouse');
const { shippingMark } = require('./customerId');

const NAVY = '#17174A';
const LIME = '#B5CF30';

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  if (config.mail.host) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
    });
  } else {
    // No SMTP configured: build the message but do not send it, so development works offline.
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
}

// Lets tests swap in a fake transport.
function setTransporter(t) {
  transporter = t;
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(date) {
  return new Date(date).toUTCString();
}

function layout(title, body) {
  return `<!doctype html><html><body style="margin:0;background:#f4f5f9;font-family:Arial,Helvetica,sans-serif;color:#1d1d35">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:${NAVY};padding:20px 24px;color:#ffffff;font-size:20px;font-weight:bold">VEN <span style="color:${LIME}">SHIPPING</span></td></tr>
<tr><td style="padding:24px"><h2 style="margin:0 0 16px;color:${NAVY}">${esc(title)}</h2>${body}</td></tr>
<tr><td style="background:${NAVY};padding:14px 24px;color:#c9c9e0;font-size:12px">VEN International Logistics Ltd &middot; ${esc(config.mail.supportEmail)}</td></tr>
</table></td></tr></table></body></html>`;
}

function rows(pairs) {
  return `<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">${pairs
    .map(
      ([k, v]) =>
        `<tr><td style="border-bottom:1px solid #eee;color:#666;width:40%">${esc(k)}</td><td style="border-bottom:1px solid #eee;font-weight:bold">${esc(v)}</td></tr>`,
    )
    .join('')}</table>`;
}

function adminEmail(customer) {
  const details = [
    ['Full name', customer.full_name],
    ['Customer ID', customer.customer_id],
    ['Phone number', customer.phone],
    ['Email address', customer.email],
    ['Registration date', formatDate(customer.created_at)],
    ['Preferred delivery destination', customer.delivery_destination],
    ['Preferred shipping method', customer.preferred_shipping_method === 'sea' ? 'Sea freight' : 'Air freight'],
  ];
  return {
    to: config.mail.adminRecipients.join(', '),
    subject: `New customer registered: ${customer.full_name} (${customer.customer_id})`,
    text: ['A new customer has registered on the VEN Shipping app.', '', ...details.map(([k, v]) => `${k}: ${v}`)].join('\n'),
    html: layout('New customer registration', `<p>A new customer has registered on the VEN Shipping app.</p>${rows(details)}`),
  };
}

function welcomeEmail(customer) {
  const mark = shippingMark(customer.customer_id);
  const addresses = addressesFor(customer);
  const { steps, support } = shippingInstructions();

  const addressHtml = addresses
    .map(
      (a) => `<div style="border:2px solid ${a.method === customer.preferred_shipping_method ? LIME : '#e3e3ee'};border-radius:10px;padding:14px;margin:12px 0">
<div style="font-weight:bold;color:${NAVY};margin-bottom:8px">${esc(a.label)}${a.transitTime ? ` <span style="font-weight:normal;color:#666">(${esc(a.transitTime)})</span>` : ''}</div>
<div style="white-space:pre-line;font-family:Consolas,monospace;font-size:14px">${esc(a.fullText)}</div></div>`,
    )
    .join('');

  const text = [
    `Hello ${customer.full_name},`,
    '',
    'Welcome to VEN Shipping. Your account is ready and you can start shipping straight away.',
    '',
    `Customer ID: ${customer.customer_id}`,
    `Shipping mark: ${mark}`,
    '',
    'OUR CHINA WAREHOUSE ADDRESS',
    ...addresses.flatMap((a) => ['', `${a.label}${a.transitTime ? ` (${a.transitTime})` : ''}`, a.fullText]),
    '',
    'How to send goods to VEN Shipping',
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    `Need help? ${support.email}${support.phone ? ` / ${support.phone}` : ''}`,
    '',
    'Your address is also available any time in the VEN Shipping app.',
  ].join('\n');

  const html = layout(
    `Welcome to VEN Shipping, ${customer.full_name}`,
    `<p>Your account is ready and you can start shipping straight away.</p>
${rows([
  ['Customer ID', customer.customer_id],
  ['Shipping mark', mark],
])}
<h3 style="color:${NAVY};margin:24px 0 4px">OUR CHINA WAREHOUSE ADDRESS</h3>
${addressHtml}
<h3 style="color:${NAVY};margin:24px 0 8px">How to send goods to VEN Shipping</h3>
<ol style="padding-left:20px;line-height:1.6">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
<p style="background:${LIME}22;border-left:4px solid ${LIME};padding:10px 12px">Always include your shipping mark <b>${esc(mark)}</b> so we can match your goods to your account.</p>
<p>Your address is also available any time in the VEN Shipping app.</p>`,
  );

  return { to: customer.email, subject: `Your VEN Shipping China warehouse address (${customer.customer_id})`, text, html };
}

async function sendAndLog(kind, customer, message) {
  try {
    await getTransporter().sendMail({ from: config.mail.from, ...message });
    if (!config.mail.host && config.env !== 'test') {
      console.log(`[email:${kind}] SMTP not configured, not sent. To: ${message.to} Subject: ${message.subject}`);
    }
    await logEmail(kind, customer, message, 'sent');
  } catch (err) {
    console.error(`[email:${kind}] failed for ${customer.customer_id}:`, err.message);
    await logEmail(kind, customer, message, 'failed', err.message);
    throw err;
  }
}

async function logEmail(kind, customer, message, status, error = null) {
  try {
    await db.query(
      'INSERT INTO email_log (customer_id, kind, recipient, subject, status, error) VALUES ($1, $2, $3, $4, $5, $6)',
      [customer.id, kind, message.to, message.subject, status, error],
    );
  } catch (err) {
    console.error('Could not write email_log:', err.message);
  }
}

// Sends the admin notification and the customer welcome email at the same time.
// Never throws: registration has already succeeded and the address is in the app either way.
async function sendRegistrationEmails(customer) {
  const results = await Promise.allSettled([
    sendAndLog('admin_new_customer', customer, adminEmail(customer)),
    sendAndLog('customer_welcome', customer, welcomeEmail(customer)),
  ]);
  return results.map((r) => r.status);
}

module.exports = { sendRegistrationEmails, adminEmail, welcomeEmail, setTransporter };
