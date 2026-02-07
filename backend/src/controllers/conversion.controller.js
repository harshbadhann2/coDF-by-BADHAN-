const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const mime = require('mime-types');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');
const { sanitizeBaseName } = require('../utils/sanitizeFilename');
const { resolveOutputFilePath } = require('../utils/outputFile');
const { safeUnlink, scheduleFileCleanup } = require('../utils/fileCleanup');
const { env } = require('../config/env');
const { generateCodePdfService } = require('../services/codePdf.service');
const { parseCodeFile } = require('../services/codeFile.service');
const { convertDocxToPdfService, convertPdfToDocxService } = require('../services/document.service');
const { convertImageService } = require('../services/image.service');

function buildDownloadPayload(result) {
  return {
    outputFileName: result.outputFileName,
    originalName: result.originalName,
    downloadPath: `/api/files/${result.outputFileName}`,
    expiresInMs: env.fileTtlMs
  };
}

const codeToPdfController = asyncHandler(async (req, res) => {
  const { code, filename, language, title, section } = req.body;

  if (!code || typeof code !== 'string' || !code.trim()) {
    throw new AppError(400, 'code is required and must be a non-empty string.');
  }

  if (code.length > env.maxCodeChars) {
    throw new AppError(413, `Code exceeds the max limit of ${env.maxCodeChars} characters.`);
  }

  const result = await generateCodePdfService({
    code,
    filename,
    language,
    title,
    section
  });

  scheduleFileCleanup(result.outputPath, env.fileTtlMs);

  res.status(201).json({
    success: true,
    data: {
      ...buildDownloadPayload(result),
      detectedLanguage: result.detectedLanguage
    }
  });
});

const codeFileToPdfController = asyncHandler(async (req, res) => {
  const uploadedPath = req.file.path;
  const originalBaseName = sanitizeBaseName(path.parse(req.file.originalname).name);

  try {
    const parsed = await parseCodeFile({
      filePath: uploadedPath,
      originalName: req.file.originalname,
      languageOverride: req.body.language || ''
    });

    const result = await generateCodePdfService({
      code: parsed.code,
      filename: req.body.filename || originalBaseName,
      language: parsed.language,
      title: req.body.title,
      section: req.body.section
    });

    scheduleFileCleanup(result.outputPath, env.fileTtlMs);

    res.status(201).json({
      success: true,
      data: {
        ...buildDownloadPayload(result),
        detectedLanguage: result.detectedLanguage
      }
    });
  } finally {
    await safeUnlink(uploadedPath);
  }
});

const docxToPdfController = asyncHandler(async (req, res) => {
  const uploadedPath = req.file.path;
  const originalBaseName = sanitizeBaseName(path.parse(req.file.originalname).name);

  try {
    const result = await convertDocxToPdfService({
      inputPath: uploadedPath,
      originalBaseName
    });

    scheduleFileCleanup(result.outputPath, env.fileTtlMs);

    res.status(201).json({
      success: true,
      data: buildDownloadPayload(result)
    });
  } finally {
    await safeUnlink(uploadedPath);
  }
});

const pdfToDocxController = asyncHandler(async (req, res) => {
  const uploadedPath = req.file.path;
  const originalBaseName = sanitizeBaseName(path.parse(req.file.originalname).name);

  try {
    const result = await convertPdfToDocxService({
      inputPath: uploadedPath,
      originalBaseName
    });

    scheduleFileCleanup(result.outputPath, env.fileTtlMs);

    res.status(201).json({
      success: true,
      data: buildDownloadPayload(result)
    });
  } finally {
    await safeUnlink(uploadedPath);
  }
});

const imageConvertController = asyncHandler(async (req, res) => {
  const uploadedPath = req.file.path;
  const originalBaseName = sanitizeBaseName(path.parse(req.file.originalname).name);

  try {
    const result = await convertImageService({
      inputPath: uploadedPath,
      targetFormat: req.body.targetFormat,
      originalBaseName
    });

    scheduleFileCleanup(result.outputPath, env.fileTtlMs);

    res.status(201).json({
      success: true,
      data: buildDownloadPayload(result)
    });
  } finally {
    await safeUnlink(uploadedPath);
  }
});

const downloadFileController = asyncHandler(async (req, res) => {
  const outputPath = resolveOutputFilePath(req.params.fileName);

  let stats;

  try {
    stats = await fsp.stat(outputPath);
  } catch (_error) {
    throw new AppError(404, 'File not found or expired.');
  }

  const extension = path.extname(outputPath).toLowerCase();
  const contentType = mime.lookup(extension) || 'application/octet-stream';
  const disposition = ['.png', '.jpg', '.jpeg'].includes(extension) ? 'inline' : 'attachment';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', stats.size);
  res.setHeader('Content-Disposition', `${disposition}; filename="${path.basename(outputPath)}"`);

  const stream = fs.createReadStream(outputPath);

  stream.on('error', () => {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to read converted file.' });
    }
  });

  stream.pipe(res);
});

module.exports = {
  codeToPdfController,
  codeFileToPdfController,
  docxToPdfController,
  pdfToDocxController,
  imageConvertController,
  downloadFileController
};
