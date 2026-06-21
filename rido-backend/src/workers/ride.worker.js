const { Worker } = require('bullmq');
const config = require('../config');
const { getRedis } = require('../config/redis');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const { generateRiderOtp } = require('../modules/rides/ride.service');
const { dispatchNotification } = require('../queues');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findAndAssignDriver(rideId, poolId = null, expanded = false) {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: { pool: { include: { rides: true } }, vehicle: true },
  });

  if (!ride || !['SEARCHING', 'POOL_MATCHING'].includes(ride.status)) {
    return { assigned: false, reason: 'invalid_state' };
  }

  const redis = getRedis();
  const radius = expanded ? config.driverSearchRadiusKm * 2 : config.driverSearchRadiusKm;

  const nearby = await redis.georadius(
    config.redisKeys.driversOnline,
    Number(ride.pickup_lng),
    Number(ride.pickup_lat),
    radius,
    'km',
    'ASC',
    'COUNT',
    10
  );

  const vehicleType = ride.pool?.vehicle_type || ride.vehicle_type || 'AUTO';

  for (const driverId of nearby) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: { select: { name: true, phone: true } },
        vehicles: { where: { is_active: true, type: vehicleType } },
      },
    });

    if (!driver) continue;
    if (driver.status === 'ON_RIDE') continue;
    if (Number(driver.rating) < 3.5) continue;
    if (ride.type === 'WOMEN_ONLY' && !driver.is_women_ride_enabled) continue;
    if (!driver.vehicles.length) continue;

    const vehicle = driver.vehicles[0];

    await dispatchNotification({
      userId: driver.user_id,
      push: {
        title: 'New Ride Request',
        body: `Pickup: ${ride.pickup_address}`,
        data: { ride_id: rideId, type: 'driver_request' },
      },
    });

    await redis.set(
      config.redisKeys.offer(rideId, driverId),
      JSON.stringify({ rideId, driverId, fare: ride.estimated_fare }),
      'EX',
      config.driverAcceptTimeoutSeconds
    );

    const deadline = Date.now() + config.driverAcceptTimeoutSeconds * 1000;
    while (Date.now() < deadline) {
      const accepted = await redis.get(config.redisKeys.driverAccept(rideId, driverId));
      const declined = await redis.get(config.redisKeys.driverDecline(rideId, driverId));

      if (declined) break;
      if (accepted) {
        const otp = generateRiderOtp();
        await prisma.$transaction([
          prisma.ride.update({
            where: { id: rideId },
            data: {
              status: 'DRIVER_ASSIGNED',
              driver_id: driverId,
              vehicle_id: vehicle.id,
              rider_otp: otp,
              driver_assigned_at: new Date(),
            },
          }),
          prisma.driver.update({
            where: { id: driverId },
            data: { status: 'ON_RIDE' },
          }),
        ]);

        await redis.zrem(config.redisKeys.driversOnline, driverId);

        if (poolId) {
          await prisma.ridePool.update({
            where: { id: poolId },
            data: { driver_id: driverId, vehicle_id: vehicle.id, status: 'CONFIRMED' },
          });
          const poolRides = await prisma.ride.findMany({ where: { pool_id: poolId } });
          for (const pr of poolRides) {
            await dispatchNotification({
              userId: pr.rider_id,
              push: {
                title: 'Driver Assigned',
                body: `${driver.user.name} is on the way`,
                data: { ride_id: pr.id },
              },
              sms: true,
              templateKey: 'DRIVER_ASSIGNED',
              params: {
                driverName: driver.user.name,
                vehicleNumber: vehicle.registration_number,
                otp,
              },
            });
          }
        } else {
          await dispatchNotification({
            userId: ride.rider_id,
            push: {
              title: 'Driver Assigned',
              body: `${driver.user.name} is on the way`,
              data: { ride_id: rideId },
            },
            sms: true,
            templateKey: 'DRIVER_ASSIGNED',
            params: {
              driverName: driver.user.name,
              vehicleNumber: vehicle.registration_number,
              otp,
            },
          });
        }

        return { assigned: true, driver_id: driverId };
      }
      await sleep(1000);
    }
  }

  if (!expanded) {
    return findAndAssignDriver(rideId, poolId, true);
  }

  await prisma.ride.update({
    where: { id: rideId },
    data: { status: 'FAILED' },
  });

  await dispatchNotification({
    userId: ride.rider_id,
    push: {
      title: 'No Drivers',
      body: 'No drivers available. Please try again.',
      data: { ride_id: rideId },
    },
  });

  return { assigned: false, reason: 'no_drivers' };
}

function createRideWorker() {
  return new Worker(
    config.queueNames.findDriver,
    async (job) => {
      const start = Date.now();
      const { rideId, poolId, expanded } = job.data;
      const result = await findAndAssignDriver(rideId, poolId, expanded);
      logger.info('Find driver job completed', {
        queue: config.queueNames.findDriver,
        jobId: job.id,
        duration: Date.now() - start,
        result,
      });
      return result;
    },
    { connection: getRedis(), concurrency: 3 }
  );

}

function createRideTimeoutWorker() {
  return new Worker(
    config.queueNames.rideTimeout,
    async (job) => {
      const { rideId } = job.data;
      const ride = await prisma.ride.findUnique({ where: { id: rideId } });
      if (ride && ['SEARCHING', 'POOL_MATCHING'].includes(ride.status)) {
        await prisma.ride.update({
          where: { id: rideId },
          data: { status: 'CANCELLED', cancellation_reason: 'No driver found within timeout' },
        });
      }
      return { timed_out: true };
    },
    { connection: getRedis() }
  );
}

module.exports = { createRideWorker, createRideTimeoutWorker, findAndAssignDriver };
