const prisma = require('../../utils/prisma');
const config = require('../../config');
const { getRedis } = require('../../config/redis');
const { getDirections } = require('../../config/maps');
const {
  computeSoloFare,
  getSurgeMultiplier,
  getFareConfig,
  VEHICLE_CAPACITY,
} = require('../../utils/fare.calculator');
const { NotFoundError, ForbiddenError, AppError } = require('../../utils/errors');
const { CANCELLABLE_BY_RIDER } = require('../../constants/ride.constants');
const {
  dispatchPoolMatch,
  dispatchFindDriver,
  dispatchRideTimeout,
  dispatchNotification,
} = require('../../queues');
const crypto = require('crypto');

async function createRide(userId, data) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');

  if (data.ride_type === 'WOMEN_ONLY' && user.gender !== 'FEMALE') {
    throw new ForbiddenError('Women-only rides are available for female riders only');
  }

  const activeRide = await prisma.ride.findFirst({
    where: {
      rider_id: userId,
      status: { in: ['SEARCHING', 'POOL_MATCHING', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS'] },
    },
  });
  if (activeRide) {
    throw new AppError('ACTIVE_RIDE', 'You already have an active ride', 409);
  }

  const route = await getDirections({
    pickupLat: data.pickup_lat,
    pickupLng: data.pickup_lng,
    dropLat: data.drop_lat,
    dropLng: data.drop_lng,
  });

  const fareConfig = await getFareConfig(data.vehicle_type);
  const surge = await getSurgeMultiplier({ lat: data.pickup_lat, lng: data.pickup_lng });
  const soloFare = computeSoloFare({
    distanceKm: route.distanceKm,
    durationMinutes: route.durationMinutes,
    fareConfig,
    surgeMultiplier: surge.multiplier,
  });

  const status = data.mode === 'SHARED' ? 'POOL_MATCHING' : 'SEARCHING';

  const ride = await prisma.ride.create({
    data: {
      rider_id: userId,
      mode: data.mode,
      type: data.ride_type,
      vehicle_type: data.vehicle_type,
      status,
      pickup_address: data.pickup_address,
      pickup_lat: data.pickup_lat,
      pickup_lng: data.pickup_lng,
      drop_address: data.drop_address,
      drop_lat: data.drop_lat,
      drop_lng: data.drop_lng,
      route_polyline: route.polyline,
      distance_km: route.distanceKm,
      duration_minutes: route.durationMinutes,
      estimated_fare: soloFare.total,
      surge_multiplier: surge.multiplier,
    },
  });

  const rideId = ride.id;
  const createdRide = ride;

  if (data.mode === 'SHARED') {
    const redis = getRedis();
    const poolKey = config.redisKeys.poolWaiting(data.vehicle_type, data.ride_type);
    await redis.hset(poolKey, rideId, JSON.stringify({
      rideId,
      pickup_lat: data.pickup_lat,
      pickup_lng: data.pickup_lng,
      drop_lat: data.drop_lat,
      drop_lng: data.drop_lng,
      route_polyline: route.polyline,
      max_passengers: VEHICLE_CAPACITY[data.vehicle_type],
      created_at: new Date().toISOString(),
      rider_gender: user.gender,
      vehicle_type: data.vehicle_type,
      ride_type: data.ride_type,
    }));

    const windowEnd = new Date(Date.now() + config.poolMatchWindowSeconds * 1000);
    await prisma.ridePool.create({
      data: {
        vehicle_type: data.vehicle_type,
        max_passengers: VEHICLE_CAPACITY[data.vehicle_type],
        current_passenger_count: 1,
        status: 'WAITING',
        pool_window_start: new Date(),
        pool_window_end: windowEnd,
        rides: { connect: { id: rideId } },
      },
    });

    await dispatchPoolMatch(rideId, 0);
    await dispatchPoolMatch(rideId, 30000);
  } else {
    await dispatchFindDriver(rideId);
  }

  await dispatchRideTimeout(rideId, config.rideSearchTimeoutMinutes);

  return createdRide;
}

async function getRide(userId, rideId) {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: {
      driver: { include: { user: { select: { name: true, phone: true } }, vehicles: true } },
      vehicle: true,
      pool: true,
      pool_fare_allocation: true,
    },
  });
  if (!ride) throw new NotFoundError('Ride not found');
  if (ride.rider_id !== userId && ride.driver?.user_id !== userId) {
    throw new ForbiddenError('Access denied');
  }
  return ride;
}

async function cancelRide(userId, rideId, { reason }, cancelledBy = 'RIDER') {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: { pool: true },
  });
  if (!ride) throw new NotFoundError('Ride not found');
  if (ride.rider_id !== userId && cancelledBy === 'RIDER') {
    throw new ForbiddenError('Access denied');
  }
  if (!CANCELLABLE_BY_RIDER.includes(ride.status) && cancelledBy === 'RIDER') {
    throw new AppError('CANNOT_CANCEL', 'Ride cannot be cancelled at this stage', 400);
  }

  let cancellationFee = 0;
  if (
    cancelledBy === 'RIDER' &&
    ride.status === 'DRIVER_ASSIGNED' &&
    ride.driver_assigned_at
  ) {
    const minutesSinceAssign = (Date.now() - ride.driver_assigned_at.getTime()) / 60000;
    if (minutesSinceAssign > config.rideCancelFreeWindowMinutes) {
      const fareConfig = await getFareConfig(ride.vehicle_type || ride.pool?.vehicle_type || 'AUTO');
      cancellationFee = Number(fareConfig?.cancellation_fee || 0);
    }
  }

  await prisma.ride.update({
    where: { id: rideId },
    data: {
      status: 'CANCELLED',
      cancellation_reason: reason,
      cancelled_by: cancelledBy,
      final_fare: cancellationFee > 0 ? cancellationFee : null,
    },
  });

  if (ride.pool_id) {
    const { handlePoolRiderCancel } = require('../pooling/pool.service');
    await handlePoolRiderCancel(rideId, ride.pool_id);
  }

  if (ride.driver_id) {
    const redis = getRedis();
    const driver = await prisma.driver.findUnique({ where: { id: ride.driver_id } });
    if (driver) {
      await redis.geoadd(config.redisKeys.driversOnline, Number(driver.current_lng), Number(driver.current_lat), driver.id);
      await prisma.driver.update({ where: { id: driver.id }, data: { status: 'ONLINE' } });
    }
  }

  return { cancelled: true, cancellation_fee: cancellationFee };
}

async function getDriverLocation(rideId, userId) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) throw new NotFoundError('Ride not found');
  if (ride.rider_id !== userId) throw new ForbiddenError('Access denied');
  if (!ride.driver_id) throw new NotFoundError('No driver assigned');

  const redis = getRedis();
  const locationJson = await redis.get(config.redisKeys.location(ride.driver_id));
  if (!locationJson) {
    const driver = await prisma.driver.findUnique({ where: { id: ride.driver_id } });
    return {
      lat: driver?.current_lat ? Number(driver.current_lat) : null,
      lng: driver?.current_lng ? Number(driver.current_lng) : null,
      heading: driver?.current_heading ? Number(driver.current_heading) : null,
      timestamp: driver?.last_location_updated_at,
    };
  }
  return JSON.parse(locationJson);
}

function generateRiderOtp() {
  return String(crypto.randomInt(1000, 9999));
}

module.exports = { createRide, getRide, cancelRide, getDriverLocation, generateRiderOtp };
