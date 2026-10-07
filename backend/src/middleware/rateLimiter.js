const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // max 20 attempts per IP in that time
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many attempts. Please try again in 15 minutes.',
  },
});

module.exports = authLimiter;