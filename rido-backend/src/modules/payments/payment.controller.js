const paymentService = require('./payment.service');
const { sendSuccess } = require('../../utils/response');

async function initiate(req, res, next) {
  try {
    const result = await paymentService.initiatePayment(
      req.user.id,
      req.body,
      req.headers['idempotency-key']
    );
    sendSuccess(res, result, 'Payment initiated', 201);
  } catch (err) {
    next(err);
  }
}

async function verify(req, res, next) {
  try {
    const result = await paymentService.verifyPayment(req.user.id, req.body);
    sendSuccess(res, result, 'Payment verified');
  } catch (err) {
    next(err);
  }
}

async function webhook(req, res, next) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
    const result = await paymentService.handleWebhook(rawBody, signature);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

async function cashConfirm(req, res, next) {
  try {
    const result = await paymentService.confirmCash(req.user.id, req.params.rideId);
    sendSuccess(res, result, 'Cash payment confirmed');
  } catch (err) {
    next(err);
  }
}

async function getByRideId(req, res, next) {
  try {
    const result = await paymentService.getPayment(req.params.rideId, req.user.id);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

async function refund(req, res, next) {
  try {
    const result = await paymentService.refundPayment(req.params.rideId, req.body);
    sendSuccess(res, result, 'Refund processed');
  } catch (err) {
    next(err);
  }
}

module.exports = { initiate, verify, webhook, cashConfirm, getByRideId, refund };
