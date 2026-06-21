const { z } = require('zod');

const sendOtpSchema = z.object({
  phone: z.string().regex(/^\+?[6-9]\d{9}$/, 'Invalid Indian phone number'),
  purpose: z.enum(['LOGIN', 'REGISTER']).default('LOGIN'),
});

const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\+?[6-9]\d{9}$/, 'Invalid Indian phone number'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  device_id: z.string().min(1, 'device_id is required'),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

const logoutSchema = z.object({
  refresh_token: z.string().min(1),
});

module.exports = { sendOtpSchema, verifyOtpSchema, refreshSchema, logoutSchema };
