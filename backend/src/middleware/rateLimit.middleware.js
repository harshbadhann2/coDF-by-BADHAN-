const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');

const limiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please retry shortly.'
  }
});

module.exports = {
  limiter
};
