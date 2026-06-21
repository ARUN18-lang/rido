const { Router } = require('express');
const controller = require('./user.controller');
const { verifyAccessToken } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { profilePhotoUpload } = require('../../middleware/upload.middleware');
const schemas = require('./user.schema');

const router = Router();

router.use(verifyAccessToken);

router.get('/me', controller.getMe);
router.patch('/me', validate(schemas.updateProfileSchema), controller.updateMe);
router.post('/me/photo', profilePhotoUpload.single('photo'), controller.uploadPhoto);
router.get('/me/rides', validate(schemas.paginationSchema, 'query'), controller.getRides);
router.get('/me/wallet', controller.getWallet);
router.post('/emergency-contacts', validate(schemas.emergencyContactSchema), controller.addEmergencyContact);
router.get('/emergency-contacts', controller.getEmergencyContacts);
router.delete('/emergency-contacts/:id', controller.deleteEmergencyContact);

module.exports = router;
