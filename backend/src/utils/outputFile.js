const path = require('path');
const { env } = require('../config/env');
const { AppError } = require('./AppError');

const SAFE_OUTPUT_NAME = /^[a-f0-9-]+\.(pdf|docx|png|jpe?g)$/i;

function resolveOutputFilePath(fileName) {
  if (!SAFE_OUTPUT_NAME.test(fileName || '')) {
    throw new AppError(400, 'Invalid file identifier.');
  }

  const resolved = path.join(env.outputDir, fileName);

  if (path.dirname(resolved) !== env.outputDir) {
    throw new AppError(400, 'Invalid file path.');
  }

  return resolved;
}

module.exports = { resolveOutputFilePath };
