const { Worker } = require('bullmq');
const config = require('../config');
const { getRedis } = require('../config/redis');
const { processNotificationJob } = require('../modules/notifications/notification.service');
const logger = require('../utils/logger');

function createNotificationWorker() {
  return new Worker(
    config.queueNames.notifications,
    async (job) => {
      const start = Date.now();
      const result = await processNotificationJob(job.data);
      logger.info('Notification job completed', {
        queue: config.queueNames.notifications,
        jobId: job.id,
        duration: Date.now() - start,
      });
      return result;
    },
    { connection: getRedis(), concurrency: 10 }
  );
}

module.exports = { createNotificationWorker };
