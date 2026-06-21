const { Router } = require('express');
const controller = require('./ride.controller');
const { verifyAccessToken } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const schemas = require('./ride.schema');

const router = Router();

router.use(verifyAccessToken);

router.post('/', validate(schemas.createRideSchema), controller.create);
router.get('/:id', controller.getById);
router.post('/:id/cancel', validate(schemas.cancelRideSchema), controller.cancel);
router.get('/:id/driver-location', controller.getDriverLocation);

module.exports = router;
