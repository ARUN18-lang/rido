function sendSuccess(res, data = {}, message = null, statusCode = 200) {
  const body = { success: true, data };
  if (message) body.message = message;
  return res.status(statusCode).json(body);
}

function sendPaginated(res, data, meta, message = null) {
  const body = { success: true, data, meta };
  if (message) body.message = message;
  return res.status(200).json(body);
}

function sendError(res, code, message, statusCode = 400, details = null) {
  const error = { code, message };
  if (details) error.details = details;
  return res.status(statusCode).json({ success: false, error });
}

function maskPhone(phone) {
  if (!phone || phone.length < 4) return phone;
  const last4 = phone.slice(-4);
  return `+91 XXXXX X${last4}`;
}

module.exports = { sendSuccess, sendPaginated, sendError, maskPhone };
