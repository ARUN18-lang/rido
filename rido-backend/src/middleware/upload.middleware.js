const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../utils/errors');

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024;
const LOCAL_UPLOAD_ROOT = path.join(__dirname, '../../uploads');

function getExtension(file) {
  if (file.mimetype === 'application/pdf') return 'pdf';
  if (file.mimetype === 'image/jpeg') return 'jpg';
  return file.mimetype.split('/')[1];
}

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    return cb(new AppError('INVALID_FILE', 'Only JPEG, PNG, HEIC, HEIF, and PDF allowed', 400));
  }
  cb(null, true);
}

function createUpload(folder) {
  const destination = path.join(LOCAL_UPLOAD_ROOT, folder);
  fs.mkdirSync(destination, { recursive: true });

  return multer({
    storage: multer.diskStorage({
      destination,
      filename: (req, file, cb) => {
        cb(null, `${uuidv4()}.${getExtension(file)}`);
      },
    }),
    limits: { fileSize: MAX_SIZE },
    fileFilter,
  });
}

function getUploadedFileUrl(req, file) {
  if (!file) return null;
  if (file.filename && file.destination) {
    const folder = path.basename(file.destination);
    return `${req.protocol}://${req.get('host')}/uploads/${folder}/${file.filename}`;
  }
  return null;
}

const profilePhotoUpload = createUpload('profiles');
const documentUpload = createUpload('documents');

module.exports = { profilePhotoUpload, documentUpload, createUpload, getUploadedFileUrl, LOCAL_UPLOAD_ROOT };
