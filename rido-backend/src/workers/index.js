const { createPoolWorker } = require('./pool.worker');
const { createRideWorker, createRideTimeoutWorker } = require('./ride.worker');
const { createNotificationWorker } = require('./notification.worker');
const { createPaymentWorker } = require('./payment.worker');
const { createSurgeWorker, scheduleSurgeRecomputation, getSurgeQueue } = require('../modules/surge/surge.worker');
const logger = require('../utils/logger');

let workers = [];

function startWorkers() {
  // Schedule repeatable jobs
  scheduleSurgeRecomputation().catch((err) => {
    logger.error('Failed to schedule repeatable surge job', { error: err.message });
  });

  workers = [
    createPoolWorker(),
    createRideWorker(),
    createRideTimeoutWorker(),
    createNotificationWorker(),
    createPaymentWorker(),
    createSurgeWorker(),
  ];

  for (const worker of workers) {
    worker.on('failed', (job, err) => {
      logger.error('Worker job failed', {
        queue: job?.queueName,
        jobId: job?.id,
        error: err.message,
      });
    });
  }

  logger.info('BullMQ workers started', { count: workers.length });
  return workers;
}

async function stopWorkers() {
  await Promise.all([
    ...workers.map((w) => w.close()),
    getSurgeQueue().close(),
  ]);
  workers = [];
  logger.info('BullMQ workers stopped');
}

module.exports = { startWorkers, stopWorkers };
