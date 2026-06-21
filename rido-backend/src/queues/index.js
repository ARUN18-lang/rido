const { Queue } = require('bullmq');
const config = require('../config');
const { getRedis } = require('../config/redis');

const connection = { connection: getRedis() };

const poolMatchQueue = new Queue(config.queueNames.poolMatch, connection);
const findDriverQueue = new Queue(config.queueNames.findDriver, connection);
const notificationQueue = new Queue(config.queueNames.notifications, connection);
const paymentRetryQueue = new Queue(config.queueNames.paymentRetry, connection);
const rideTimeoutQueue = new Queue(config.queueNames.rideTimeout, connection);

async function dispatchPoolMatch(rideId, delayMs = 0) {
  return poolMatchQueue.add(
    'pool-match',
    { rideId },
    {
      jobId: `pool-match-${rideId}-${Date.now()}`,
      delay: delayMs,
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );
}

async function dispatchFindDriver(rideId, poolId = null, expanded = false) {
  return findDriverQueue.add(
    'find-driver',
    { rideId, poolId, expanded },
    {
      jobId: `find-driver-${rideId}-${expanded ? 'expanded' : 'normal'}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );
}

async function dispatchNotification(payload) {
  return notificationQueue.add('notify', payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}

async function dispatchPaymentRetry(paymentId) {
  return paymentRetryQueue.add('payment-retry', { paymentId }, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 },
  });
}

async function dispatchRideTimeout(rideId, delayMinutes = 15) {
  return rideTimeoutQueue.add(
    'ride-timeout',
    { rideId },
    {
      jobId: `ride-timeout-${rideId}`,
      delay: delayMinutes * 60 * 1000,
      attempts: 1,
    }
  );
}

async function closeQueues() {
  await Promise.all([
    poolMatchQueue.close(),
    findDriverQueue.close(),
    notificationQueue.close(),
    paymentRetryQueue.close(),
    rideTimeoutQueue.close(),
  ]);
}

module.exports = {
  poolMatchQueue,
  findDriverQueue,
  notificationQueue,
  paymentRetryQueue,
  rideTimeoutQueue,
  dispatchPoolMatch,
  dispatchFindDriver,
  dispatchNotification,
  dispatchPaymentRetry,
  dispatchRideTimeout,
  closeQueues,
};
