const { Router } = require('express');
const controller = require('./admin.controller');
const zoneRoutes = require('../zones/zone.routes');
const { verifyAccessToken } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');

const router = Router();

router.use(verifyAccessToken, requireRole('ADMIN'));

router.get('/drivers', controller.listDrivers);
router.patch('/drivers/:id/kyc', controller.updateKyc);
router.patch('/drivers/:id/women-verify', controller.verifyWomen);
router.post('/drivers/:id/suspend', controller.suspendDriver);
router.get('/rides', controller.listRides);
router.post('/rides/:id/cancel', controller.cancelRide);
router.get('/analytics', controller.analytics);
router.get('/disputes', controller.listDisputes);
router.use('/zones', zoneRoutes);

module.exports = router;
