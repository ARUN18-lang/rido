const vehicleService = require('./vehicle.service');
const { sendSuccess } = require('../../utils/response');

async function create(req, res, next) {
  try {
    const vehicle = await vehicleService.createVehicle(req.user.id, req.body);
    sendSuccess(res, vehicle, 'Vehicle registered', 201);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const vehicles = await vehicleService.listVehicles(req.user.id);
    sendSuccess(res, vehicles);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const vehicle = await vehicleService.updateVehicle(req.user.id, req.params.id, req.body);
    sendSuccess(res, vehicle, 'Vehicle updated');
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const vehicle = await vehicleService.deactivateVehicle(req.user.id, req.params.id);
    sendSuccess(res, vehicle, 'Vehicle deactivated');
  } catch (err) {
    next(err);
  }
}

async function activate(req, res, next) {
  try {
    const vehicle = await vehicleService.activateVehicle(req.user.id, req.params.id);
    sendSuccess(res, vehicle, 'Vehicle activated');
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, update, remove, activate };
