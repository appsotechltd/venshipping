const express = require('express');
const config = require('../config');
const db = require('../db');
const { requireAdminLogin } = require('./auth');
const { sendMail } = require('./mail');

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const service = (r) => ({
  id: r.id,
  name: r.name,
  shortDescription: r.short_description,
  longDescription: r.long_description,
  iconName: r.icon_name,
  image: r.image,
  keyFeatures: r.key_features,
});
const slide = (r) => ({ id: Number(r.id), type: r.type, url: r.url, title: r.title, subtitle: r.subtitle, sortOrder: r.sort_order });
const testimonial = (r) => ({
  id: Number(r.id), name: r.name, company: r.company, message: r.message, rating: r.rating, status: r.status, createdAt: r.created_at,
});
const address = (r) => ({ id: Number(r.id), title: r.title, address: r.address, sortOrder: r.sort_order });
const phone = (r) => ({ id: Number(r.id), label: r.label, number: r.number, showInHeader: r.show_in_header, sortOrder: r.sort_order });

async function readScope(scope, { json = false } = {}) {
  const { rows } = await db.query('SELECT key, value FROM site_content WHERE scope = $1', [scope]);
  const out = {};
  for (const r of rows) {
    if (json) {
      try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; }
    } else {
      out[r.key] = r.value;
    }
  }
  return out;
}

async function writeScope(scope, body, { json = false } = {}) {
  for (const [key, value] of Object.entries(body || {})) {
    const stored = json && typeof value !== 'string' ? JSON.stringify(value) : value;
    await db.query(
      'INSERT INTO site_content (scope, key, value) VALUES ($1, $2, $3) ON CONFLICT (scope, key) DO UPDATE SET value = EXCLUDED.value',
      [scope, key, stored],
    );
  }
}

// ---- Public content ----
router.get('/content/services', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM site_services ORDER BY name');
  res.json(rows.map(service));
}));

router.get('/content/services/:id', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM site_services WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Service not found' });
  res.json(service(rows[0]));
}));

router.get('/content/faqs', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT id, question, answer FROM site_faqs ORDER BY id');
  res.json(rows.map((r) => ({ ...r, id: Number(r.id) })));
}));

router.get('/content/homepage', wrap(async (req, res) => res.json(await readScope('homepage', { json: true }))));
router.get('/content/settings', wrap(async (req, res) => res.json(await readScope('settings'))));
router.get('/content/popup', wrap(async (req, res) => res.json(await readScope('popup'))));
router.get('/content/booking-page', wrap(async (req, res) => res.json(await readScope('booking_page'))));

router.get('/content/slides', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM site_slides ORDER BY sort_order, id');
  res.json(rows.map(slide));
}));

router.get('/content/testimonials', wrap(async (req, res) => {
  const { rows } = await db.query("SELECT * FROM testimonials WHERE status = 'approved' ORDER BY created_at DESC");
  res.json(rows.map(testimonial));
}));

router.get('/content/addresses', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM site_addresses ORDER BY sort_order, id');
  res.json(rows.map(address));
}));

router.get('/content/phones', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM site_phones ORDER BY sort_order, id');
  res.json(rows.map(phone));
}));

// ---- Public forms ----
router.post('/testimonials', wrap(async (req, res) => {
  const { name, company, message, rating } = req.body || {};
  if (!name || !message || !rating) return res.status(400).json({ message: 'Name, message, and rating are required.' });
  const n = Number(rating);
  if (!Number.isInteger(n) || n < 1 || n > 5) return res.status(400).json({ message: 'Rating must be a whole number between 1 and 5.' });
  await db.query('INSERT INTO testimonials (name, company, message, rating) VALUES ($1, $2, $3, $4)', [
    String(name).slice(0, 200), company ? String(company).slice(0, 200) : null, String(message).slice(0, 2000), n,
  ]);
  res.status(201).json({ success: true, message: 'Thank you! Your testimonial has been submitted for review.' });
}));

router.post('/contact', wrap(async (req, res) => {
  const { name, email, subject, message } = req.body || {};
  if (!email || !message) return res.status(400).json({ message: 'Email and message are required.' });
  await sendMail({
    to: config.mail.adminRecipients,
    replyTo: String(email),
    subject: `Website contact: ${String(subject || 'New message').slice(0, 120)}`,
    text: `From: ${name || 'Unknown'} <${email}>\n\n${String(message).slice(0, 5000)}`,
  });
  res.json({ message: 'Form submitted successfully.' });
}));

router.post('/newsletter/subscribe', wrap(async (req, res) => {
  const { email, name } = req.body || {};
  if (!email || !/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ message: 'Valid email is required.' });
  try {
    await db.query('INSERT INTO newsletter_subscribers (email, name) VALUES ($1, $2)', [String(email).toLowerCase(), name || null]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'This email is already subscribed.' });
    throw err;
  }
  const settings = await readScope('settings');
  const company = settings.companyName || 'Ven International Logistics';
  sendMail({
    to: String(email),
    subject: `You're subscribed to ${company} newsletter!`,
    text: `Hi ${name || 'there'},\n\nThank you for subscribing to our newsletter! You'll receive updates about our latest shipping deals, news, and offers.\n\nBest regards,\n${company} Team`,
  }).catch((err) => console.error('newsletter confirmation:', err.message));
  res.json({ success: true, message: 'Subscribed successfully! Check your email for confirmation.' });
}));

// ---- Admin content (every route requires an admin login) ----
const admin = express.Router();
admin.use(requireAdminLogin);

admin.get('/settings', wrap(async (req, res) => res.json(await readScope('settings'))));
admin.put('/settings', wrap(async (req, res) => {
  // Admin credentials no longer live in settings.
  const { admin_password, admin_email, admin_name, ...rest } = req.body || {};
  await writeScope('settings', rest);
  res.json({ message: 'Settings updated' });
}));
admin.put('/homepage', wrap(async (req, res) => { await writeScope('homepage', req.body, { json: true }); res.json({ message: 'Homepage updated' }); }));
admin.put('/popup', wrap(async (req, res) => { await writeScope('popup', req.body); res.json({ message: 'Popup settings updated' }); }));
admin.put('/booking-page', wrap(async (req, res) => { await writeScope('booking_page', req.body); res.json({ message: 'Booking page content updated' }); }));

admin.get('/slides', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM site_slides ORDER BY sort_order, id');
  res.json(rows.map(slide));
}));
admin.post('/slides', wrap(async (req, res) => {
  const b = req.body || {};
  const { rows } = await db.query(
    'INSERT INTO site_slides (type, url, title, subtitle, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [b.type, b.url, b.title, b.subtitle, b.sortOrder ?? 0],
  );
  res.status(201).json({ ...b, id: Number(rows[0].id) });
}));
admin.put('/slides/:id', wrap(async (req, res) => {
  const b = req.body || {};
  await db.query('UPDATE site_slides SET type=$1, url=$2, title=$3, subtitle=$4, sort_order=$5 WHERE id=$6',
    [b.type, b.url, b.title, b.subtitle, b.sortOrder ?? 0, req.params.id]);
  res.json({ ...b, id: Number(req.params.id) });
}));
admin.delete('/slides/:id', wrap(async (req, res) => { await db.query('DELETE FROM site_slides WHERE id = $1', [req.params.id]); res.status(204).end(); }));

admin.post('/services', wrap(async (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ message: 'Name is required.' });
  const id = b.id || String(b.name).toLowerCase().replace(/\s+/g, '-');
  await db.query(
    `INSERT INTO site_services (id, name, short_description, long_description, icon_name, image, key_features)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, b.name, b.shortDescription, b.longDescription, b.iconName, b.image, JSON.stringify(b.keyFeatures || [])],
  );
  res.status(201).json({ ...b, id });
}));
admin.put('/services/:id', wrap(async (req, res) => {
  const b = req.body || {};
  await db.query(
    'UPDATE site_services SET name=$1, short_description=$2, long_description=$3, icon_name=$4, image=$5, key_features=$6 WHERE id=$7',
    [b.name, b.shortDescription, b.longDescription, b.iconName, b.image, JSON.stringify(b.keyFeatures || []), req.params.id],
  );
  res.json({ ...b, id: req.params.id });
}));
admin.delete('/services/:id', wrap(async (req, res) => { await db.query('DELETE FROM site_services WHERE id = $1', [req.params.id]); res.status(204).end(); }));

admin.post('/faqs', wrap(async (req, res) => {
  const b = req.body || {};
  const { rows } = await db.query('INSERT INTO site_faqs (question, answer) VALUES ($1, $2) RETURNING id', [b.question, b.answer]);
  res.status(201).json({ ...b, id: Number(rows[0].id) });
}));
admin.put('/faqs/:id', wrap(async (req, res) => {
  const b = req.body || {};
  await db.query('UPDATE site_faqs SET question=$1, answer=$2 WHERE id=$3', [b.question, b.answer, req.params.id]);
  res.json({ ...b, id: Number(req.params.id) });
}));
admin.delete('/faqs/:id', wrap(async (req, res) => { await db.query('DELETE FROM site_faqs WHERE id = $1', [req.params.id]); res.status(204).end(); }));

admin.get('/testimonials', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM testimonials ORDER BY created_at DESC');
  res.json(rows.map(testimonial));
}));
admin.put('/testimonials/:id', wrap(async (req, res) => {
  const { status } = req.body || {};
  if (!['pending', 'approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  await db.query('UPDATE testimonials SET status = $1 WHERE id = $2', [status, req.params.id]);
  res.json({ id: Number(req.params.id), status });
}));
admin.delete('/testimonials/:id', wrap(async (req, res) => { await db.query('DELETE FROM testimonials WHERE id = $1', [req.params.id]); res.status(204).end(); }));

admin.get('/addresses', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM site_addresses ORDER BY sort_order, id');
  res.json(rows.map(address));
}));
admin.post('/addresses', wrap(async (req, res) => {
  const { title, address: addr, sortOrder } = req.body || {};
  const { rows } = await db.query('INSERT INTO site_addresses (title, address, sort_order) VALUES ($1, $2, $3) RETURNING id', [title, addr, sortOrder ?? 99]);
  res.status(201).json({ id: Number(rows[0].id), title, address: addr, sortOrder: sortOrder ?? 99 });
}));
admin.put('/addresses/:id', wrap(async (req, res) => {
  const { title, address: addr, sortOrder } = req.body || {};
  await db.query('UPDATE site_addresses SET title=$1, address=$2, sort_order=$3 WHERE id=$4', [title, addr, sortOrder ?? 99, req.params.id]);
  res.json({ id: Number(req.params.id), title, address: addr, sortOrder: sortOrder ?? 99 });
}));
admin.delete('/addresses/:id', wrap(async (req, res) => { await db.query('DELETE FROM site_addresses WHERE id = $1', [req.params.id]); res.status(204).end(); }));

admin.get('/phones', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM site_phones ORDER BY sort_order, id');
  res.json(rows.map(phone));
}));
admin.post('/phones', wrap(async (req, res) => {
  const { label, number, showInHeader, sortOrder } = req.body || {};
  const { rows } = await db.query('INSERT INTO site_phones (label, number, show_in_header, sort_order) VALUES ($1, $2, $3, $4) RETURNING id',
    [label, number, !!showInHeader, sortOrder ?? 99]);
  res.status(201).json({ id: Number(rows[0].id), label, number, showInHeader: !!showInHeader, sortOrder: sortOrder ?? 99 });
}));
admin.put('/phones/:id', wrap(async (req, res) => {
  const { label, number, showInHeader, sortOrder } = req.body || {};
  if (showInHeader) await db.query('UPDATE site_phones SET show_in_header = false');
  await db.query('UPDATE site_phones SET label=$1, number=$2, show_in_header=$3, sort_order=$4 WHERE id=$5',
    [label, number, !!showInHeader, sortOrder ?? 99, req.params.id]);
  res.json({ id: Number(req.params.id), label, number, showInHeader: !!showInHeader, sortOrder: sortOrder ?? 99 });
}));
admin.delete('/phones/:id', wrap(async (req, res) => { await db.query('DELETE FROM site_phones WHERE id = $1', [req.params.id]); res.status(204).end(); }));

admin.get('/newsletter/subscribers', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC');
  res.json(rows.map((r) => ({ id: Number(r.id), email: r.email, name: r.name, subscribed_at: r.subscribed_at })));
}));
admin.delete('/newsletter/subscribers/:id', wrap(async (req, res) => { await db.query('DELETE FROM newsletter_subscribers WHERE id = $1', [req.params.id]); res.status(204).end(); }));
admin.post('/newsletter/send', wrap(async (req, res) => {
  const { subject, body } = req.body || {};
  if (!subject || !body) return res.status(400).json({ message: 'Subject and body are required.' });
  const { rows } = await db.query('SELECT email FROM newsletter_subscribers');
  if (!rows.length) return res.status(400).json({ message: 'No subscribers found.' });
  let sent = 0;
  let failed = 0;
  for (const { email } of rows) {
    try { await sendMail({ to: email, subject, text: body }); sent += 1; } catch { failed += 1; }
  }
  res.json({ success: true, message: `Newsletter sent to ${sent} subscriber(s). ${failed ? `${failed} failed.` : ''}` });
}));

module.exports = { router, admin };
