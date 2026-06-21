const prisma = require('../../utils/prisma');
const config = require('../../config');
const { getRedis } = require('../../config/redis');
const { nearestPointOnPolylineDistanceMeters, decodePolyline } = require('../../utils/geo');
const { dispatchNotification } = require('../../queues');
const logger = require('../../utils/logger');

async function updateDriverLocation(driverId, { lat, lng, heading }, io) {
  const redis = getRedis();
  const locationData = { lat, lng, heading, timestamp: Date.now() };
  await redis.set(config.redisKeys.location(driverId), JSON.stringify(locationData), 'EX', 30);

  await prisma.driver.update({
    where: { id: driverId },
    data: {
      current_lat: lat,
      current_lng: lng,
      current_heading: heading,
      last_location_updated_at: new Date(),
    },
  });

  const lastDbKey = config.redisKeys.driverLastDbUpdate(driverId);
  const shouldUpdateDb = !(await redis.get(lastDbKey));
  if (shouldUpdateDb) {
    await redis.set(lastDbKey, '1', 'EX', 30);
  }

  const activeRide = await prisma.ride.findFirst({
    where: {
      driver_id: driverId,
      status: { in: ['DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS'] },
    },
  });

  if (activeRide && io) {
    io.to(`ride:${activeRide.id}`).emit('ride:driver_location', locationData);

    if (activeRide.status === 'IN_PROGRESS' && activeRide.route_polyline) {
      await checkRouteDeviation(activeRide, lat, lng, io);
    }

    await checkLocationStale(activeRide, io);
  }

  return locationData;
}

async function checkRouteDeviation(ride, lat, lng, io) {
  const points = decodePolyline(ride.route_polyline);
  const distance = nearestPointOnPolylineDistanceMeters(lat, lng, points);

  if (distance > config.routeDeviationThresholdMeters) {
    const redis = getRedis();
    const devKey = config.redisKeys.routeDeviation(ride.id);
    const firstDeviation = await redis.get(devKey);

    if (!firstDeviation) {
      await redis.set(devKey, Date.now().toString(), 'EX', 300);
      io.to(`ride:${ride.id}`).emit('ride:route_deviation', {
        rideId: ride.id,
        distance_meters: Math.round(distance),
        timestamp: Date.now(),
      });
      await dispatchNotification({
        userId: ride.rider_id,
        push: {
          title: 'Route Deviation',
          body: 'Your ride has deviated from the planned route. Are you safe?',
          data: { type: 'route_deviation', ride_id: ride.id },
        },
        templateKey: 'ROUTE_DEVIATION',
      });
    } else {
      const elapsed = Date.now() - parseInt(firstDeviation, 10);
      if (elapsed > 120000) {
        await dispatchNotification({
          userId: ride.rider_id,
          push: {
            title: 'Safety Check',
            body: 'Your ride is off-route. Tap SOS if you need help.',
            data: { type: 'safety_check', ride_id: ride.id },
          },
        });
      }
    }
  }
}

async function checkLocationStale(ride, io) {
  const redis = getRedis();
  const staleKey = config.redisKeys.locationStale(ride.id);
  const existing = await redis.get(staleKey);
  if (!existing) {
    await redis.set(staleKey, '1', 'EX', 60);
    setTimeout(async () => {
      const location = await redis.get(config.redisKeys.location(ride.driver_id));
      if (!location) {
        await dispatchNotification({
          userId: ride.rider_id,
          push: {
            title: 'Location Update',
            body: 'Driver location has not updated recently.',
            data: { ride_id: ride.id },
          },
        });
      }
    }, 60000);
  }
}

async function handleSos(userId, { ride_id, lat, lng }, io) {
  const ride = await prisma.ride.findUnique({
    where: { id: ride_id },
    include: { rider: true },
  });
  if (!ride || ride.rider_id !== userId) return { error: 'invalid_ride' };

  await prisma.sosAlert.create({
    data: { ride_id, user_id: userId, lat, lng },
  });

  const { sendToEmergencyContacts } = require('../notifications/notification.service');
  await sendToEmergencyContacts(userId, 'SOS_ALERT', {
    riderName: ride.rider.name || 'Rider',
    lat,
    lng,
  });

  if (io) {
    io.emit('admin:sos_alert', { ride_id, lat, lng, user_id: userId, timestamp: Date.now() });
  }

  return { triggered: true };
}

module.exports = { updateDriverLocation, handleSos, checkRouteDeviation };
