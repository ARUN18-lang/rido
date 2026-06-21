const authService = require('./auth.service');
const { sendSuccess } = require('../../utils/response');

async function sendOtp(req, res, next) {
  try {
    const result = await authService.sendOtp(req.body);
    sendSuccess(res, result, 'OTP sent successfully');
  } catch (err) {
    next(err);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const result = await authService.verifyOtp(req.body);
    sendSuccess(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const result = await authService.refreshAccessToken(req.body.refresh_token);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const result = await authService.logout(req.body.refresh_token);
    sendSuccess(res, result, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = { sendOtp, verifyOtp, refresh, logout };
