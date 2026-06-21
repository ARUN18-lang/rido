const prisma = require('../../utils/prisma');
const { getRedis } = require('../../config/redis');
const { sendSuccess } = require('../../utils/response');
const { getVehicleFareConfig, computeSoloFare, computePoolFareSplit } = require('../fare/fare.calculator');
const { ValidationError, NotFoundError } = require('../../utils/errors');

async function getSurgeDebug(req, res, next) {
  try {
    const { zoneId } = req.params;
    const latest = await prisma.surgeZoneSnapshot.findFirst({
      where: { zone_id: zoneId },
      orderBy: { computed_at: 'desc' },
    });

    if (!latest) {
      throw new NotFoundError('No surge snapshots found for this zone');
    }

    sendSuccess(res, latest);
  } catch (err) {
    next(err);
  }
}

async function getSurgeHistory(req, res, next) {
  try {
    const { zoneId } = req.params;
    const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const history = await prisma.surgeZoneSnapshot.findMany({
      where: {
        zone_id: zoneId,
        computed_at: { gte: past24h },
      },
      orderBy: { computed_at: 'desc' },
    });

    sendSuccess(res, history);
  } catch (err) {
    next(err);
  }
}

async function updateVehicleConfig(req, res, next) {
  try {
    const { vehicleType } = req.params;
    const data = req.body;

    // Map per_min_rate to per_minute_rate if provided
    if (data.per_min_rate !== undefined) {
      data.per_minute_rate = data.per_min_rate;
      delete data.per_min_rate;
    }

    const updated = await prisma.vehicleFareConfig.update({
      where: { vehicle_type: vehicleType },
      data,
    });

    // Clear Redis cache
    const redis = getRedis();
    await redis.del(`fare:config:${vehicleType}`);

    sendSuccess(res, updated, 'Vehicle configuration updated successfully');
  } catch (err) {
    next(err);
  }
}

async function createOrUpdateRevenueMultiplier(req, res, next) {
  try {
    const { vehicle_type, passenger_count, revenue_multiplier } = req.body;

    const discount_percent = (1 - (revenue_multiplier / passenger_count)) * 100;

    const record = await prisma.poolRevenueMultiplier.upsert({
      where: {
        vehicle_type_passenger_count: {
          vehicle_type,
          passenger_count,
        },
      },
      create: {
        vehicle_type,
        passenger_count,
        revenue_multiplier,
        discount_percent,
        is_active: true,
      },
      update: {
        revenue_multiplier,
        discount_percent,
      },
    });

    sendSuccess(res, record, 'Revenue multiplier configured successfully');
  } catch (err) {
    next(err);
  }
}

async function createEventBoost(req, res, next) {
  try {
    const { zone_id, event_name, event_type, starts_at, ends_at, boost_peak_value, decay_minutes } = req.body;

    const event = await prisma.eventBoostConfig.create({
      data: {
        zone_id,
        event_name,
        event_type,
        starts_at: new Date(starts_at),
        ends_at: new Date(ends_at),
        boost_peak_value,
        decay_minutes,
        is_active: true,
      },
    });

    sendSuccess(res, event, 'Event boost created successfully');
  } catch (err) {
    next(err);
  }
}

async function updateEventBoost(req, res, next) {
  try {
    const { id } = req.params;
    const { ends_at, decay_minutes, is_active } = req.body;

    const data = {};
    if (ends_at !== undefined) data.ends_at = new Date(ends_at);
    if (decay_minutes !== undefined) data.decay_minutes = decay_minutes;
    if (is_active !== undefined) data.is_active = is_active;

    const updated = await prisma.eventBoostConfig.update({
      where: { id },
      data,
    });

    sendSuccess(res, updated, 'Event boost updated successfully');
  } catch (err) {
    next(err);
  }
}

async function simulateFare(req, res, next) {
  try {
    // support both GET (query parameters) and POST (body)
    const params = req.method === 'GET' ? req.query : req.body;
    const validationResult = simulateSchemaSafeParse(params);
    if (!validationResult.success) {
      throw new ValidationError('Validation failed', validationResult.error.format());
    }

    const { vehicle_type, distance_km, duration_min, passenger_count, surge_multiplier } = validationResult.data;
    const config = await getVehicleFareConfig(vehicle_type);

    const solo = computeSoloFare({
      vehicleType: vehicle_type,
      distanceKm: distance_km,
      durationMin: duration_min,
      surgeMultiplier: surge_multiplier,
      config,
    });

    if (passenger_count === 1 || vehicle_type === 'BIKE_TAXI') {
      return sendSuccess(res, {
        mode: 'SOLO',
        vehicle_type,
        passenger_count: 1,
        solo,
        final_fare: solo.total,
      });
    }

    // Simulate sharing
    // Assume other riders have similar distance/duration for simulation split
    const passengerRides = [];
    for (let i = 0; i < passenger_count; i++) {
      passengerRides.push({
        rideId: `sim-ride-${i + 1}`,
        riderId: `sim-rider-${i + 1}`,
        individualDistanceKm: distance_km,
        individualDurationMin: duration_min,
        soloFareIfAlone: solo.total,
        stopSequenceIndex: i, // 0 for anchor, >0 for additional stops
        actualWaitMinutesAtPickup: 0,
      });
    }

    const allocations = await computePoolFareSplit({
      vehicleType: vehicle_type,
      passengerRides,
      combinedRoute: {
        distance_km,
        duration_min,
        duration_in_traffic_min: duration_min,
        polyline: '',
      },
      surgeMultiplier: surge_multiplier,
      config,
    });

    sendSuccess(res, {
      mode: 'SHARED',
      vehicle_type,
      passenger_count,
      solo,
      allocations,
    });
  } catch (err) {
    next(err);
  }
}

// Inline schema validation check to avoid schema resolution circular dependencies
function simulateSchemaSafeParse(data) {
  const { simulateSchema } = require('./pricing.schema');
  return simulateSchema.safeParse(data);
}

module.exports = {
  getSurgeDebug,
  getSurgeHistory,
  updateVehicleConfig,
  createOrUpdateRevenueMultiplier,
  createEventBoost,
  updateEventBoost,
  simulateFare,
};
