const { Router } = require('express');
const controller = require('./zone.controller');

const router = Router();

router.get('/', controller.list);
router.post('/', controller.create);
router.patch('/:id/surge', controller.updateSurge);

module.exports = router;
