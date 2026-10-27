const path = require('path');
const config = require('../config');

// Building blocks for the branded VEN Shipping emails. Everything is table-based with inline
// styles so it renders the same in Gmail, Outlook, Apple Mail and on phones.

const NAVY = '#17174A';
const NAVY_LIGHT = '#2A2A63';
const LIME = '#B5CF30';
const LIME_TINT = '#F4F8E1';
const PAGE = '#EEF0F6';
const BORDER = '#E3E5EF';
const MUTED = '#5D5E80';
const TEXT = '#1D1D3A';
const FONT = "'Plus Jakarta Sans','Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const LOGO_CID = 'ven-logo@venshipping';

// Attached to every email so the logo shows without hosting it anywhere (unless EMAIL_LOGO_URL is set).
function logoAttachments() {
  if (config.mail.logoUrl) return [];
  return [{
    filename: 'ven-shipping-logo.png',
    path: path.join(__dirname, '..', '..', 'assets', 'email', 'logo_white.png'),
    cid: LOGO_CID,
    contentDisposition: 'inline',
  }];
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paragraph(html, style = '') {
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:24px;color:${TEXT};${style}">${html}</p>`;
}

function heading(text, style = '') {
  return `<h2 style="margin:28px 0 12px;font-family:${FONT};font-size:13px;line-height:18px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${NAVY};${style}">${esc(text)}</h2>`;
}

// Label / value rows, e.g. Customer ID / FWB2423-0001.
function detailsTable(pairs) {
  const rowsHtml = pairs
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(
      ([k, v], i, all) => `<tr>
<td style="padding:12px 16px;${i < all.length - 1 ? `border-bottom:1px solid ${BORDER};` : ''}font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};width:42%;vertical-align:top">${esc(k)}</td>
<td style="padding:12px 16px;${i < all.length - 1 ? `border-bottom:1px solid ${BORDER};` : ''}font-family:${FONT};font-size:14px;line-height:20px;color:${NAVY};font-weight:700;vertical-align:top">${esc(v)}</td>
</tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:12px;border-collapse:separate;margin:0 0 20px">${rowsHtml}</table>`;
}

// Lime-edged note for the one thing the customer must not miss.
function callout(html) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px"><tr>
<td style="background:${LIME_TINT};border-left:4px solid ${LIME};border-radius:8px;padding:14px 16px;font-family:${FONT};font-size:14px;line-height:22px;color:${NAVY}">${html}</td>
</tr></table>`;
}

// Navy panel with a large lime figure: an amount due, a payment, a code.
function hero(label, value, sub = '', { mono = false } = {}) {
  const valueFont = mono ? "'SFMono-Regular',Consolas,'Courier New',monospace" : FONT;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px"><tr>
<td align="center" style="background:${NAVY};border-radius:14px;padding:24px 16px">
<div style="font-family:${FONT};font-size:12px;line-height:16px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#C9CAE3">${esc(label)}</div>
<div class="hero-value" style="font-family:${valueFont};font-size:34px;line-height:44px;font-weight:800;color:${LIME};margin-top:6px;${mono ? 'letter-spacing:8px;' : ''}">${esc(value)}</div>
${sub ? `<div style="font-family:${FONT};font-size:13px;line-height:20px;color:#C9CAE3;margin-top:4px">${esc(sub)}</div>` : ''}
</td></tr></table>`;
}

const PILL_STYLES = {
  paid: { bg: LIME, fg: NAVY },
  part_paid: { bg: '#FFF1C2', fg: '#7A5B00' },
  unpaid: { bg: '#FDE2E0', fg: '#9C2A20' },
  void: { bg: '#E6E7EE', fg: MUTED },
};

function pill(label, kind = 'unpaid') {
  const s = PILL_STYLES[kind] || PILL_STYLES.unpaid;
  return `<span style="display:inline-block;background:${s.bg};color:${s.fg};font-family:${FONT};font-size:12px;line-height:16px;font-weight:800;letter-spacing:0.6px;text-transform:uppercase;padding:5px 10px;border-radius:999px">${esc(label)}</span>`;
}

function button(label, url) {
  if (!url) return '';
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr>
<td style="background:${LIME};border-radius:12px">
<a href="${esc(url)}" target="_blank" style="display:inline-block;padding:15px 28px;font-family:${FONT};font-size:15px;line-height:20px;font-weight:800;color:${NAVY};text-decoration:none;border-radius:12px">${esc(label)}</a>
</td></tr></table>`;
}

function footer() {
  const { supportEmail, supportPhone } = config.mail;
  const contact = [
    `<a href="mailto:${esc(supportEmail)}" style="color:${LIME};text-decoration:none">${esc(supportEmail)}</a>`,
    supportPhone ? esc(supportPhone) : '',
  ].filter(Boolean).join(' &nbsp;&middot;&nbsp; ');
  return `<tr><td class="px" style="background:${NAVY};padding:26px 40px;border-radius:0 0 16px 16px">
<div style="font-family:${FONT};font-size:14px;line-height:20px;font-weight:700;color:#FFFFFF">Need help?</div>
<div style="font-family:${FONT};font-size:13px;line-height:20px;color:#C9CAE3;margin-top:2px">${contact}</div>
<div style="height:1px;background:${NAVY_LIGHT};margin:18px 0;line-height:1px;font-size:1px">&nbsp;</div>
<div style="font-family:${FONT};font-size:12px;line-height:18px;color:#9C9DC0">VEN International Logistics Ltd<br>This is an automatic message about your VEN Shipping account.</div>
</td></tr>`;
}

/**
 * Wraps content in the VEN Shipping email shell: navy header with the logo, lime rule,
 * white body, navy footer with support contacts.
 *   preheader: inbox preview text
 *   eyebrow:   small label above the title, e.g. "Invoice"
 *   title:     the email's headline
 *   intro:     first paragraph (HTML allowed, escape your own values)
 *   bodyHtml:  everything else, built from the helpers in this file
 *   cta:       { label, url } for the main button; defaults to opening the app when APP_URL is set
 */
function renderEmail({ preheader = '', eyebrow = '', title, intro = '', bodyHtml = '', cta } = {}) {
  const logoSrc = config.mail.logoUrl || `cid:${LOGO_CID}`;
  const action = cta === undefined ? (config.mail.appUrl ? { label: 'Open the VEN Shipping app', url: config.mail.appUrl } : null) : cta;
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(title)}</title>
<style>
  body{margin:0;padding:0;-webkit-text-size-adjust:100%}
  a{color:${NAVY}}
  @media only screen and (max-width:620px){
    .container{width:100%!important}
    .px{padding-left:22px!important;padding-right:22px!important}
    .title{font-size:24px!important;line-height:32px!important}
    .hero-value{font-size:28px!important;line-height:38px!important}
    .stack{display:block!important;width:100%!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${PAGE}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${PAGE}">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE}">
<tr><td align="center" style="padding:28px 12px">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px">
<tr><td class="px" style="background:${NAVY};padding:28px 40px 26px;border-radius:16px 16px 0 0">
<img src="${esc(logoSrc)}" width="220" height="25" alt="VEN International Logistics" style="display:block;border:0;outline:none;width:220px;height:auto;max-width:100%;font-family:${FONT};font-size:18px;font-weight:800;color:#FFFFFF">
</td></tr>
<tr><td style="background:${LIME};height:4px;line-height:4px;font-size:4px">&nbsp;</td></tr>
<tr><td class="px" style="background:#FFFFFF;padding:36px 40px 20px">
${eyebrow ? `<div style="font-family:${FONT};font-size:12px;line-height:16px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:${MUTED};margin-bottom:8px">${esc(eyebrow)}</div>` : ''}
<h1 class="title" style="margin:0 0 16px;font-family:${FONT};font-size:28px;line-height:36px;font-weight:800;color:${NAVY}">${esc(title)}</h1>
${intro ? paragraph(intro) : ''}
${bodyHtml}
${action ? button(action.label, action.url) : ''}
</td></tr>
${footer()}
</table>
</td></tr>
</table>
</body>
</html>`;
}

module.exports = {
  COLORS: { NAVY, NAVY_LIGHT, LIME, LIME_TINT, PAGE, BORDER, MUTED, TEXT },
  FONT,
  esc,
  paragraph,
  heading,
  detailsTable,
  callout,
  hero,
  pill,
  button,
  renderEmail,
  logoAttachments,
};
