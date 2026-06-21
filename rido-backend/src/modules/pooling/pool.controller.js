const poolService = require('./pool.service');
const { sendSuccess } = require('../../utils/response');

async function getPoolStatus(req, res, next) {
  try {
    const result = await poolService.findPoolMatch(req.params.rideId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = { getPoolStatus };
