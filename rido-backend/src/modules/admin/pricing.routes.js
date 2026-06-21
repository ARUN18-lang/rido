const { Router } = require('express');
const controller = require('./pricing.controller');
const { validate } = require('../../middleware/validate.middleware');
const schemas = require('./pricing.schema');
const { verifyAccessToken } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');

const router = Router();

// Public testing endpoint (allows both GET and POST)
router.all('/simulate', controller.simulateFare);

// Secure configuration/debug endpoints (ADMIN required)
router.use(verifyAccessToken, requireRole('ADMIN'));

router.get('/surge/:zoneId', controller.getSurgeDebug);
router.get('/surge/:zoneId/history', controller.getSurgeHistory);
router.patch('/vehicle-config/:vehicleType', validate(schemas.updateVehicleConfigSchema), controller.updateVehicleConfig);
router.post('/revenue-multiplier', validate(schemas.revenueMultiplierSchema), controller.createOrUpdateRevenueMultiplier);
router.post('/events', validate(schemas.createEventSchema), controller.createEventBoost);
router.patch('/events/:id', validate(schemas.updateEventSchema), controller.updateEventBoost);

module.exports = router;
