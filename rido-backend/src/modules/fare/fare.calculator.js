const prisma = require('../../utils/prisma');
const { getRedis } = require('../../config/redis');
const { ValidationError, AppError } = require('../../utils/errors');
const { nearestPointOnPolylineDistanceMeters, decodePolyline } = require('../../utils/geo');
const logger = require('../../utils/logger');

let Sentry = null;
try {
  Sentry = require('@sentry/node');
} catch (e) {
  // Sentry not available
}

async function getVehicleFareConfig(vehicleType) {
  const redis = getRedis();
  const cacheKey = `fare:config:${vehicleType}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    logger.warn('Failed to read fare config from Redis cache', { error: err.message });
  }

  const config = await prisma.vehicleFareConfig.findUnique({
    where: { vehicle_type: vehicleType },
  });

  if (!config) {
    throw new AppError('CONFIG_NOT_FOUND', `Vehicle fare config not found for type: ${vehicleType}`, 404);
  }

  const plainConfig = {
    id: config.id,
    vehicle_type: config.vehicle_type,
    base_fare: Number(config.base_fare),
    per_km_rate: Number(config.per_km_rate),
    per_minute_rate: Number(config.per_minute_rate),
    min_fare: Number(config.min_fare),
    max_surge_multiplier: Number(config.max_surge_multiplier || 2.0),
    per_stop_charge: Number(config.per_stop_charge || 8.0),
    waiting_charge_per_min: Number(config.waiting_charge_per_min || 2.0),
  };

  try {
    await redis.set(cacheKey, JSON.stringify(plainConfig), 'EX', 300); // 5 mins TTL
  } catch (err) {
    logger.warn('Failed to cache fare config in Redis', { error: err.message });
  }

  return plainConfig;
}

function computeSoloFare({ vehicleType, distanceKm, durationMin, surgeMultiplier = 1.0, config }) {
  if (!config) {
    throw new Error('Vehicle fare config must be provided');
  }
  
  if (distanceKm <= 0) {
    throw new ValidationError('Distance must be greater than zero');
  }
  if (durationMin < 0) {
    throw new ValidationError('Duration cannot be negative');
  }

  const baseFare = Number(config.base_fare);
  const perKmRate = Number(config.per_km_rate);
  const perMinRate = Number(config.per_minute_rate);
  const minFare = Number(config.min_fare);

  const distanceCharge = perKmRate * distanceKm;
  const timeCharge = perMinRate * durationMin;
  const preSurgeFare = baseFare + distanceCharge + timeCharge;
  const cappedPreSurge = Math.max(preSurgeFare, minFare);
  const surgedFare = cappedPreSurge * surgeMultiplier;
  const total = Math.round(surgedFare * 100) / 100;

  return {
    baseFare,
    distanceCharge: Math.round(distanceCharge * 100) / 100,
    timeCharge: Math.round(timeCharge * 100) / 100,
    preSurgeFare: Math.round(cappedPreSurge * 100) / 100,
    surgeMultiplier,
    surgedFare: Math.round(surgedFare * 100) / 100,
    total,
  };
}

async function computePoolFareSplit({ vehicleType, passengerRides, combinedRoute, surgeMultiplier = 1.0, config }) {
  if (!config) {
    throw new Error('Vehicle fare config must be provided');
  }

  const n = passengerRides.length;
  if (n === 0) {
    return [];
  }

  // 1. Fallback if only 1 rider joins pool
  if (n === 1) {
    const r = passengerRides[0];
    const solo = computeSoloFare({
      vehicleType,
      distanceKm: r.individualDistanceKm,
      durationMin: r.individualDurationMin,
      surgeMultiplier,
      config,
    });

    return [{
      rideId: r.rideId,
      riderId: r.riderId,
      soloBaseFare: solo.baseFare,
      surgeMultiplier,
      revenueMultiplierApplied: 1.0,
      totalPoolFare: solo.total,
      rawPerRiderShare: solo.total,
      stopCharge: 0.0,
      waitingCharge: 0.0,
      finalFare: solo.total,
      wasCappedToSolo: false,
    }];
  }

  // 2. Fetch revenue multiplier M_n
  const multRecord = await prisma.poolRevenueMultiplier.findUnique({
    where: {
      vehicle_type_passenger_count: {
        vehicle_type: vehicleType,
        passenger_count: n,
      },
    },
  });

  if (!multRecord) {
    const errorMsg = `Pool revenue multiplier not configured for ${vehicleType} with ${n} passengers`;
    logger.error(errorMsg);
    if (Sentry && typeof Sentry.captureException === 'function') {
      Sentry.captureException(new Error(errorMsg));
    }
    throw new AppError('PRICING_MISSING_MULTIPLIER', errorMsg, 500);
  }

  const M_n = Number(multRecord.revenue_multiplier);

  // 3. Defensive Validation: ensure pickups lie on the combined route polyline within tolerance
  if (combinedRoute && combinedRoute.polyline) {
    const polyPoints = decodePolyline(combinedRoute.polyline);
    const toleranceMeters = parseFloat(process.env.ROUTE_ONLY_TOLERANCE_METERS || '150');

    for (const r of passengerRides) {
      if (r.pickupLat && r.pickupLng && polyPoints.length > 0) {
        const dist = nearestPointOnPolylineDistanceMeters(Number(r.pickupLat), Number(r.pickupLng), polyPoints);
        if (dist > toleranceMeters) {
          throw new ValidationError(`Rider ${r.riderId} pickup is off-route by ${dist.toFixed(1)}m (max ${toleranceMeters}m)`);
        }
      }
    }
  }

  // 4. Identify anchor rider (longest individual distance)
  let anchorRider = passengerRides[0];
  for (const r of passengerRides) {
    if (r.individualDistanceKm > anchorRider.individualDistanceKm) {
      anchorRider = r;
    }
  }

  // 5. Calculate solo equivalent fare for anchor rider
  const soloEquivalentFare = computeSoloFare({
    vehicleType,
    distanceKm: anchorRider.individualDistanceKm,
    durationMin: anchorRider.individualDurationMin,
    surgeMultiplier,
    config,
  });

  // 6. Calculate total pool fare
  const totalPoolFare = soloEquivalentFare.surgedFare * M_n;

  // 7. Calculate proportional shares and individual details
  const sumDistances = passengerRides.reduce((sum, r) => sum + r.individualDistanceKm, 0);
  if (sumDistances <= 0) {
    throw new ValidationError('Sum of individual distances must be greater than zero');
  }

  const freeWaitMinutes = parseInt(process.env.FREE_WAIT_MINUTES_PER_STOP || '2', 10);
  const results = [];

  for (const r of passengerRides) {
    // Proportional allocation based on distance
    const theirShareOfDistance = r.individualDistanceKm / sumDistances;
    const rawShare = totalPoolFare * theirShareOfDistance;

    // Flat stop charge per additional pickup (stopSequenceIndex > 0)
    const stopCharge = (r.stopSequenceIndex > 0) ? Number(config.per_stop_charge) : 0.0;

    // Waiting charge for delay at pickup beyond free grace period
    const waitTime = Math.max(0, (r.actualWaitMinutesAtPickup || 0) - freeWaitMinutes);
    const waitingCharge = waitTime * Number(config.waiting_charge_per_min);

    let finalFare = rawShare + stopCharge + waitingCharge;
    let wasCappedToSolo = false;

    // Cap at rider's solo fare if alone
    if (finalFare > r.soloFareIfAlone) {
      finalFare = r.soloFareIfAlone;
      wasCappedToSolo = true;
      logger.warn(`Pool fare capped to solo fare for rider ${r.riderId}`, {
        rawShare,
        stopCharge,
        waitingCharge,
        finalFare,
        soloFareIfAlone: r.soloFareIfAlone,
      });
    }

    results.push({
      rideId: r.rideId,
      riderId: r.riderId,
      soloBaseFare: soloEquivalentFare.baseFare,
      surgeMultiplier,
      revenueMultiplierApplied: M_n,
      totalPoolFare: Math.round(totalPoolFare * 100) / 100,
      rawPerRiderShare: Math.round(rawShare * 100) / 100,
      stopCharge: Math.round(stopCharge * 100) / 100,
      waitingCharge: Math.round(waitingCharge * 100) / 100,
      finalFare: Math.round(finalFare * 100) / 100,
      wasCappedToSolo,
    });
  }

  return results;
}

module.exports = {
  getVehicleFareConfig,
  computeSoloFare,
  computePoolFareSplit,
};
