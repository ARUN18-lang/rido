const rideService = require('./ride.service');
const { sendSuccess } = require('../../utils/response');

async function create(req, res, next) {
  try {
    const ride = await rideService.createRide(req.user.id, req.body);
    sendSuccess(res, ride, 'Ride created', 201);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const ride = await rideService.getRide(req.user.id, req.params.id);
    sendSuccess(res, ride);
  } catch (err) {
    next(err);
  }
}

async function cancel(req, res, next) {
  try {
    const result = await rideService.cancelRide(req.user.id, req.params.id, req.body);
    sendSuccess(res, result, 'Ride cancelled');
  } catch (err) {
    next(err);
  }
}

async function getDriverLocation(req, res, next) {
  try {
    const location = await rideService.getDriverLocation(req.params.id, req.user.id);
    sendSuccess(res, location);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, getById, cancel, getDriverLocation };
