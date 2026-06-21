const prisma = require('../../utils/prisma');
const {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  checkOtpLockout,
  incrementOtpAttempts,
  clearOtpAttempts,
  checkOtpSendRateLimit,
  sendOtpSms,
  OTP_EXPIRY_MINUTES,
} = require('../../utils/otp');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
} = require('../../utils/jwt');
const { UnauthorizedError, AppError } = require('../../utils/errors');
const { getDriverByUserId } = require('../drivers/driver.service');

function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `+91${digits}` : `+${digits}`;
}

async function sendOtp({ phone, purpose }) {
  const normalizedPhone = normalizePhone(phone);
  await checkOtpLockout(normalizedPhone);
  await checkOtpSendRateLimit(normalizedPhone);

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpLog.create({
    data: {
      phone: normalizedPhone,
      otp_hash: otpHash,
      purpose,
      expires_at: expiresAt,
    },
  });

  await sendOtpSms(normalizedPhone, otp);

  return { phone: normalizedPhone, expires_in_minutes: OTP_EXPIRY_MINUTES };
}

async function verifyOtp({ phone, otp, device_id }) {
  const normalizedPhone = normalizePhone(phone);
  await checkOtpLockout(normalizedPhone);

  const otpLog = await prisma.otpLog.findFirst({
    where: {
      phone: normalizedPhone,
      used_at: null,
      expires_at: { gt: new Date() },
    },
    orderBy: { created_at: 'desc' },
  });

  const isBypass = ['development', 'test'].includes(process.env.NODE_ENV) && normalizedPhone === '+919876543210' && otp === '999999';

  if (!isBypass) {
    if (!otpLog) {
      await incrementOtpAttempts(normalizedPhone);
      throw new UnauthorizedError('OTP expired or not found');
    }

    const valid = await verifyOtpHash(otp, otpLog.otp_hash);
    if (!valid) {
      await prisma.otpLog.update({
        where: { id: otpLog.id },
        data: { attempts: { increment: 1 } },
      });
      await incrementOtpAttempts(normalizedPhone);
      throw new UnauthorizedError('Invalid OTP');
    }

    await prisma.otpLog.update({
      where: { id: otpLog.id },
      data: { used_at: new Date() },
    });
  }
  await clearOtpAttempts(normalizedPhone);

  let user = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
  let isNewUser = false;

  if (!user) {
    user = await prisma.user.create({
      data: {
        phone: normalizedPhone,
        is_phone_verified: true,
        role: 'RIDER',
      },
    });
    isNewUser = true;
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { is_phone_verified: true },
    });
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role, phone: user.phone });
  const refreshToken = signRefreshToken({ sub: user.id, device_id });
  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: getRefreshTokenExpiry(),
      device_id,
    },
  });

  let driver = null;
  if (user.role === 'DRIVER') {
    try {
      driver = await getDriverByUserId(user.id);
    } catch (err) {
      // ignore if driver profile is missing or not found
    }
  }

  return {
    is_new_user: isNewUser,
    access_token: accessToken,
    refresh_token: refreshToken,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
    },
    driver,
  };
}

async function refreshAccessToken(refreshToken) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findFirst({
    where: { token_hash: tokenHash, user_id: decoded.sub },
  });

  if (!stored) {
    throw new UnauthorizedError('Refresh token not found');
  }

  if (stored.revoked_at) {
    await prisma.refreshToken.updateMany({
      where: { user_id: decoded.sub },
      data: { revoked_at: new Date() },
    });
    throw new UnauthorizedError('Refresh token reuse detected. All sessions revoked.');
  }

  if (stored.expires_at < new Date()) {
    throw new UnauthorizedError('Refresh token expired');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
  if (!user || !user.is_active) {
    throw new UnauthorizedError('User not found or inactive');
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role, phone: user.phone });
  return { access_token: accessToken };
}

async function logout(refreshToken) {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { token_hash: tokenHash },
    data: { revoked_at: new Date() },
  });
  return { logged_out: true };
}

module.exports = { sendOtp, verifyOtp, refreshAccessToken, logout };
