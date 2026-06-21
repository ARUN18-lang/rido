const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const { UnauthorizedError } = require('./errors');

function signAccessToken(payload) {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiry,
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry,
  });
}

function verifyAccessToken(token) {
  const secrets = [config.jwt.accessSecret, config.jwt.oldAccessSecret].filter(Boolean);
  let lastError;
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret);
    } catch (err) {
      lastError = err;
    }
  }
  throw new UnauthorizedError('Invalid or expired access token');
}

function verifyRefreshToken(token) {
  const secrets = [config.jwt.refreshSecret, config.jwt.oldRefreshSecret].filter(Boolean);
  let lastError;
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret);
    } catch (err) {
      lastError = err;
    }
  }
  throw new UnauthorizedError('Invalid or expired refresh token');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getRefreshTokenExpiry() {
  const match = config.jwt.refreshExpiry.match(/^(\d+)([dhms])$/);
  if (!match) return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const [, num, unit] = match;
  const multipliers = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
  return new Date(Date.now() + parseInt(num, 10) * multipliers[unit]);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
};
