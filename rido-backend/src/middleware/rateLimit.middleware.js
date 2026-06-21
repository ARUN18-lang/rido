const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { getRedis } = require('../config/redis');

function createLimiter({ windowMs, max, keyGenerator, message }) {
  const options = {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMIT', message: message || 'Too many requests' } },
  };

  if (keyGenerator) options.keyGenerator = keyGenerator;

  try {
    options.store = new RedisStore({
      sendCommand: (...args) => getRedis().call(...args),
    });
  } catch {
    // Fallback to memory store if Redis unavailable
  }

  return rateLimit(options);
}

const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many API requests, please try again later',
});

const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many auth requests, please try again later',
});

const otpLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => `${req.ip}:${req.body?.phone || 'unknown'}`,
  message: 'OTP rate limit exceeded',
});

module.exports = { apiLimiter, authLimiter, otpLimiter };
