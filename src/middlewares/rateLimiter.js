const rateLimit = require('express-rate-limit');
const { createLogger } = require('../config/logger');

const logger = createLogger('RateLimiter');

// Настройка rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов за 15 минут
  message: {
    status: 'error',
    message: 'Too many requests, please try again later'
  },
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      status: 'error',
      message: 'Too many requests, please try again later'
    });
  }
});

module.exports = {
  rateLimiter: limiter
}; 