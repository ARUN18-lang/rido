const { Router } = require('express');
const controller = require('./driver.controller');
const { verifyAccessToken } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { documentUpload } = require('../../middleware/upload.middleware');
const schemas = require('./driver.schema');

const router = Router();

router.use(verifyAccessToken);

router.post('/register', requireRole('RIDER', 'DRIVER'), validate(schemas.registerDriverSchema), controller.register);
router.post('/documents', requireRole('DRIVER'), documentUpload.single('document'), validate(schemas.documentSchema), controller.uploadDocument);
router.get('/me', requireRole('DRIVER'), controller.getMe);
router.patch('/me', requireRole('DRIVER'), validate(schemas.updateDriverSchema), controller.updateMe);
router.post('/me/status', requireRole('DRIVER'), validate(schemas.driverStatusSchema), controller.updateStatus);
router.get('/me/earnings', requireRole('DRIVER'), validate(schemas.paginationSchema, 'query'), controller.getEarnings);
router.get('/me/rides', requireRole('DRIVER'), validate(schemas.paginationSchema, 'query'), controller.getRides);

module.exports = router;
