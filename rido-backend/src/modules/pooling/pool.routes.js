const { Router } = require('express');
const controller = require('./pool.controller');
const { verifyAccessToken } = require('../../middleware/auth.middleware');

const router = Router();

router.use(verifyAccessToken);
router.get('/status/:rideId', controller.getPoolStatus);

module.exports = router;
