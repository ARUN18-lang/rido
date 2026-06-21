const bcrypt = require('bcrypt');
const crypto = require('crypto');
const config = require('../config');
const { getRedis } = require('../config/redis');
const logger = require('./logger');
const { AppError } = require('./errors');

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const MAX_OTP_SENDS_PER_HOUR = 3;
const LOCKOUT_MINUTES = 60;

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

async function hashOtp(otp) {
  return bcrypt.hash(otp, 10);
}

async function verifyOtpHash(otp, hash) {
  return bcrypt.compare(otp, hash);
}

async function checkOtpLockout(phone) {
  const redis = getRedis();
  const locked = await redis.get(config.redisKeys.otpLock(phone));
  if (locked) {
    throw new AppError('OTP_LOCKED', 'Too many failed attempts. Try again later.', 429);
  }
}

async function incrementOtpAttempts(phone) {
  const redis = getRedis();
  const key = config.redisKeys.otpAttempts(phone);
  const attempts = await redis.incr(key);
  if (attempts === 1) {
    await redis.expire(key, LOCKOUT_MINUTES * 60);
  }
  if (attempts >= MAX_OTP_ATTEMPTS) {
    await redis.set(config.redisKeys.otpLock(phone), '1', 'EX', LOCKOUT_MINUTES * 60);
    await redis.del(key);
    throw new AppError('OTP_LOCKED', 'Too many failed attempts. Account locked for 1 hour.', 429);
  }
  return attempts;
}

async function clearOtpAttempts(phone) {
  const redis = getRedis();
  await redis.del(config.redisKeys.otpAttempts(phone));
  await redis.del(config.redisKeys.otpLock(phone));
}

async function checkOtpSendRateLimit(phone) {
  const redis = getRedis();
  const key = config.redisKeys.otpSendCount(phone);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 3600);
  }
  if (count > MAX_OTP_SENDS_PER_HOUR) {
    throw new AppError('OTP_RATE_LIMIT', 'Maximum OTP sends exceeded. Try again in an hour.', 429);
  }
}

async function sendOtpSms(phone, otp, language = 'ta') {
  const { apiKey, senderId, otpTemplateId } = config.msg91;

  if (!apiKey) {
    logger.info('MSG91 not configured, OTP for dev', { phone, otp });
    return { sent: true, dev: true };
  }

  const payload = {
    template_id: otpTemplateId,
    short_url: '0',
    recipients: [{ mobiles: phone.replace('+', ''), OTP: otp }],
  };

  const response = await fetch('https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: {
      authkey: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      sender: senderId,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error('MSG91 send failed', { phone, error: text });
    throw new AppError('OTP_SEND_FAILED', 'Failed to send OTP', 500);
  }

  return { sent: true };
}

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  checkOtpLockout,
  incrementOtpAttempts,
  clearOtpAttempts,
  checkOtpSendRateLimit,
  sendOtpSms,
  OTP_EXPIRY_MINUTES,
  MAX_OTP_ATTEMPTS,
};
