const { Worker, Queue } = require('bullmq');
const { computeSurgeForZone } = require('./surge.service');
const prisma = require('../../utils/prisma');
const logger = require('../../utils/logger');
const { getRedis } = require('../../config/redis');

let surgeQueue = null;

function getSurgeQueue() {
  if (!surgeQueue) {
    surgeQueue = new Queue('rido-surge', { connection: getRedis() });
  }
  return surgeQueue;
}

async function scheduleSurgeRecomputation() {
  const queue = getSurgeQueue();
  const intervalSeconds = parseInt(process.env.SURGE_RECOMPUTE_INTERVAL_SECONDS || '60', 10);
  
  // Remove any existing repeatable jobs to avoid duplicates
  const jobs = await queue.getRepeatableJobs();
  for (const job of jobs) {
    await queue.removeRepeatableByKey(job.key);
  }

  await queue.add(
    'recompute-surge',
    {},
    {
      repeat: {
        every: intervalSeconds * 1000,
      },
      jobId: 'recompute-surge-job',
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );
  logger.info(`Scheduled surge recomputation job every ${intervalSeconds} seconds`);
}

function createSurgeWorker() {
  return new Worker(
    'rido-surge',
    async (job) => {
      const start = Date.now();
      const zones = await prisma.zone.findMany({ where: { is_active: true } });
      
      const results = await Promise.allSettled(
        zones.map((z) => computeSurgeForZone(z.id))
      );

      for (let i = 0; i < zones.length; i++) {
        const zone = zones[i];
        const res = results[i];
        if (res.status === 'rejected') {
          logger.error(`Surge computation rejected for zone ${zone.name} (${zone.id})`, {
            error: res.reason?.message || res.reason,
          });
        }
      }

      logger.info('Surge recomputation job finished', {
        jobId: job.id,
        durationMs: Date.now() - start,
        zonesProcessed: zones.length,
      });

      return { processed: zones.length };
    },
    { connection: getRedis(), concurrency: 1 }
  );
}

module.exports = {
  scheduleSurgeRecomputation,
  createSurgeWorker,
  getSurgeQueue,
};
