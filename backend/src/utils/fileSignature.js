const fs = require('fs/promises');

async function readHeader(filePath, bytes = 8) {
  const fileHandle = await fs.open(filePath, 'r');

  try {
    const buffer = Buffer.alloc(bytes);
    await fileHandle.read(buffer, 0, bytes, 0);
    return buffer;
  } finally {
    await fileHandle.close();
  }
}

async function detectFileSignature(filePath) {
  const header = await readHeader(filePath, 8);

  if (header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46) {
    return 'pdf';
  }

  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  ) {
    return 'png';
  }

  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return 'jpg';
  }

  if (header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04) {
    return 'zip';
  }

  return 'unknown';
}

module.exports = {
  detectFileSignature
};
