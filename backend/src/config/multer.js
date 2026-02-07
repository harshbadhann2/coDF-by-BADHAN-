const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { env } = require('./env');

const allowedExtensions = new Set([
  '.docx',
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.c',
  '.cpp',
  '.py',
  '.ipynb'
]);

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, env.uploadDir);
  },
  filename(_req, file, cb) {
    const extension = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${uuidv4()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: env.maxFileSizeBytes,
    files: 1
  },
  fileFilter(_req, file, cb) {
    const extension = path.extname(file.originalname || '').toLowerCase();

    if (!allowedExtensions.has(extension)) {
      const error = new Error('Unsupported file extension.');
      error.statusCode = 400;
      cb(error);
      return;
    }

    cb(null, true);
  }
});

module.exports = { upload };
