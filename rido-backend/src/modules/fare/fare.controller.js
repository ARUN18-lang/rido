const fareService = require('./fare.service');
const { sendSuccess } = require('../../utils/response');

async function estimate(req, res, next) {
  try {
    const result = await fareService.estimateFare(req.body);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = { estimate };
