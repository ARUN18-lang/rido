const { Worker } = require('bullmq');
const config = require('../config');
const { getRedis } = require('../config/redis');
const logger = require('../utils/logger');
const { findPoolMatch, convertToSolo } = require('../modules/pooling/pool.service');
const prisma = require('../utils/prisma');

function createPoolWorker() {
  return new Worker(
    config.queueNames.poolMatch,
    async (job) => {
      const start = Date.now();
      const { rideId } = job.data;

      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        include: { pool: true },
      });

      if (!ride || ride.status !== 'POOL_MATCHING') {
        return { skipped: true };
      }

      const windowElapsed = Date.now() - ride.created_at.getTime();
      if (windowElapsed >= config.poolMatchWindowSeconds * 1000) {
        return convertToSolo(ride);
      }

      const result = await findPoolMatch(rideId);
      logger.info('Pool match job completed', {
        queue: config.queueNames.poolMatch,
        jobId: job.id,
        rideId,
        duration: Date.now() - start,
        result,
      });
      return result;
    },
    { connection: getRedis(), concurrency: 5 }
  );
}

module.exports = { createPoolWorker };
