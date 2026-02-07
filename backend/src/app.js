const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const sharp = require('sharp');
const { apiRouter } = require('./routes');
const { env } = require('./config/env');
const { corsOptions } = require('./config/cors');
const { limiter } = require('./middleware/rateLimit.middleware');
const { notFound } = require('./middleware/notFound.middleware');
const { errorHandler } = require('./middleware/error.middleware');
const { cleanupOldFiles } = require('./utils/fileCleanup');

[env.uploadDir, env.outputDir, env.publicDir].forEach((directoryPath) => {
  fs.mkdirSync(directoryPath, { recursive: true });
});

// Keep Sharp memory usage predictable on smaller free-tier instances.
sharp.cache(false);
sharp.concurrency(1);

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(limiter);

app.use('/api', apiRouter);

const frontendIndex = path.join(env.publicDir, 'index.html');
if (fs.existsSync(frontendIndex)) {
  app.use(express.static(env.publicDir));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }

    res.sendFile(frontendIndex);
  });
}

setInterval(() => {
  // Remove stale temporary artifacts in case scheduled cleanup was missed.
  cleanupOldFiles(env.uploadDir, env.fileTtlMs).catch(() => null);
  cleanupOldFiles(env.outputDir, env.fileTtlMs).catch(() => null);
}, env.fileTtlMs).unref();

app.use(notFound);
app.use(errorHandler);

module.exports = { app };
