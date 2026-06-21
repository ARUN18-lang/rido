const prisma = require('../../utils/prisma');
const config = require('../../config');
const { getRedis } = require('../../config/redis');
const { NotFoundError, ForbiddenError, AppError } = require('../../utils/errors');
const { REQUIRED_DRIVER_DOCUMENTS } = require('../../constants/ride.constants');
const { maskPhone } = require('../../utils/response');

async function registerDriver(userId, data = {}) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');

  const existing = await prisma.driver.findUnique({
    where: { user_id: userId },
    include: { user: { select: { id: true, phone: true, name: true } } },
  });
  if (existing) {
    if (user.role !== 'DRIVER') {
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'DRIVER' },
      });
    }
    return { driver: existing, created: false };
  }

  const [driver] = await prisma.$transaction([
    prisma.driver.create({
      data: {
        user_id: userId,
        is_women_ride_enabled: data.is_women_ride_enabled || false,
      },
      include: { user: { select: { id: true, phone: true, name: true } } },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { role: 'DRIVER' },
    }),
  ]);

  return { driver, created: true };
}

async function uploadDocument(driverId, documentType, fileUrl) {
  return prisma.driverDocument.create({
    data: {
      driver_id: driverId,
      document_type: documentType,
      file_url: fileUrl,
    },
  });
}

async function getDriverByUserId(userId) {
  const driver = await prisma.driver.findUnique({
    where: { user_id: userId },
    include: {
      user: { select: { id: true, phone: true, name: true, gender: true, profile_photo_url: true } },
      vehicles: { where: { is_active: true } },
      driver_documents: true,
    },
  });
  if (!driver) throw new NotFoundError('Driver profile not found');
  return {
    ...driver,
    user: { ...driver.user, phone: maskPhone(driver.user.phone) },
  };
}

async function updateDriver(userId, data) {
  const driver = await prisma.driver.findUnique({ where: { user_id: userId } });
  if (!driver) throw new NotFoundError('Driver profile not found');

  if (data.is_women_ride_enabled && !driver.is_female_verified) {
    throw new ForbiddenError('Women ride can only be enabled after female verification');
  }

  return prisma.driver.update({
    where: { user_id: userId },
    data,
  });
}

async function validateCanGoOnline(driver) {
  if (driver.kyc_status !== 'APPROVED') {
    throw new AppError('KYC_PENDING', 'KYC must be approved before going online', 400);
  }
  if (driver.is_suspended) {
    throw new ForbiddenError('Driver account is suspended');
  }

  const activeVehicle = await prisma.vehicle.findFirst({
    where: { driver_id: driver.id, is_active: true },
  });
  if (!activeVehicle) {
    throw new AppError('NO_VEHICLE', 'At least one active vehicle required', 400);
  }

  const docs = await prisma.driverDocument.findMany({ where: { driver_id: driver.id } });
  const uploadedTypes = docs.map((d) => d.document_type);
  const missing = REQUIRED_DRIVER_DOCUMENTS.filter((t) => !uploadedTypes.includes(t));
  if (missing.length) {
    throw new AppError('MISSING_DOCUMENTS', `Missing documents: ${missing.join(', ')}`, 400);
  }

  return activeVehicle;
}

async function updateStatus(userId, { status, lat, lng }) {
  const driver = await prisma.driver.findUnique({ where: { user_id: userId } });
  if (!driver) throw new NotFoundError('Driver profile not found');

  const redis = getRedis();

  if (status === 'ONLINE') {
    if (!lat || !lng) throw new AppError('LOCATION_REQUIRED', 'Location required to go online', 400);
    await validateCanGoOnline(driver);

    await prisma.driver.update({
      where: { id: driver.id },
      data: {
        status: 'ONLINE',
        current_lat: lat,
        current_lng: lng,
        last_location_updated_at: new Date(),
      },
    });

    await redis.geoadd(config.redisKeys.driversOnline, lng, lat, driver.id);
  } else {
    await prisma.driver.update({
      where: { id: driver.id },
      data: { status: 'OFFLINE' },
    });
    await redis.zrem(config.redisKeys.driversOnline, driver.id);
  }

  return { status };
}

async function getEarnings(userId, period = 'daily') {
  const driver = await prisma.driver.findUnique({ where: { user_id: userId } });
  if (!driver) throw new NotFoundError('Driver profile not found');

  const now = new Date();
  let startDate;
  if (period === 'weekly') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === 'monthly') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const earnings = await prisma.driverEarning.findMany({
    where: { driver_id: driver.id, created_at: { gte: startDate } },
    include: { ride: { select: { id: true, completed_at: true } } },
    orderBy: { created_at: 'desc' },
  });

  const total = earnings.reduce((sum, e) => sum + Number(e.net_amount), 0);

  return {
    period,
    total_earnings: Math.round(total * 100) / 100,
    trip_count: earnings.length,
    breakdown: earnings,
  };
}

async function getDriverRides(userId, { cursor, limit }) {
  const driver = await prisma.driver.findUnique({ where: { user_id: userId } });
  if (!driver) throw new NotFoundError('Driver profile not found');

  const where = { driver_id: driver.id };
  if (cursor) {
    const [createdAt, id] = cursor.split('|');
    where.OR = [
      { created_at: { lt: new Date(createdAt) } },
      { created_at: new Date(createdAt), id: { lt: id } },
    ];
  }

  const rides = await prisma.ride.findMany({
    where,
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  });

  const hasMore = rides.length > limit;
  const items = hasMore ? rides.slice(0, limit) : rides;
  const last = items[items.length - 1];

  return {
    items,
    meta: {
      next_cursor: hasMore && last ? `${last.created_at.toISOString()}|${last.id}` : null,
      has_more: hasMore,
      total: await prisma.ride.count({ where: { driver_id: driver.id } }),
    },
  };
}

module.exports = {
  registerDriver,
  uploadDocument,
  getDriverByUserId,
  updateDriver,
  updateStatus,
  getEarnings,
  getDriverRides,
  validateCanGoOnline,
};
