const { verifyAccessToken } = require('../../utils/jwt');
const prisma = require('../../utils/prisma');
const config = require('../../config');
const { getRedis } = require('../../config/redis');
const trackingService = require('./tracking.service');
const { generateRiderOtp } = require('../rides/ride.service');
const { AppError } = require('../../utils/errors');
const { maskPhone } = require('../../utils/response');
const { dispatchNotification } = require('../../queues');
const logger = require('../../utils/logger');

function setupTrackingSockets(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = verifyAccessToken(token);
      const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!user) return next(new Error('User not found'));
      socket.user = { id: user.id, role: user.role, phone: user.phone };
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug('Socket connected', { userId: socket.user.id });

    if (socket.user.role === 'DRIVER') {
      prisma.driver.findUnique({ where: { user_id: socket.user.id } }).then((driver) => {
        if (driver) socket.join(`driver:${driver.id}`);
      });
    }

    socket.on('join_ride', async ({ ride_id }) => {
      const ride = await prisma.ride.findUnique({ where: { id: ride_id } });
      if (!ride) return;
      const driver = ride.driver_id
        ? await prisma.driver.findUnique({ where: { id: ride.driver_id } })
        : null;
      if (
        ride.rider_id === socket.user.id ||
        (driver && driver.user_id === socket.user.id)
      ) {
        socket.join(`ride:${ride_id}`);
      }
    });

    socket.on('driver:location_update', async (data) => {
      const driver = await prisma.driver.findUnique({ where: { user_id: socket.user.id } });
      if (!driver || driver.status !== 'ON_RIDE') return;
      await trackingService.updateDriverLocation(driver.id, data, io);
    });

    socket.on('driver:accept', async ({ ride_id }) => {
      const driver = await prisma.driver.findUnique({ where: { user_id: socket.user.id } });
      if (!driver) return;
      const redis = getRedis();
      await redis.set(config.redisKeys.driverAccept(ride_id, driver.id), '1', 'EX', 30);
    });

    socket.on('driver:decline', async ({ ride_id }) => {
      const driver = await prisma.driver.findUnique({ where: { user_id: socket.user.id } });
      if (!driver) return;
      const redis = getRedis();
      await redis.set(config.redisKeys.driverDecline(ride_id, driver.id), '1', 'EX', 30);
    });

    socket.on('driver:arrived', async ({ ride_id }) => {
      const driver = await prisma.driver.findUnique({ where: { user_id: socket.user.id } });
      if (!driver) return;

      const ride = await prisma.ride.findFirst({
        where: { id: ride_id, driver_id: driver.id },
      });
      if (!ride) return;

      await prisma.ride.update({
        where: { id: ride_id },
        data: { status: 'DRIVER_ARRIVED' },
      });

      io.to(`ride:${ride_id}`).emit('ride:driver_arrived', { timestamp: Date.now() });
      io.to(`ride:${ride_id}`).emit('ride:status_update', {
        rideId: ride_id,
        status: 'DRIVER_ARRIVED',
        timestamp: Date.now(),
      });
    });

    socket.on('driver:start_ride', async ({ ride_id, otp }) => {
      const driver = await prisma.driver.findUnique({ where: { user_id: socket.user.id } });
      if (!driver) return;

      const ride = await prisma.ride.findFirst({
        where: { id: ride_id, driver_id: driver.id },
      });
      if (!ride) return;

      if (ride.rider_otp_locked_until && ride.rider_otp_locked_until > new Date()) {
        socket.emit('ride:error', { code: 'OTP_LOCKED', message: 'OTP locked. Try again later.' });
        return;
      }

      if (ride.rider_otp !== otp) {
        const attempts = ride.rider_otp_attempts + 1;
        const updateData = { rider_otp_attempts: attempts };
        if (attempts >= 3) {
          updateData.rider_otp_locked_until = new Date(Date.now() + 10 * 60 * 1000);
          await dispatchNotification({
            userId: ride.rider_id,
            sms: true,
            templateKey: 'OTP',
            params: { otp: ride.rider_otp },
          });
        }
        await prisma.ride.update({ where: { id: ride_id }, data: updateData });
        socket.emit('ride:error', { code: 'INVALID_OTP', message: 'Invalid OTP' });
        return;
      }

      await prisma.ride.update({
        where: { id: ride_id },
        data: { status: 'IN_PROGRESS', started_at: new Date(), rider_otp_attempts: 0 },
      });

      io.to(`ride:${ride_id}`).emit('ride:started', { otp_verified: true, started_at: new Date() });
      io.to(`ride:${ride_id}`).emit('ride:status_update', {
        rideId: ride_id,
        status: 'IN_PROGRESS',
        timestamp: Date.now(),
      });
    });

    socket.on('driver:end_ride', async ({ ride_id, final_lat, final_lng }) => {
      const driver = await prisma.driver.findUnique({ where: { user_id: socket.user.id } });
      if (!driver) return;

      const ride = await prisma.ride.findFirst({
        where: { id: ride_id, driver_id: driver.id, status: 'IN_PROGRESS' },
        include: { pool_fare_allocation: true },
      });
      if (!ride) return;

      const finalFare = ride.pool_fare_allocation
        ? Number(ride.pool_fare_allocation.allocated_fare)
        : Number(ride.estimated_fare);

      await prisma.$transaction([
        prisma.ride.update({
          where: { id: ride_id },
          data: {
            status: 'COMPLETED',
            completed_at: new Date(),
            final_fare: finalFare,
          },
        }),
        prisma.driver.update({
          where: { id: driver.id },
          data: { status: 'ONLINE' },
        }),
      ]);

      const redis = getRedis();
      await redis.geoadd(
        config.redisKeys.driversOnline,
        Number(driver.current_lng) || 0,
        Number(driver.current_lat) || 0,
        driver.id
      );

      io.to(`ride:${ride_id}`).emit('ride:completed', {
        fare: finalFare,
        distance_km: Number(ride.distance_km),
        duration_minutes: ride.duration_minutes,
      });

      await dispatchNotification({
        userId: ride.rider_id,
        push: {
          title: 'Ride Completed',
          body: `Fare: ₹${finalFare}`,
          data: { ride_id },
        },
        templateKey: 'RIDE_COMPLETED',
        params: { fare: finalFare, distanceKm: ride.distance_km },
      });
    });

    socket.on('rider:sos', async (data) => {
      await trackingService.handleSos(socket.user.id, data, io);
    });

    socket.on('disconnect', () => {
      logger.debug('Socket disconnected', { userId: socket.user.id });
    });
  });
}

async function emitDriverAssigned(io, rideId, driver, vehicle, etaMinutes) {
  io.to(`ride:${rideId}`).emit('ride:driver_assigned', {
    driver: {
      name: driver.user.name,
      phone_masked: maskPhone(driver.user.phone),
      vehicle_number: vehicle.registration_number,
      vehicle_color: vehicle.color,
      rating: Number(driver.rating),
    },
    eta_minutes: etaMinutes,
  });
}

module.exports = { setupTrackingSockets, emitDriverAssigned };
