const { Worker } = require('bullmq');
const config = require('../config');
const { getRedis } = require('../config/redis');
const { retryFailedPayment } = require('../modules/payments/payment.service');
const { dispatchNotification } = require('../queues');
const logger = require('../utils/logger');

function createPaymentWorker() {
  return new Worker(
    config.queueNames.paymentRetry,
    async (job) => {
      const start = Date.now();
      const { paymentId } = job.data;
      const result = await retryFailedPayment(paymentId);

      if (!result.success) {
        const prisma = require('../utils/prisma');
        const payment = await prisma.payment.findUnique({
          where: { id: paymentId },
          include: { user: true },
        });
        if (payment) {
          await dispatchNotification({
            userId: payment.user_id,
            push: {
              title: 'Payment Failed',
              body: `Payment of ₹${payment.amount} failed. Retrying...`,
              data: { payment_id: paymentId },
            },
            templateKey: 'PAYMENT_FAILED',
            params: { amount: payment.amount },
          });
        }
      }

      logger.info('Payment retry job completed', {
        queue: config.queueNames.paymentRetry,
        jobId: job.id,
        duration: Date.now() - start,
        result,
      });
      return result;
    },
    { connection: getRedis(), concurrency: 3 }
  );
}

module.exports = { createPaymentWorker };
