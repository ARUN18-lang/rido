const prisma = require('../../utils/prisma');
const { NotFoundError, AppError } = require('../../utils/errors');
const { VEHICLE_TYPE_CAPACITY } = require('../../constants/fare.constants');
const { ACTIVE_RIDE_STATUSES } = require('../../constants/ride.constants');

async function getDriverId(userId) {
  const driver = await prisma.driver.findUnique({ where: { user_id: userId } });
  if (!driver) throw new NotFoundError('Driver profile not found');
  return driver.id;
}

async function createVehicle(userId, data) {
  const driverId = await getDriverId(userId);
  const maxPassengers = VEHICLE_TYPE_CAPACITY[data.type];

  return prisma.vehicle.create({
    data: {
      driver_id: driverId,
      type: data.type,
      make: data.make,
      model: data.model,
      year: data.year,
      color: data.color,
      registration_number: data.registration_number.toUpperCase(),
      max_passengers: maxPassengers,
      is_ac: data.is_ac || false,
      is_active: false,
    },
  });
}

async function listVehicles(userId) {
  const driverId = await getDriverId(userId);
  return prisma.vehicle.findMany({ where: { driver_id: driverId }, orderBy: { created_at: 'desc' } });
}

async function updateVehicle(userId, vehicleId, data) {
  const driverId = await getDriverId(userId);
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, driver_id: driverId } });
  if (!vehicle) throw new NotFoundError('Vehicle not found');
  return prisma.vehicle.update({ where: { id: vehicleId }, data });
}

async function deactivateVehicle(userId, vehicleId) {
  const driverId = await getDriverId(userId);
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, driver_id: driverId } });
  if (!vehicle) throw new NotFoundError('Vehicle not found');

  const activeRide = await prisma.ride.findFirst({
    where: { vehicle_id: vehicleId, status: { in: ACTIVE_RIDE_STATUSES } },
  });
  if (activeRide) {
    throw new AppError('ACTIVE_RIDE', 'Cannot deactivate vehicle with active rides', 400);
  }

  return prisma.vehicle.update({ where: { id: vehicleId }, data: { is_active: false } });
}

async function activateVehicle(userId, vehicleId) {
  const driverId = await getDriverId(userId);
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, driver_id: driverId } });
  if (!vehicle) throw new NotFoundError('Vehicle not found');

  await prisma.$transaction([
    prisma.vehicle.updateMany({ where: { driver_id: driverId }, data: { is_active: false } }),
    prisma.vehicle.update({ where: { id: vehicleId }, data: { is_active: true } }),
  ]);

  return prisma.vehicle.findUnique({ where: { id: vehicleId } });
}

module.exports = { createVehicle, listVehicles, updateVehicle, deactivateVehicle, activateVehicle };
