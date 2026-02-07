const express = require('express');
const { healthRouter } = require('./health.routes');
const { conversionRouter } = require('./conversion.routes');
const { filesRouter } = require('./files.routes');

const router = express.Router();

router.use('/health', healthRouter);
router.use('/convert', conversionRouter);
router.use('/files', filesRouter);

module.exports = { apiRouter: router };
