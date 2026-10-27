const nodemailer = require('nodemailer');
const config = require('../config');
const db = require('../db');
const { addressesFor, shippingInstructions } = require('./warehouse');
const { shippingMark } = require('./customerId');
const {
  COLORS,
  FONT,
  esc,
  paragraph,
  heading,
  detailsTable,
  callout,
  hero,
  pill,
  renderEmail,
  logoAttachments,
} = require('./emailLayout');
const { formatMoney } = require('./billing');

const { NAVY, LIME, LIME_TINT, BORDER, MUTED, TEXT } = COLORS;

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

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function formatDateTime(date) {
  return `${new Date(date).toLocaleString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  })} UTC`;
}

function methodName(method) {
  return method === 'sea' ? 'Sea freight' : 'Air freight';
}

function supportLine() {
  const { supportEmail, supportPhone } = config.mail;
  return `${supportEmail}${supportPhone ? ` / ${supportPhone}` : ''}`;
}

function textFooter() {
  return ['', '--', `Need help? ${supportLine()}`, 'VEN International Logistics Ltd'];
}

/* ---------- Registration ---------- */

function adminEmail(customer) {
  const details = [
    ['Full name', customer.full_name],
    ['Customer ID', customer.customer_id],
    ['Phone number', customer.phone],
    ['Email address', customer.email],
    ['Registration date', formatDateTime(customer.created_at)],
    ['Preferred delivery destination', customer.delivery_destination],
    ['Preferred shipping method', methodName(customer.preferred_shipping_method)],
  ];
  return {
    to: config.mail.adminRecipients.join(', '),
    subject: `New customer registered: ${customer.full_name} (${customer.customer_id})`,
    text: ['A new customer has registered on the VEN Shipping app.', '', ...details.map(([k, v]) => `${k}: ${v}`)].join('\n'),
    html: renderEmail({
      preheader: `${customer.full_name} just registered as ${customer.customer_id}.`,
      eyebrow: 'Staff notification',
      title: 'New customer registration',
      intro: `<b>${esc(customer.full_name)}</b> has registered on the VEN Shipping app and received their China warehouse address automatically.`,
      bodyHtml: detailsTable(details),
      cta: null,
    }),
  };
}

function addressCard(address, preferred) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;border:2px solid ${preferred ? LIME : BORDER};border-radius:12px;border-collapse:separate"><tr>
<td style="padding:16px 18px">
<div style="font-family:${FONT};font-size:15px;line-height:22px;font-weight:800;color:${NAVY}">${esc(address.label)}${preferred ? ` &nbsp;<span style="display:inline-block;background:${LIME};color:${NAVY};font-size:11px;line-height:14px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;padding:3px 8px;border-radius:999px;vertical-align:middle">Your choice</span>` : ''}</div>
${address.transitTime ? `<div style="font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};margin-bottom:10px">Usually arrives in ${esc(address.transitTime)}</div>` : ''}
<div style="font-family:'SFMono-Regular',Consolas,'Courier New',monospace;font-size:14px;line-height:22px;color:${TEXT};white-space:pre-line;background:#F7F8FB;border-radius:8px;padding:12px 14px">${esc(address.fullText)}</div>
</td></tr></table>`;
}

function welcomeEmail(customer) {
  const mark = shippingMark(customer.customer_id);
  const addresses = addressesFor(customer);
  const { steps } = shippingInstructions();

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
    'Your address is also available any time in the VEN Shipping app.',
    ...textFooter(),
  ].join('\n');

  const stepsHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">${steps
    .map(
      (s, i) => `<tr>
<td width="40" style="vertical-align:top;padding:0 0 12px"><div style="width:28px;height:28px;border-radius:14px;background:${LIME};color:${NAVY};font-family:${FONT};font-size:13px;line-height:28px;font-weight:800;text-align:center">${i + 1}</div></td>
<td style="vertical-align:top;padding:4px 0 12px;font-family:${FONT};font-size:14px;line-height:21px;color:${TEXT}">${esc(s)}</td>
</tr>`,
    )
    .join('')}</table>`;

  const html = renderEmail({
    preheader: `Your customer ID is ${customer.customer_id}. Here is your China warehouse address.`,
    eyebrow: 'Welcome aboard',
    title: `Welcome to VEN Shipping, ${customer.full_name.split(' ')[0]}`,
    intro: 'Your account is ready and you can start shipping straight away. Give your supplier the address below and we will take it from there.',
    bodyHtml: `${hero('Your customer ID', customer.customer_id, `Shipping mark: ${mark}`)}
${heading('Our China warehouse address')}
${addresses.map((a) => addressCard(a, a.method === customer.preferred_shipping_method)).join('')}
${callout(`Always include your shipping mark <b>${esc(mark)}</b> on every carton and in the recipient name, so we can match your goods to your account.`)}
${heading('How to send goods to VEN Shipping')}
${stepsHtml}
${paragraph('Your address is also available any time in the VEN Shipping app, where you can copy, share or download it.', `color:${MUTED};font-size:14px`)}`,
  });

  return { to: customer.email, subject: `Your VEN Shipping China warehouse address (${customer.customer_id})`, text, html };
}

/* ---------- Password ---------- */

function passwordResetEmail(customer, code, ttlMinutes) {
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  return {
    to: customer.email,
    subject: `${spaced} is your VEN Shipping password reset code`,
    text: [
      `Hello ${customer.full_name},`,
      '',
      'We received a request to reset the password for your VEN Shipping account.',
      '',
      `Your reset code: ${code}`,
      '',
      `Enter it in the app within ${ttlMinutes} minutes. If you did not ask to reset your password, you can ignore this email; your password will not change.`,
      ...textFooter(),
    ].join('\n'),
    html: renderEmail({
      preheader: `Your reset code is ${spaced}. It expires in ${ttlMinutes} minutes.`,
      eyebrow: 'Password reset',
      title: 'Reset your password',
      intro: `Hello ${esc(customer.full_name.split(' ')[0])}, we received a request to reset the password for your VEN Shipping account (${esc(customer.customer_id)}). Enter this code in the app:`,
      bodyHtml: `${hero('Your reset code', code, `Expires in ${ttlMinutes} minutes`, { mono: true })}
${paragraph("If you didn't ask to reset your password, you can safely ignore this email. Your password will not change, and nobody can use the code without access to your inbox.", `color:${MUTED};font-size:14px`)}`,
      cta: null,
    }),
  };
}

function passwordChangedEmail(customer) {
  const when = formatDateTime(new Date());
  return {
    to: customer.email,
    subject: 'Your VEN Shipping password was changed',
    text: [
      `Hello ${customer.full_name},`,
      '',
      `The password for your VEN Shipping account (${customer.customer_id}) was changed on ${when}.`,
      'You have been signed out on your other devices.',
      '',
      `If this wasn't you, contact us straight away: ${supportLine()}`,
      ...textFooter(),
    ].join('\n'),
    html: renderEmail({
      preheader: 'Your password was just changed.',
      eyebrow: 'Account security',
      title: 'Your password was changed',
      intro: `Hello ${esc(customer.full_name.split(' ')[0])}, the password for your VEN Shipping account was changed successfully. You have been signed out on your other devices.`,
      bodyHtml: `${detailsTable([
        ['Customer ID', customer.customer_id],
        ['Email address', customer.email],
        ['Changed on', when],
      ])}
${callout(`<b>Wasn't you?</b> Contact us straight away at <a href="mailto:${esc(config.mail.supportEmail)}" style="color:${NAVY};font-weight:700">${esc(config.mail.supportEmail)}</a> so we can secure your account.`)}`,
    }),
  };
}

/* ---------- Invoices and receipts ---------- */

function money(cents, currency) {
  return formatMoney(cents, currency);
}

function itemsTable(invoice) {
  const cell = `font-family:${FONT};font-size:14px;line-height:20px;color:${TEXT};padding:12px 0;border-bottom:1px solid ${BORDER};vertical-align:top`;
  const head = `font-family:${FONT};font-size:11px;line-height:16px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:${MUTED};padding:0 0 8px;border-bottom:2px solid ${NAVY}`;
  const rowsHtml = invoice.items
    .map(
      (item) => `<tr>
<td style="${cell}"><div style="font-weight:700;color:${NAVY}">${esc(item.description)}</div>
<div style="font-size:13px;color:${MUTED}">${esc(quantityText(item))} &times; ${esc(money(item.unitPriceCents, invoice.currency))}</div></td>
<td align="right" style="${cell};font-weight:700;color:${NAVY};white-space:nowrap;padding-left:12px">${esc(money(item.amountCents, invoice.currency))}</td>
</tr>`,
    )
    .join('');
  const total = (label, value, strong = false) => `<tr>
<td align="right" style="font-family:${FONT};font-size:${strong ? 15 : 14}px;line-height:20px;color:${strong ? NAVY : MUTED};font-weight:${strong ? 800 : 600};padding:10px 0 0">${esc(label)}</td>
<td align="right" style="font-family:${FONT};font-size:${strong ? 15 : 14}px;line-height:20px;color:${NAVY};font-weight:800;padding:10px 0 0 12px;white-space:nowrap">${esc(value)}</td>
</tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
<tr><td style="${head}">Description</td><td align="right" style="${head}">Amount</td></tr>
${rowsHtml}
${total('Subtotal', money(invoice.subtotalCents, invoice.currency))}
${invoice.paidCents ? total('Paid', `−${money(invoice.paidCents, invoice.currency)}`) : ''}
${total(invoice.status === 'void' ? 'Total' : 'Balance due', money(invoice.status === 'void' ? invoice.totalCents : invoice.balanceCents, invoice.currency), true)}
</table>`;
}

function quantityText(item) {
  return item.unit ? `${item.quantity} ${item.unit}` : String(item.quantity);
}

function paymentInstructionsHtml(invoice) {
  const lines = invoice.billing.paymentInstructions;
  if (!lines.length) return '';
  return `${heading('How to pay')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:${LIME_TINT};border-radius:12px"><tr><td style="padding:16px 18px">
${lines.map((l) => `<div style="font-family:${FONT};font-size:14px;line-height:22px;color:${NAVY};padding:2px 0">${esc(l)}</div>`).join('')}
<div style="font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};padding-top:8px">Payment reference: <b style="color:${NAVY}">${esc(invoice.invoiceNumber)}</b></div>
</td></tr></table>`;
}

function invoiceEmail(customer, invoice) {
  const balance = money(invoice.balanceCents, invoice.currency);
  const statusKind = invoice.status;
  const text = [
    `Hello ${customer.full_name},`,
    '',
    `Here is your invoice ${invoice.invoiceNumber} from VEN Shipping.`,
    '',
    `Invoice number: ${invoice.invoiceNumber}`,
    `Issued: ${formatDate(invoice.issuedAt)}`,
    invoice.dueDate ? `Due: ${formatDate(invoice.dueDate)}` : null,
    `Customer ID: ${customer.customer_id}`,
    `Status: ${invoice.statusLabel}`,
    '',
    ...invoice.items.map((i) => `${i.description}: ${quantityText(i)} x ${money(i.unitPriceCents, invoice.currency)} = ${money(i.amountCents, invoice.currency)}`),
    '',
    `Subtotal: ${money(invoice.subtotalCents, invoice.currency)}`,
    invoice.paidCents ? `Paid: ${money(invoice.paidCents, invoice.currency)}` : null,
    `Balance due: ${balance}`,
    invoice.notes ? `\nNotes: ${invoice.notes}` : null,
    ...(invoice.billing.paymentInstructions.length
      ? ['', 'How to pay', ...invoice.billing.paymentInstructions, `Payment reference: ${invoice.invoiceNumber}`]
      : []),
    '',
    'You can view this invoice any time in the VEN Shipping app under Billing.',
    ...textFooter(),
  ].filter((l) => l !== null).join('\n');

  const html = renderEmail({
    preheader: `Invoice ${invoice.invoiceNumber}: ${balance} due${invoice.dueDate ? ` by ${formatDate(invoice.dueDate)}` : ''}.`,
    eyebrow: `Invoice ${invoice.invoiceNumber}`,
    title: invoice.status === 'void' ? 'This invoice was cancelled' : 'Your invoice is ready',
    intro: `Hello ${esc(customer.full_name.split(' ')[0])}, here is your invoice from VEN Shipping. ${invoice.status === 'void' ? 'It has been cancelled and nothing is owed.' : 'The details are below and in the app.'}`,
    bodyHtml: `${invoice.status === 'void' ? '' : hero('Amount due', balance, invoice.dueDate ? `Due by ${formatDate(invoice.dueDate)}` : `Issued ${formatDate(invoice.issuedAt)}`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px"><tr>
<td class="stack" width="50%" style="vertical-align:top;padding:0 8px 12px 0">
<div style="font-family:${FONT};font-size:11px;line-height:16px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:${MUTED}">Billed to</div>
<div style="font-family:${FONT};font-size:14px;line-height:21px;color:${NAVY};font-weight:700;margin-top:4px">${esc(customer.full_name)}</div>
<div style="font-family:${FONT};font-size:13px;line-height:20px;color:${TEXT}">${esc(customer.customer_id)}<br>${esc(customer.email)}<br>${esc(customer.delivery_destination)}</div>
</td>
<td class="stack" width="50%" style="vertical-align:top;padding:0 0 12px 8px">
<div style="font-family:${FONT};font-size:11px;line-height:16px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:${MUTED}">Invoice</div>
<div style="font-family:${FONT};font-size:14px;line-height:21px;color:${NAVY};font-weight:700;margin-top:4px">${esc(invoice.invoiceNumber)}</div>
<div style="font-family:${FONT};font-size:13px;line-height:20px;color:${TEXT}">Issued ${esc(formatDate(invoice.issuedAt))}${invoice.dueDate ? `<br>Due ${esc(formatDate(invoice.dueDate))}` : ''}</div>
<div style="margin-top:8px">${pill(invoice.overdue ? 'Overdue' : invoice.statusLabel, invoice.overdue ? 'unpaid' : statusKind)}</div>
</td></tr></table>
${itemsTable(invoice)}
${invoice.notes ? callout(esc(invoice.notes)) : ''}
${invoice.status === 'void' || invoice.status === 'paid' ? '' : paymentInstructionsHtml(invoice)}
${paragraph('You can view this invoice and your receipts any time in the VEN Shipping app under <b>Billing</b>.', `color:${MUTED};font-size:14px`)}`,
  });

  return {
    to: customer.email,
    subject: invoice.status === 'void'
      ? `Invoice ${invoice.invoiceNumber} cancelled`
      : `Invoice ${invoice.invoiceNumber} from VEN Shipping: ${balance} due`,
    text,
    html,
  };
}

function receiptEmail(customer, receipt) {
  const amount = money(receipt.amountCents, receipt.currency);
  const paidInFull = receipt.balanceAfterCents === 0;
  const details = [
    ['Receipt number', receipt.receiptNumber],
    ['Payment date', formatDateTime(receipt.paidAt)],
    ['Payment method', receipt.methodLabel],
    ['Reference', receipt.reference],
    ['For invoice', receipt.invoiceNumber],
    ['Invoice total', money(receipt.invoiceTotalCents, receipt.currency)],
    ['Paid to date', money(receipt.paidToDateCents, receipt.currency)],
    ['Balance remaining', money(receipt.balanceAfterCents, receipt.currency)],
  ];
  return {
    to: customer.email,
    subject: `Payment received: ${amount} (receipt ${receipt.receiptNumber})`,
    text: [
      `Hello ${customer.full_name},`,
      '',
      `Thank you. We have received your payment of ${amount}.`,
      paidInFull ? `Invoice ${receipt.invoiceNumber} is now paid in full.` : '',
      '',
      `Customer ID: ${customer.customer_id}`,
      ...details.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
      '',
      'Keep this email as your receipt. It is also saved in the VEN Shipping app under Billing.',
      ...textFooter(),
    ].join('\n'),
    html: renderEmail({
      preheader: `We received ${amount} for invoice ${receipt.invoiceNumber}. Thank you!`,
      eyebrow: `Receipt ${receipt.receiptNumber}`,
      title: 'Payment received, thank you',
      intro: `Hello ${esc(customer.full_name.split(' ')[0])}, we have received your payment. Keep this email as your receipt.`,
      bodyHtml: `${hero('Amount paid', amount, formatDate(receipt.paidAt))}
<div style="margin:0 0 16px;text-align:center">${paidInFull ? pill(`Invoice ${receipt.invoiceNumber} paid in full`, 'paid') : pill(`${money(receipt.balanceAfterCents, receipt.currency)} still due on ${receipt.invoiceNumber}`, 'part_paid')}</div>
${detailsTable([['Customer', `${customer.full_name} (${customer.customer_id})`], ...details])}
${paragraph('This receipt is also saved in the VEN Shipping app under <b>Billing</b>.', `color:${MUTED};font-size:14px`)}`,
    }),
  };
}

/* ---------- Sending ---------- */

async function sendAndLog(kind, customer, message, reference = null) {
  const mail = { from: config.mail.from, ...message, attachments: [...logoAttachments(), ...(message.attachments || [])] };
  try {
    await getTransporter().sendMail(mail);
    if (!config.mail.host && config.env !== 'test') {
      console.log(`[email:${kind}] SMTP not configured, not sent. To: ${message.to} Subject: ${message.subject}`);
    }
    await logEmail(kind, customer, message, 'sent', null, reference);
  } catch (err) {
    console.error(`[email:${kind}] failed for ${customer.customer_id}:`, err.message);
    await logEmail(kind, customer, message, 'failed', err.message, reference);
    throw err;
  }
}

async function logEmail(kind, customer, message, status, error = null, reference = null) {
  try {
    await db.query(
      'INSERT INTO email_log (customer_id, kind, recipient, subject, status, error, reference) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [customer.id, kind, message.to, message.subject, status, error, reference],
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

const sendPasswordResetEmail = (customer, code, ttlMinutes) =>
  sendAndLog('password_reset', customer, passwordResetEmail(customer, code, ttlMinutes));

const sendPasswordChangedEmail = (customer) => sendAndLog('password_changed', customer, passwordChangedEmail(customer));

const sendInvoiceEmail = (customer, invoice) =>
  sendAndLog('invoice', customer, invoiceEmail(customer, invoice), invoice.invoiceNumber);

const sendReceiptEmail = (customer, receipt) =>
  sendAndLog('payment_receipt', customer, receiptEmail(customer, receipt), receipt.receiptNumber);

module.exports = {
  sendRegistrationEmails,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendInvoiceEmail,
  sendReceiptEmail,
  sendAndLog,
  renderEmail,
  adminEmail,
  welcomeEmail,
  passwordResetEmail,
  passwordChangedEmail,
  invoiceEmail,
  receiptEmail,
  setTransporter,
};
