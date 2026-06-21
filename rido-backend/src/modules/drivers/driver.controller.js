const driverService = require('./driver.service');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const { getUploadedFileUrl } = require('../../middleware/upload.middleware');
const prisma = require('../../utils/prisma');

async function register(req, res, next) {
  try {
    const { driver, created } = await driverService.registerDriver(req.user.id, req.body);
    sendSuccess(res, driver, created ? 'Driver registered' : 'Driver already registered', created ? 201 : 200);
  } catch (err) {
    next(err);
  }
}

async function uploadDocument(req, res, next) {
  try {
    const driver = await prisma.driver.findUnique({ where: { user_id: req.user.id } });
    const fileUrl = getUploadedFileUrl(req, req.file);
    if (!fileUrl) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded' } });
    }
    const doc = await driverService.uploadDocument(driver.id, req.body.document_type, fileUrl);
    sendSuccess(res, doc, 'Document uploaded', 201);
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const driver = await driverService.getDriverByUserId(req.user.id);
    sendSuccess(res, driver);
  } catch (err) {
    next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const driver = await driverService.updateDriver(req.user.id, req.body);
    sendSuccess(res, driver, 'Profile updated');
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const result = await driverService.updateStatus(req.user.id, req.body);
    sendSuccess(res, result, 'Status updated');
  } catch (err) {
    next(err);
  }
}

async function getEarnings(req, res, next) {
  try {
    const earnings = await driverService.getEarnings(req.user.id, req.query.period);
    sendSuccess(res, earnings);
  } catch (err) {
    next(err);
  }
}

async function getRides(req, res, next) {
  try {
    const { items, meta } = await driverService.getDriverRides(req.user.id, req.query);
    sendPaginated(res, items, meta);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, uploadDocument, getMe, updateMe, updateStatus, getEarnings, getRides };
