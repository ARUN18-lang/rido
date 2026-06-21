const { Router } = require('express');
const controller = require('./vehicle.controller');
const { verifyAccessToken } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');
const { validate } = require('../../middleware/validate.middleware');
const schemas = require('./vehicle.schema');

const router = Router();

router.use(verifyAccessToken, requireRole('DRIVER'));

router.post('/', validate(schemas.createVehicleSchema), controller.create);
router.get('/', controller.list);
router.patch('/:id', validate(schemas.updateVehicleSchema), controller.update);
router.delete('/:id', controller.remove);
router.patch('/:id/activate', controller.activate);

module.exports = router;
