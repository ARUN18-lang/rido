const crypto = require('crypto');
const prisma = require('../../utils/prisma');
const config = require('../../config');
const { getRedis } = require('../../config/redis');
const { getRazorpay } = require('../../config/razorpay');
const { NotFoundError, ForbiddenError, AppError } = require('../../utils/errors');
const { dispatchPaymentRetry } = require('../../queues');

async function getIdempotencyResult(key) {
  if (!key) return null;
  const redis = getRedis();
  const cached = await redis.get(config.redisKeys.idempotency(key));
  return cached ? JSON.parse(cached) : null;
}

async function setIdempotencyResult(key, result) {
  if (!key) return;
  const redis = getRedis();
  await redis.set(config.redisKeys.idempotency(key), JSON.stringify(result), 'EX', 86400);
}

async function initiatePayment(userId, { ride_id, method }, idempotencyKey) {
  const cached = await getIdempotencyResult(idempotencyKey);
  if (cached) return cached;

  const ride = await prisma.ride.findUnique({
    where: { id: ride_id },
    include: { pool_fare_allocation: true, payment: true },
  });
  if (!ride) throw new NotFoundError('Ride not found');
  if (ride.rider_id !== userId) throw new ForbiddenError('Access denied');
  if (ride.status !== 'COMPLETED') {
    throw new AppError('RIDE_NOT_COMPLETED', 'Ride must be completed before payment', 400);
  }
  if (ride.payment?.status === 'SUCCESS') {
    throw new AppError('ALREADY_PAID', 'Ride already paid', 409);
  }

  const amount = ride.pool_fare_allocation
    ? Number(ride.pool_fare_allocation.allocated_fare)
    : Number(ride.final_fare || ride.estimated_fare);

  if (method === 'WALLET') {
    const result = await deductWallet(userId, ride_id, amount);
    await setIdempotencyResult(idempotencyKey, result);
    return result;
  }

  if (method === 'CASH') {
    const payment = await prisma.payment.upsert({
      where: { ride_id },
      create: {
        ride_id,
        user_id: userId,
        amount,
        method: 'CASH',
        status: 'PENDING',
        idempotency_key: idempotencyKey,
      },
      update: { method: 'CASH' },
    });
    const result = { payment_id: payment.id, method: 'CASH', amount, status: 'PENDING' };
    await setIdempotencyResult(idempotencyKey, result);
    return result;
  }

  const razorpay = getRazorpay();
  if (!razorpay) {
    throw new AppError('PAYMENT_UNAVAILABLE', 'Payment gateway not configured', 503);
  }

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt: `ride_${ride_id}`,
  });

  const payment = await prisma.payment.upsert({
    where: { ride_id },
    create: {
      ride_id,
      user_id: userId,
      amount,
      method,
      status: 'PENDING',
      razorpay_order_id: order.id,
      idempotency_key: idempotencyKey,
    },
    update: {
      razorpay_order_id: order.id,
      method,
      amount,
    },
  });

  const result = {
    payment_id: payment.id,
    razorpay_order_id: order.id,
    amount,
    currency: 'INR',
    key_id: config.razorpay.keyId,
  };
  await setIdempotencyResult(idempotencyKey, result);
  return result;
}

async function deductWallet(userId, rideId, amount) {
  return prisma.$transaction(async (tx) => {
    const users = await tx.$queryRaw`
      SELECT id, wallet_balance FROM users WHERE id = ${userId}::uuid FOR UPDATE
    `;
    const user = users[0];
    if (!user || Number(user.wallet_balance) < amount) {
      throw new AppError('INSUFFICIENT_BALANCE', 'Insufficient wallet balance', 400);
    }

    await tx.user.update({
      where: { id: userId },
      data: { wallet_balance: { decrement: amount } },
    });

    const payment = await tx.payment.upsert({
      where: { ride_id: rideId },
      create: {
        ride_id: rideId,
        user_id: userId,
        amount,
        method: 'WALLET',
        status: 'SUCCESS',
      },
      update: { status: 'SUCCESS', method: 'WALLET' },
    });

    return { payment_id: payment.id, method: 'WALLET', amount, status: 'SUCCESS' };
  });
}

function verifyRazorpaySignature(orderId, paymentId, signature) {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(body)
    .digest('hex');
  return expected === signature;
}

async function verifyPayment(userId, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    throw new AppError('INVALID_SIGNATURE', 'Payment signature verification failed', 400);
  }

  const existing = await prisma.payment.findUnique({
    where: { razorpay_payment_id },
  });
  if (existing?.status === 'SUCCESS') {
    return { payment_id: existing.id, status: 'SUCCESS', already_processed: true };
  }

  const payment = await prisma.payment.findFirst({
    where: { razorpay_order_id, user_id: userId },
  });
  if (!payment) throw new NotFoundError('Payment not found');

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'SUCCESS',
      razorpay_payment_id,
      razorpay_signature,
    },
  });

  if (payment.ride_id) {
    const ride = await prisma.ride.findUnique({
      where: { id: payment.ride_id },
      include: { pool_fare_allocation: true },
    });
    if (ride?.pool_fare_allocation) {
      await prisma.poolFareAllocation.update({
        where: { ride_id: ride.id },
        data: { is_paid: true },
      });
    }
    await recordDriverEarning(payment.ride_id);
  }

  return { payment_id: updated.id, status: 'SUCCESS' };
}

async function handleWebhook(rawBody, signature) {
  const expected = crypto
    .createHmac('sha256', config.razorpay.webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (expected !== signature) {
    throw new AppError('INVALID_WEBHOOK', 'Invalid webhook signature', 400);
  }

  const event = JSON.parse(rawBody);
  if (event.event === 'payment.captured') {
    const paymentEntity = event.payload.payment.entity;
    const existing = await prisma.payment.findUnique({
      where: { razorpay_payment_id: paymentEntity.id },
    });
    if (existing?.status === 'SUCCESS') {
      return { processed: true, idempotent: true };
    }

    const payment = await prisma.payment.findFirst({
      where: { razorpay_order_id: paymentEntity.order_id },
    });
    if (!payment) return { processed: false, reason: 'payment_not_found' };

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESS',
        razorpay_payment_id: paymentEntity.id,
      },
    });

    await recordDriverEarning(payment.ride_id);
    return { processed: true };
  }

  return { processed: false, event: event.event };
}

async function confirmCash(driverUserId, rideId) {
  const driver = await prisma.driver.findUnique({ where: { user_id: driverUserId } });
  if (!driver) throw new NotFoundError('Driver not found');

  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride || ride.driver_id !== driver.id) throw new ForbiddenError('Access denied');

  const payment = await prisma.payment.update({
    where: { ride_id: rideId },
    data: {
      status: 'SUCCESS',
      cash_collected_by_driver: true,
    },
  });

  await recordDriverEarning(rideId);
  return payment;
}

async function getPayment(rideId, userId) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) throw new NotFoundError('Ride not found');
  if (ride.rider_id !== userId) throw new ForbiddenError('Access denied');

  const payment = await prisma.payment.findUnique({ where: { ride_id: rideId } });
  if (!payment) throw new NotFoundError('Payment not found');
  return payment;
}

async function refundPayment(rideId, { amount, reason }) {
  const payment = await prisma.payment.findUnique({ where: { ride_id: rideId } });
  if (!payment) throw new NotFoundError('Payment not found');
  if (payment.status !== 'SUCCESS') {
    throw new AppError('NOT_REFUNDABLE', 'Only successful payments can be refunded', 400);
  }

  const refundAmount = amount || Number(payment.amount);
  const razorpay = getRazorpay();

  if (payment.razorpay_payment_id && razorpay) {
    const refund = await razorpay.payments.refund(payment.razorpay_payment_id, {
      amount: Math.round(refundAmount * 100),
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'REFUNDED',
        refund_id: refund.id,
        refund_amount: refundAmount,
      },
    });
  } else if (payment.method === 'WALLET') {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: payment.user_id },
        data: { wallet_balance: { increment: refundAmount } },
      }),
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED', refund_amount: refundAmount },
      }),
    ]);
  }

  return { refunded: true, amount: refundAmount, reason };
}

async function recordDriverEarning(rideId) {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: {
      pool: { include: { allocations: true } },
      payment: true,
    },
  });
  if (!ride?.driver_id || !ride.payment) return;

  let grossAmount = Number(ride.payment.amount);
  if (ride.pool?.allocations?.length) {
    grossAmount = ride.pool.allocations.reduce((sum, a) => sum + Number(a.allocated_fare), 0);
  }

  const commissionRate = config.platformCommissionPercent / 100;
  const commissionAmount = grossAmount * commissionRate;
  const fareConfig = await prisma.vehicleFareConfig.findFirst({
    where: { vehicle_type: ride.pool?.vehicle_type || 'AUTO' },
  });
  const bonusRate = fareConfig ? Number(fareConfig.driver_shared_bonus_percent) / 100 : 0;
  const bonusAmount = ride.mode === 'SHARED' ? grossAmount * bonusRate : 0;
  const netAmount = grossAmount - commissionAmount + bonusAmount;

  await prisma.driverEarning.create({
    data: {
      driver_id: ride.driver_id,
      ride_id: rideId,
      user_id: ride.rider_id,
      gross_amount: grossAmount,
      commission_amount: commissionAmount,
      bonus_amount: bonusAmount,
      net_amount: netAmount,
    },
  });

  await prisma.driver.update({
    where: { id: ride.driver_id },
    data: {
      total_earnings: { increment: netAmount },
      total_trips: { increment: 1 },
    },
  });
}

async function retryFailedPayment(paymentId) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== 'PENDING') return { retried: false };

  if (payment.method === 'WALLET') {
    try {
      await deductWallet(payment.user_id, payment.ride_id, Number(payment.amount));
      return { retried: true, success: true };
    } catch {
      return { retried: true, success: false };
    }
  }

  await dispatchPaymentRetry(paymentId);
  return { retried: true };
}

module.exports = {
  initiatePayment,
  verifyPayment,
  handleWebhook,
  confirmCash,
  getPayment,
  refundPayment,
  recordDriverEarning,
  retryFailedPayment,
};
