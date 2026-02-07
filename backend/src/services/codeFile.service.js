const fs = require('fs/promises');
const path = require('path');
const { env } = require('../config/env');
const { AppError } = require('../utils/AppError');

const EXT_LANGUAGE_MAP = {
  '.py': 'python',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.ipynb': 'python'
};

function isProbablyBinary(buffer) {
  const sample = buffer.subarray(0, 2048);
  for (let i = 0; i < sample.length; i += 1) {
    if (sample[i] === 0) {
      return true;
    }
  }
  return false;
}

function extractIpynbCode(json) {
  if (!json || !Array.isArray(json.cells)) {
    throw new AppError(400, 'Invalid .ipynb file format.');
  }

  const codeCells = json.cells.filter((cell) => cell.cell_type === 'code');

  if (codeCells.length === 0) {
    throw new AppError(400, 'No code cells found in the notebook.');
  }

  return codeCells
    .map((cell) => {
      if (Array.isArray(cell.source)) {
        return cell.source.join('');
      }

      if (typeof cell.source === 'string') {
        return cell.source;
      }

      return '';
    })
    .filter(Boolean)
    .join('\n\n');
}

async function parseCodeFile({ filePath, originalName, languageOverride }) {
  const extension = path.extname(originalName || '').toLowerCase();
  const buffer = await fs.readFile(filePath);

  if (buffer.length > env.maxCodeChars) {
    throw new AppError(413, `Code exceeds the max limit of ${env.maxCodeChars} characters.`);
  }

  if (isProbablyBinary(buffer)) {
    throw new AppError(400, 'Uploaded file appears to be binary, not plain text.');
  }

  let code = '';

  if (extension === '.ipynb') {
    let parsed;

    try {
      parsed = JSON.parse(buffer.toString('utf8'));
    } catch (error) {
      throw new AppError(400, 'Unable to parse notebook JSON.');
    }

    code = extractIpynbCode(parsed);
  } else {
    code = buffer.toString('utf8');
  }

  if (!code.trim()) {
    throw new AppError(400, 'Uploaded file contains no readable code.');
  }

  const language = languageOverride || EXT_LANGUAGE_MAP[extension] || '';

  return {
    code,
    language
  };
}

module.exports = {
  parseCodeFile
};
