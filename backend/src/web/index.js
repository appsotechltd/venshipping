const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const content = require('./content');
const portal = require('./portal');
const { requireAdminLogin } = require('./auth');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^(image\/(png|jpe?g|gif|webp)|video\/(mp4|webm))$/.test(file.mimetype)),
});

const router = express.Router();

router.use(content.router);
router.use(portal.router);

// Everything under /api/web/admin needs an admin login.
const admin = express.Router();
admin.use(content.admin);
admin.use(portal.admin);
router.use('/admin', admin);

router.post('/upload', requireAdminLogin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Upload an image (png, jpg, gif, webp) or video (mp4, webm) up to 10 MB.' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// Same error shapes the website already reads (`message`).
// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  if (err.status === 422) {
    const first = err.fields && Object.values(err.fields)[0];
    return res.status(422).json({ message: first || err.message, fields: err.fields });
  }
  if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'File is too large (10 MB max).' });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

module.exports = { router, uploadDir };
