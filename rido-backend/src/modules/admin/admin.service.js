const prisma = require('../../utils/prisma');
const { NotFoundError, AppError } = require('../../utils/errors');

async function listDrivers({ kyc_status, cursor, limit = 20 }) {
  const where = {};
  if (kyc_status) where.kyc_status = kyc_status;

  const drivers = await prisma.driver.findMany({
    where,
    include: { user: { select: { id: true, phone: true, name: true } }, vehicles: true },
    orderBy: { created_at: 'desc' },
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasMore = drivers.length > limit;
  const items = hasMore ? drivers.slice(0, limit) : drivers;

  return {
    items,
    meta: {
      next_cursor: hasMore ? items[items.length - 1]?.id : null,
      has_more: hasMore,
      total: await prisma.driver.count({ where }),
    },
  };
}

async function updateKyc(driverId, { status, reason }) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) throw new NotFoundError('Driver not found');

  if (status === 'REJECTED') {
    await prisma.driverDocument.updateMany({
      where: { driver_id: driverId },
      data: { verified: false, rejected_reason: reason },
    });
  } else if (status === 'APPROVED') {
    await prisma.driverDocument.updateMany({
      where: { driver_id: driverId },
      data: { verified: true, rejected_reason: null },
    });
  }

  return prisma.driver.update({
    where: { id: driverId },
    data: { kyc_status: status },
  });
}

async function verifyWomenDriver(driverId) {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: { user: true },
  });
  if (!driver) throw new NotFoundError('Driver not found');
  if (driver.user.gender !== 'FEMALE') {
    throw new AppError('NOT_FEMALE', 'Driver must be female for women ride verification', 400);
  }

  return prisma.driver.update({
    where: { id: driverId },
    data: { is_female_verified: true, is_women_ride_enabled: true },
  });
}

async function listRides({ status, date, district, cursor, limit = 20 }) {
  const where = {};
  if (status) where.status = status;
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    where.created_at = { gte: start, lt: end };
  }

  const rides = await prisma.ride.findMany({
    where,
    include: {
      rider: { select: { name: true, phone: true } },
      driver: { include: { user: { select: { name: true } } } },
    },
    orderBy: { created_at: 'desc' },
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasMore = rides.length > limit;
  const items = hasMore ? rides.slice(0, limit) : rides;

  return {
    items,
    meta: {
      next_cursor: hasMore ? items[items.length - 1]?.id : null,
      has_more: hasMore,
      total: await prisma.ride.count({ where }),
    },
  };
}

async function cancelRide(rideId, reason, adminId) {
  const { cancelRide } = require('../rides/ride.service');
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) throw new NotFoundError('Ride not found');

  await prisma.auditLog.create({
    data: {
      actor_id: adminId,
      action: 'ADMIN_CANCEL_RIDE',
      entity_type: 'Ride',
      entity_id: rideId,
      metadata: { reason },
    },
  });

  return cancelRide(ride.rider_id, rideId, { reason }, 'ADMIN');
}

async function getAnalytics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalRides, completedRides, revenue, poolRides] = await Promise.all([
    prisma.ride.count({ where: { created_at: { gte: today } } }),
    prisma.ride.count({ where: { status: 'COMPLETED', completed_at: { gte: today } } }),
    prisma.payment.aggregate({
      where: { status: 'SUCCESS', created_at: { gte: today } },
      _sum: { amount: true },
      _avg: { amount: true },
    }),
    prisma.ride.count({ where: { mode: 'SHARED', created_at: { gte: today } } }),
  ]);

  const poolMatchRate = totalRides > 0 ? (poolRides / totalRides) * 100 : 0;

  return {
    date: today.toISOString().split('T')[0],
    total_rides: totalRides,
    completed_rides: completedRides,
    revenue: Number(revenue._sum.amount || 0),
    avg_fare: Math.round(Number(revenue._avg.amount || 0) * 100) / 100,
    pool_match_rate: Math.round(poolMatchRate * 100) / 100,
  };
}

async function listDisputes({ cursor, limit = 20 }) {
  const disputes = await prisma.dispute.findMany({
    include: { ride: true, user: { select: { name: true, phone: true } } },
    orderBy: { created_at: 'desc' },
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasMore = disputes.length > limit;
  const items = hasMore ? disputes.slice(0, limit) : disputes;

  return {
    items,
    meta: {
      next_cursor: hasMore ? items[items.length - 1]?.id : null,
      has_more: hasMore,
      total: await prisma.dispute.count(),
    },
  };
}

async function suspendDriver(driverId, adminId) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) throw new NotFoundError('Driver not found');

  await prisma.$transaction([
    prisma.driver.update({
      where: { id: driverId },
      data: { is_suspended: true, status: 'OFFLINE' },
    }),
    prisma.user.update({
      where: { id: driver.user_id },
      data: { is_active: false },
    }),
    prisma.auditLog.create({
      data: {
        actor_id: adminId,
        action: 'SUSPEND_DRIVER',
        entity_type: 'Driver',
        entity_id: driverId,
      },
    }),
  ]);

  return { suspended: true };
}

module.exports = {
  listDrivers,
  updateKyc,
  verifyWomenDriver,
  listRides,
  cancelRide,
  getAnalytics,
  listDisputes,
  suspendDriver,
};
