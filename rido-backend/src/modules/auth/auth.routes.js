const { Router } = require('express');
const controller = require('./auth.controller');
const { validate } = require('../../middleware/validate.middleware');
const { authLimiter, otpLimiter } = require('../../middleware/rateLimit.middleware');
const schemas = require('./auth.schema');

const router = Router();

router.post('/send-otp', authLimiter, otpLimiter, validate(schemas.sendOtpSchema), controller.sendOtp);
router.post('/verify-otp', authLimiter, validate(schemas.verifyOtpSchema), controller.verifyOtp);
router.post('/refresh', validate(schemas.refreshSchema), controller.refresh);
router.post('/logout', validate(schemas.logoutSchema), controller.logout);

module.exports = router;
