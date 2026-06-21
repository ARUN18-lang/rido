const adminService = require('./admin.service');
const { sendSuccess, sendPaginated } = require('../../utils/response');

async function listDrivers(req, res, next) {
  try {
    const { items, meta } = await adminService.listDrivers(req.query);
    sendPaginated(res, items, meta);
  } catch (err) {
    next(err);
  }
}

async function updateKyc(req, res, next) {
  try {
    const driver = await adminService.updateKyc(req.params.id, req.body);
    sendSuccess(res, driver, 'KYC updated');
  } catch (err) {
    next(err);
  }
}

async function verifyWomen(req, res, next) {
  try {
    const driver = await adminService.verifyWomenDriver(req.params.id);
    sendSuccess(res, driver, 'Women ride verified');
  } catch (err) {
    next(err);
  }
}

async function listRides(req, res, next) {
  try {
    const { items, meta } = await adminService.listRides(req.query);
    sendPaginated(res, items, meta);
  } catch (err) {
    next(err);
  }
}

async function cancelRide(req, res, next) {
  try {
    const result = await adminService.cancelRide(req.params.id, req.body.reason, req.user.id);
    sendSuccess(res, result, 'Ride cancelled');
  } catch (err) {
    next(err);
  }
}

async function analytics(req, res, next) {
  try {
    const stats = await adminService.getAnalytics();
    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
}

async function listDisputes(req, res, next) {
  try {
    const { items, meta } = await adminService.listDisputes(req.query);
    sendPaginated(res, items, meta);
  } catch (err) {
    next(err);
  }
}

async function suspendDriver(req, res, next) {
  try {
    const result = await adminService.suspendDriver(req.params.id, req.user.id);
    sendSuccess(res, result, 'Driver suspended');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listDrivers,
  updateKyc,
  verifyWomen,
  listRides,
  cancelRide,
  analytics,
  listDisputes,
  suspendDriver,
};
