const nodemailer = require('nodemailer');
const config = require('../config');

let transporter;

// Plain notification mail for the website. With no SMTP_HOST set it logs instead of sending.
async function sendMail(message) {
  if (!config.mail.host) {
    if (config.env !== 'test') console.log(`[web-mail] SMTP not configured, not sent. To: ${message.to} Subject: ${message.subject}`);
    return;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
    });
  }
  await transporter.sendMail({ from: config.mail.from, ...message });
}

module.exports = { sendMail };
