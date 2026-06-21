const { Router } = require('express');
const controller = require('./payment.controller');
const { verifyAccessToken } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');
const { validate } = require('../../middleware/validate.middleware');
const schemas = require('./payment.schema');

const router = Router();

router.use(verifyAccessToken);

router.post('/initiate', validate(schemas.initiatePaymentSchema), controller.initiate);
router.post('/verify', validate(schemas.verifyPaymentSchema), controller.verify);
router.post('/:rideId/cash-confirm', requireRole('DRIVER'), validate(schemas.cashConfirmSchema), controller.cashConfirm);
router.get('/:rideId', controller.getByRideId);
router.post('/:rideId/refund', requireRole('ADMIN'), validate(schemas.refundSchema), controller.refund);

module.exports = router;
