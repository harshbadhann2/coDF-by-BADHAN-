const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { env } = require('../config/env');
const { AppError } = require('../utils/AppError');
const { sanitizeBaseName } = require('../utils/sanitizeFilename');
const { runCommand } = require('../utils/runCommand');

function unique(list) {
  return Array.from(new Set(list.filter(Boolean)));
}

function getLibreOfficeCandidates() {
  const platform = process.platform;
  const candidates = [env.libreOfficePath, 'soffice', 'libreoffice'];

  if (platform === 'darwin') {
    candidates.push(
      '/Applications/LibreOffice.app/Contents/MacOS/soffice',
      '/Applications/LibreOffice.app/Contents/MacOS/soffice.bin'
    );
  }

  if (platform === 'linux') {
    candidates.push('/usr/bin/soffice', '/usr/local/bin/soffice', '/snap/bin/libreoffice');
  }

  if (platform === 'win32') {
    candidates.push(
      'C:\\\\Program Files\\\\LibreOffice\\\\program\\\\soffice.exe',
      'C:\\\\Program Files (x86)\\\\LibreOffice\\\\program\\\\soffice.exe'
    );
  }

  return unique(candidates);
}

async function runLibreOffice(args, timeoutMs) {
  const candidates = getLibreOfficeCandidates();
  let lastError;

  for (const candidate of candidates) {
    const isPathLike = candidate.includes('/') || candidate.includes('\\\\');

    if (isPathLike && !fsSync.existsSync(candidate)) {
      continue;
    }

    try {
      await runCommand(candidate, args, { timeoutMs });
      return;
    } catch (error) {
      lastError = error;
      if (error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }
  }

  if (lastError && lastError.code === 'ENOENT') {
    throw new AppError(
      500,
      "LibreOffice was not detected. Install LibreOffice and set LIBREOFFICE_PATH (macOS example: /Applications/LibreOffice.app/Contents/MacOS/soffice)."
    );
  }

  throw new AppError(500, 'LibreOffice conversion failed before starting.');
}

async function convertWithLibreOffice(inputPath, convertToArg, outputExt, originalBaseName) {
  // Isolate each conversion into its own temporary output directory.
  const tempOutDir = path.join(env.outputDir, `tmp-${uuidv4()}`);
  await fs.mkdir(tempOutDir, { recursive: true });

  try {
    await runLibreOffice(
      [
        '--headless',
        '--nologo',
        '--nolockcheck',
        '--nodefault',
        '--nofirststartwizard',
        '--convert-to',
        convertToArg,
        '--outdir',
        tempOutDir,
        inputPath
      ],
      env.libreOfficeTimeoutMs
    );

    const files = await fs.readdir(tempOutDir);
    const convertedName = files.find((name) => path.extname(name).toLowerCase() === `.${outputExt}`);

    if (!convertedName) {
      throw new AppError(500, `LibreOffice did not produce a .${outputExt} file.`);
    }

    const outputFileName = `${uuidv4()}.${outputExt}`;
    const outputPath = path.join(env.outputDir, outputFileName);

    await fs.rename(path.join(tempOutDir, convertedName), outputPath);

    return {
      outputPath,
      outputFileName,
      originalName: `${sanitizeBaseName(originalBaseName)}.${outputExt}`
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(500, `Document conversion failed: ${error.message}`);
  } finally {
    await fs.rm(tempOutDir, { recursive: true, force: true });
  }
}

async function convertDocxToPdfService({ inputPath, originalBaseName }) {
  return convertWithLibreOffice(inputPath, 'pdf', 'pdf', originalBaseName);
}

async function convertPdfToDocxService({ inputPath, originalBaseName }) {
  const outputFileName = `${uuidv4()}.docx`;
  const outputPath = path.join(env.outputDir, outputFileName);
  const scriptPath = path.join(__dirname, '../scripts/pdf_to_docx.py');

  // Try to find the python executable in the venv
  const venvPython = path.join(__dirname, '../../venv/bin/python3');
  const systemPython = 'python3';

  let pythonPath = systemPython;
  if (fsSync.existsSync(venvPython)) {
    pythonPath = venvPython;
  }

  try {
    await runCommand(pythonPath, [scriptPath, inputPath, outputPath], { timeoutMs: env.libreOfficeTimeoutMs });

    return {
      outputPath,
      outputFileName,
      originalName: `${sanitizeBaseName(originalBaseName)}.docx`
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, `PDF conversion failed: ${error.message}`);
  }
}

module.exports = {
  convertDocxToPdfService,
  convertPdfToDocxService
};
