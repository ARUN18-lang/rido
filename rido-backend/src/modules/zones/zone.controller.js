const zoneService = require('./zone.service');
const { sendSuccess } = require('../../utils/response');

async function list(req, res, next) {
  try {
    const zones = await zoneService.listZones();
    sendSuccess(res, zones);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const zone = await zoneService.createZone(req.body);
    sendSuccess(res, zone, 'Zone created', 201);
  } catch (err) {
    next(err);
  }
}

async function updateSurge(req, res, next) {
  try {
    const zone = await zoneService.updateSurge(req.params.id, req.body.surge_multiplier);
    sendSuccess(res, zone, 'Surge updated');
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, updateSurge };
