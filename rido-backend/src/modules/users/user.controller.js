const userService = require('./user.service');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const { getUploadedFileUrl } = require('../../middleware/upload.middleware');

async function getMe(req, res, next) {
  try {
    const user = await userService.getMe(req.user.id);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const user = await userService.updateMe(req.user.id, req.body);
    sendSuccess(res, user, 'Profile updated');
  } catch (err) {
    next(err);
  }
}

async function uploadPhoto(req, res, next) {
  try {
    const fileUrl = getUploadedFileUrl(req, req.file);
    if (!fileUrl) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded' } });
    }
    const result = await userService.updateProfilePhoto(req.user.id, fileUrl);
    sendSuccess(res, result, 'Photo uploaded');
  } catch (err) {
    next(err);
  }
}

async function getRides(req, res, next) {
  try {
    const { items, meta } = await userService.getRideHistory(req.user.id, req.query);
    sendPaginated(res, items, meta);
  } catch (err) {
    next(err);
  }
}

async function getWallet(req, res, next) {
  try {
    const wallet = await userService.getWallet(req.user.id);
    sendSuccess(res, wallet);
  } catch (err) {
    next(err);
  }
}

async function addEmergencyContact(req, res, next) {
  try {
    const contact = await userService.addEmergencyContact(req.user.id, req.body);
    sendSuccess(res, contact, 'Emergency contact added', 201);
  } catch (err) {
    next(err);
  }
}

async function getEmergencyContacts(req, res, next) {
  try {
    const contacts = await userService.getEmergencyContacts(req.user.id);
    sendSuccess(res, contacts);
  } catch (err) {
    next(err);
  }
}

async function deleteEmergencyContact(req, res, next) {
  try {
    const result = await userService.deleteEmergencyContact(req.user.id, req.params.id);
    sendSuccess(res, result, 'Contact deleted');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMe,
  updateMe,
  uploadPhoto,
  getRides,
  getWallet,
  addEmergencyContact,
  getEmergencyContacts,
  deleteEmergencyContact,
};
