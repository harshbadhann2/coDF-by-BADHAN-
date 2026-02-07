const fs = require('fs/promises');
const path = require('path');

async function safeUnlink(filePath) {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      // eslint-disable-next-line no-console
      console.error('File cleanup failed:', filePath, error.message);
    }
  }
}

function scheduleFileCleanup(filePath, ttlMs) {
  const timer = setTimeout(() => {
    safeUnlink(filePath);
  }, ttlMs);

  timer.unref();
}

async function cleanupOldFiles(directoryPath, maxAgeMs) {
  const now = Date.now();
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const filePath = path.join(directoryPath, entry.name);

        try {
          const stats = await fs.stat(filePath);
          if (now - stats.mtimeMs > maxAgeMs) {
            await safeUnlink(filePath);
          }
        } catch (error) {
          if (error.code !== 'ENOENT') {
            // eslint-disable-next-line no-console
            console.error('Failed to inspect file for cleanup:', filePath, error.message);
          }
        }
      })
  );
}

module.exports = {
  safeUnlink,
  scheduleFileCleanup,
  cleanupOldFiles
};
