const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { env } = require('../config/env');
const { AppError } = require('../utils/AppError');
const { sanitizeBaseName } = require('../utils/sanitizeFilename');

async function convertImageService({ inputPath, targetFormat, originalBaseName }) {
  const normalizedTarget = (targetFormat || '').toLowerCase();

  if (!['png', 'jpg', 'jpeg'].includes(normalizedTarget)) {
    throw new AppError(400, 'targetFormat must be png or jpg.');
  }

  const outputExt = normalizedTarget === 'jpeg' ? 'jpg' : normalizedTarget;
  const outputFileName = `${uuidv4()}.${outputExt}`;
  const outputPath = path.join(env.outputDir, outputFileName);

  try {
    const pipeline = sharp(inputPath, {
      failOn: 'error'
    }).rotate();

    if (outputExt === 'png') {
      await pipeline.png({ compressionLevel: 9 }).toFile(outputPath);
    } else {
      await pipeline.jpeg({ quality: 90, mozjpeg: true }).toFile(outputPath);
    }

    return {
      outputPath,
      outputFileName,
      originalName: `${sanitizeBaseName(originalBaseName)}.${outputExt}`
    };
  } catch (error) {
    throw new AppError(500, `Image conversion failed: ${error.message}`);
  }
}

module.exports = {
  convertImageService
};
