const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const rootDir = process.cwd();
const uploadDirName = process.env.UPLOAD_DIR || 'uploads';
const outputDirName = process.env.OUTPUT_DIR || 'outputs';
const publicDirName = process.env.PUBLIC_DIR || 'public';

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 3030),
  allowedOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  maxFileSizeBytes: toInt(process.env.MAX_FILE_SIZE_MB, 10) * 1024 * 1024,
  fileTtlMs: toInt(process.env.FILE_TTL_MS, 15 * 60 * 1000),
  rateLimitWindowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: toInt(process.env.RATE_LIMIT_MAX, 120),
  maxCodeChars: toInt(process.env.MAX_CODE_CHARS, 300000),
  libreOfficePath: process.env.LIBREOFFICE_PATH || 'soffice',
  libreOfficeTimeoutMs: toInt(process.env.LIBREOFFICE_TIMEOUT_MS, 120000),
  codePdfFontRegular: process.env.CODE_PDF_FONT_REGULAR || '',
  codePdfFontItalic: process.env.CODE_PDF_FONT_ITALIC || '',
  codePdfFontBold: process.env.CODE_PDF_FONT_BOLD || '',
  codePdfFontBoldItalic: process.env.CODE_PDF_FONT_BOLD_ITALIC || '',
  uploadDirName,
  outputDirName,
  publicDirName,
  uploadDir: path.resolve(rootDir, uploadDirName),
  outputDir: path.resolve(rootDir, outputDirName),
  publicDir: path.resolve(rootDir, publicDirName)
};

module.exports = { env };
