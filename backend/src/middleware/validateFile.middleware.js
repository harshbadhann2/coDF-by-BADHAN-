const path = require('path');
const { AppError } = require('../utils/AppError');
const { detectFileSignature } = require('../utils/fileSignature');
const { safeUnlink } = require('../utils/fileCleanup');

const profiles = {
  docx: {
    exts: new Set(['.docx']),
    signatures: new Set(['zip']),
    mimes: new Set([
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
      'application/x-zip-compressed',
      'application/octet-stream'
    ])
  },
  pdf: {
    exts: new Set(['.pdf']),
    signatures: new Set(['pdf']),
    mimes: new Set([
      'application/pdf',
      'application/x-pdf',
      'application/acrobat',
      'application/vnd.pdf',
      'text/pdf',
      'application/octet-stream'
    ])
  },
  image: {
    exts: new Set(['.jpg', '.jpeg', '.png']),
    signatures: new Set(['jpg', 'png']),
    mimes: new Set([
      'image/jpeg',
      'image/png',
      'image/x-citrix-jpeg',
      'image/x-png',
      'image/pjpeg',
      'application/octet-stream'
    ])
  },
  code: {
    exts: new Set(['.c', '.cpp', '.py', '.ipynb']),
    signatures: new Set(['unknown']),
    mimes: new Set([
      'text/plain',
      'text/x-python',
      'text/x-c',
      'text/x-c++',
      'application/json',
      'application/octet-stream'
    ])
  }
};

function validateUploadedFile(profileName) {
  return (req, _res, next) => {
    (async () => {
      const profile = profiles[profileName];

      if (!profile) {
        throw new AppError(500, `Unknown validation profile: ${profileName}`);
      }

      const { file } = req;

      if (!file) {
        throw new AppError(400, 'Please upload a file.');
      }

      const extension = path.extname(file.originalname || '').toLowerCase();

      if (!profile.exts.has(extension)) {
        await safeUnlink(file.path);
        throw new AppError(400, `Invalid file extension: ${extension || 'none'}.`);
      }

      if (file.mimetype && !profile.mimes.has(file.mimetype)) {
        await safeUnlink(file.path);
        throw new AppError(400, 'Invalid MIME type.');
      }

      const signature = await detectFileSignature(file.path);

      if (!profile.signatures.has(signature)) {
        await safeUnlink(file.path);
        throw new AppError(400, 'Uploaded file signature is invalid or corrupted.');
      }
    })()
      .then(() => next())
      .catch(next);
  };
}

module.exports = {
  validateUploadedFile
};
