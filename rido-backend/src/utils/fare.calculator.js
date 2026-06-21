const config = require('../config');
const prisma = require('./prisma');

const VEHICLE_CAPACITY = {
  AUTO: 3,
  MINI_CAR: 4,
  SEDAN: 4,
  SUV: 6,
  TEMPO: 8,
};

async function getFareConfig(vehicleType) {
  return prisma.vehicleFareConfig.findUnique({ where: { vehicle_type: vehicleType } });
}

function computeSoloFare({ distanceKm, durationMinutes, fareConfig, surgeMultiplier = 1 }) {
  const baseFare = Number(fareConfig.base_fare);
  const distanceCharge = Number(fareConfig.per_km_rate) * distanceKm;
  const timeCharge = Number(fareConfig.per_minute_rate) * durationMinutes;
  const subtotal = baseFare + distanceCharge + timeCharge;
  const surged = subtotal * surgeMultiplier;
  const total = Math.max(surged, Number(fareConfig.min_fare));

  return {
    baseFare,
    distanceCharge: Math.round(distanceCharge * 100) / 100,
    timeCharge: Math.round(timeCharge * 100) / 100,
    surgeFee: Math.round((surged - subtotal) * 100) / 100,
    total: Math.round(total * 100) / 100,
    breakdown: {
      base: baseFare,
      per_km: Number(fareConfig.per_km_rate),
      per_minute: Number(fareConfig.per_minute_rate),
      surge: surgeMultiplier,
    },
  };
}

function computeSharedFareSplit({ rides, combinedDistanceKm, combinedDurationMinutes, fareConfig, surgeMultiplier = 1 }) {
  const combinedFare = computeSoloFare({
    distanceKm: combinedDistanceKm,
    durationMinutes: combinedDurationMinutes,
    fareConfig,
    surgeMultiplier,
  });

  const totalRouteKm = rides.reduce((sum, r) => sum + r.distanceKm, 0);
  if (totalRouteKm === 0) {
    return rides.map((r) => ({
      rideId: r.rideId,
      allocatedFare: combinedFare.total / rides.length,
      distanceSharePercent: 100 / rides.length,
      savings: 0,
      soloFare: r.soloFare,
    }));
  }

  const commissionRate = config.platformCommissionPercent / 100;
  const sharedBonusRate = Number(fareConfig.driver_shared_bonus_percent) / 100;

  const results = rides.map((ride) => {
    const sharePercent = (ride.distanceKm / totalRouteKm) * 100;
    let allocatedFare = (ride.distanceKm / totalRouteKm) * combinedFare.total;
    allocatedFare = Math.round(allocatedFare * 100) / 100;

    const soloTotal = ride.soloFare?.total ?? allocatedFare;
    if (allocatedFare > soloTotal) {
      return {
        rideId: ride.rideId,
        allocatedFare: soloTotal,
        distanceSharePercent: Math.round(sharePercent * 100) / 100,
        savings: 0,
        soloFare: ride.soloFare,
        exceedsSolo: true,
      };
    }

    const savings = Math.round((soloTotal - allocatedFare) * 100) / 100;
    return {
      rideId: ride.rideId,
      allocatedFare,
      distanceSharePercent: Math.round(sharePercent * 100) / 100,
      savings,
      soloFare: ride.soloFare,
      exceedsSolo: false,
    };
  });

  const driverEarning =
    combinedFare.total * (1 - commissionRate) + combinedFare.total * sharedBonusRate;

  return { allocations: results, combinedFare: combinedFare.total, driverEarning };
}

async function getSurgeMultiplier({ lat, lng, prismaClient = prisma }) {
  try {
    const result = await prismaClient.$queryRaw`
      SELECT z.id, z.surge_multiplier, z.name
      FROM zones z
      WHERE z.is_active = true
        AND ST_Contains(z.polygon, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
      LIMIT 1
    `;
    if (result?.length) {
      return {
        multiplier: Number(result[0].surge_multiplier),
        zoneId: result[0].id,
        zoneName: result[0].name,
      };
    }
  } catch (err) {
    // PostGIS may not be available in test env
  }
  return { multiplier: 1.0, zoneId: null, zoneName: null };
}

module.exports = {
  computeSoloFare,
  computeSharedFareSplit,
  getSurgeMultiplier,
  getFareConfig,
  VEHICLE_CAPACITY,
};
