const { Router } = require('express');
const controller = require('./fare.controller');
const { validate } = require('../../middleware/validate.middleware');
const schemas = require('./fare.schema');

const router = Router();

router.post('/estimate', validate(schemas.estimateSchema), controller.estimate);

module.exports = router;
