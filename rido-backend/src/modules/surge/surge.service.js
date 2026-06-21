const prisma = require('../../utils/prisma');
const { getRedis } = require('../../config/redis');
const { fetchWeatherSeverity } = require('./weather.service');
const logger = require('../../utils/logger');
const { Prisma } = require('@prisma/client');

let Sentry = null;
try {
  Sentry = require('@sentry/node');
} catch (e) {
  // Sentry not installed or loaded
}

async function computeSurgeForZone(zoneId) {
  const redis = getRedis();

  try {
    const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone || !zone.is_active) {
      return;
    }

    // Get centroid coordinates of the zone polygon
    const zoneCentroid = await prisma.$queryRaw`
      SELECT ST_Y(ST_Centroid(polygon)) as lat, ST_X(ST_Centroid(polygon)) as lng
      FROM zones
      WHERE id = ${zoneId}
    `;
    const lat = zoneCentroid[0]?.lat || 0;
    const lng = zoneCentroid[0]?.lng || 0;

    // 1. Demand Count: count of Ride records with status SEARCHING or POOL_MATCHING created in the last 5 minutes (distinct riders)
    const demandResult = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT r.rider_id)::int as count
      FROM rides r, zones z
      WHERE z.id = ${zoneId}
        AND r.status IN ('SEARCHING', 'POOL_MATCHING')
        AND r.created_at >= NOW() - INTERVAL '5 minutes'
        AND r.pickup_geom IS NOT NULL
        AND ST_Contains(z.polygon, r.pickup_geom)
    `;
    const demandCount = demandResult[0]?.count || 0;

    // 2. Supply Count: online drivers currently inside the zone
    const onlineDriverIds = await redis.zrange('rido:drivers:online', 0, -1);
    let supplyCount = 0;
    if (onlineDriverIds.length > 0) {
      const supplyResult = await prisma.$queryRaw`
        SELECT COUNT(*)::int as count
        FROM drivers d, zones z
        WHERE z.id = ${zoneId}
          AND d.id IN (${Prisma.join(onlineDriverIds)})
          AND d.current_lat IS NOT NULL
          AND d.current_lng IS NOT NULL
          AND ST_Contains(z.polygon, ST_SetSRID(ST_MakePoint(d.current_lng, d.current_lat), 4326))
      `;
      supplyCount = supplyResult[0]?.count || 0;
    }

    // 3. Demand-Supply Ratio Score
    const demandSupplyRatio = demandCount / Math.max(supplyCount, 1);
    // ratioScore = clamp((ratio - 1) / 3, 0, 1) -> 1.0 (balanced) = 0 score, 4.0 = max score
    const ratioScore = Math.max(0, Math.min(1.0, (demandSupplyRatio - 1) / 3));

    // 4. Weather Severity
    let weatherSeverity = 0.0;
    let weatherFailed = false;
    try {
      weatherSeverity = await fetchWeatherSeverity(lat, lng);
    } catch (weatherErr) {
      logger.warn('Weather API failed, forcing weather severity to 0', { error: weatherErr.message });
      weatherFailed = true;
    }

    // 5. Traffic Congestion Index
    let trafficCongestionIndex = 0.0;
    try {
      const nowMs = Date.now();
      // Remove logs older than 10 minutes
      await redis.zremrangebyscore(`rido:congestion:${zoneId}`, '-inf', nowMs - 600000);
      const entries = await redis.zrange(`rido:congestion:${zoneId}`, 0, -1);
      let avgCongestion = 1.0;
      if (entries.length > 0) {
        let sum = 0;
        for (const entry of entries) {
          const [ratioStr] = entry.split(':');
          sum += parseFloat(ratioStr);
        }
        avgCongestion = sum / entries.length;
      }
      // Normalization: 1.0-1.2 = 0 score, 2.0+ = 1.0 score
      if (avgCongestion > 1.2) {
        trafficCongestionIndex = Math.min(1.0, (avgCongestion - 1.2) / 0.8);
      }
    } catch (trafficErr) {
      logger.warn('Traffic lookup failed, forcing congestion to 0', { error: trafficErr.message });
    }

    // 6. Event Boost
    let eventBoost = 0.0;
    try {
      const now = new Date();
      const activeEvents = await prisma.eventBoostConfig.findMany({
        where: {
          zone_id: zoneId,
          is_active: true,
          starts_at: { lte: now },
        },
      });

      for (const event of activeEvents) {
        const endsAtTime = event.ends_at.getTime();
        const decayTime = endsAtTime + event.decay_minutes * 60 * 1000;
        const nowTime = now.getTime();

        if (nowTime <= endsAtTime) {
          const boost = Number(event.boost_peak_value);
          if (boost > eventBoost) eventBoost = boost;
        } else if (nowTime <= decayTime && event.decay_minutes > 0) {
          const decayFraction = (nowTime - endsAtTime) / (event.decay_minutes * 60 * 1000);
          const boost = Number(event.boost_peak_value) * (1 - decayFraction);
          if (boost > eventBoost) eventBoost = boost;
        }
      }
    } catch (eventErr) {
      logger.warn('Event boost lookup failed, forcing event boost to 0', { error: eventErr.message });
    }

    // 7. Base Surge Score
    const w1 = parseFloat(process.env.SURGE_WEIGHT_DEMAND_SUPPLY || '0.45');
    const w2 = parseFloat(process.env.SURGE_WEIGHT_WEATHER || '0.20');
    const w3 = parseFloat(process.env.SURGE_WEIGHT_TRAFFIC || '0.20');
    const w4 = parseFloat(process.env.SURGE_WEIGHT_EVENT || '0.15');

    const surgeScore = (w1 * ratioScore) + (w2 * weatherSeverity) + (w3 * trafficCongestionIndex) + (w4 * eventBoost);

    // 8. Scale multiplier per vehicle type config
    const configs = await prisma.vehicleFareConfig.findMany();
    
    // Check if APIs are down (e.g. OpenWeatherMap API)
    const criticalFailure = weatherFailed;

    for (const vConfig of configs) {
      const vehicleType = vConfig.vehicle_type;
      const maxSurgeMultiplier = Number(vConfig.max_surge_multiplier) || 2.0;

      let computedMultiplier = 1.0;
      if (criticalFailure) {
        computedMultiplier = 1.0;
        if (Sentry && typeof Sentry.captureMessage === 'function') {
          Sentry.captureMessage(`CRITICAL: Weather API failure. Surge forced to 1.0 for zone ${zoneId}, vehicle ${vehicleType}`, 'error');
        }
        logger.error(`CRITICAL: Weather API down. Surge forced to 1.0 for zone ${zoneId}, vehicle ${vehicleType}`);
      } else if (surgeScore >= parseFloat(process.env.SURGE_ACTIVATION_THRESHOLD || '0.15')) {
        computedMultiplier = 1.0 + (surgeScore * (maxSurgeMultiplier - 1.0));
      }

      // EMA smoothing
      const prevMultiplierKey = `surge:prev:${zoneId}:${vehicleType}`;
      const prevVal = await redis.get(prevMultiplierKey);

      let finalMultiplier;
      if (prevVal === null) {
        finalMultiplier = computedMultiplier;
      } else {
        const previousMultiplier = parseFloat(prevVal);
        const emaFactor = parseFloat(process.env.SURGE_EMA_SMOOTHING_FACTOR || '0.3');
        finalMultiplier = (1 - emaFactor) * previousMultiplier + emaFactor * computedMultiplier;
      }

      // Round to nearest 0.05
      finalMultiplier = Math.round(finalMultiplier * 20) / 20;

      // Clamp limits
      finalMultiplier = Math.max(1.0, Math.min(maxSurgeMultiplier, finalMultiplier));

      // Cache multiplier in Redis
      const cacheKey = `surge:${zoneId}:${vehicleType}`;
      const cacheData = {
        multiplier: finalMultiplier,
        no_drivers_available: supplyCount === 0,
        demand_count: demandCount,
        supply_count: supplyCount,
        demand_supply_ratio: demandSupplyRatio,
        weather_severity: weatherSeverity,
        traffic_congestion_index: trafficCongestionIndex,
        event_boost: eventBoost,
        surge_score: surgeScore,
        computed_at: new Date().toISOString(),
      };

      await redis.set(cacheKey, JSON.stringify(cacheData), 'EX', 90); // 90s TTL
      await redis.set(prevMultiplierKey, finalMultiplier.toString()); // Persist previous for EMA (no TTL)

      // Write to database snapshot (audit trail)
      await prisma.surgeZoneSnapshot.create({
        data: {
          zone_id: zoneId,
          vehicle_type: vehicleType,
          demand_count: demandCount,
          supply_count: supplyCount,
          demand_supply_ratio: new Prisma.Decimal(demandSupplyRatio),
          weather_severity: new Prisma.Decimal(weatherSeverity),
          traffic_congestion_index: new Prisma.Decimal(trafficCongestionIndex),
          event_boost: new Prisma.Decimal(eventBoost),
          surge_score: new Prisma.Decimal(surgeScore),
          surge_multiplier: new Prisma.Decimal(finalMultiplier),
        },
      });
    }

    logger.info(`Surge recomputed for zone ${zone.name}`, {
      zoneId,
      demandCount,
      supplyCount,
      surgeScore,
    });
  } catch (err) {
    logger.error('Error recomputing surge for zone', { zoneId, error: err.message });
  }
}

async function getSurgeMultiplier(zoneId, vehicleType) {
  const redis = getRedis();
  const cacheKey = `surge:${zoneId}:${vehicleType}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    logger.warn('Failed to read surge cache from Redis', { error: err.message });
  }

  // Cache miss: trigger computeSurgeForZone with a 2-second timeout
  logger.info('Surge cache miss, computing synchronously', { zoneId, vehicleType });
  try {
    const computePromise = computeSurgeForZone(zoneId);
    
    // We race the compute promise with a 2s timeout
    await Promise.race([
      computePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 2000))
    ]);

    // Read cache again after computing
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    logger.warn('Synchronous surge recomputation failed or timed out, falling back to 1.0', { error: err.message });
  }

  return {
    multiplier: 1.0,
    no_drivers_available: false,
    demand_count: 0,
    supply_count: 0,
    demand_supply_ratio: 0.0,
    weather_severity: 0.0,
    traffic_congestion_index: 0.0,
    event_boost: 0.0,
    surge_score: 0.0,
    computed_at: new Date().toISOString(),
  };
}

module.exports = {
  computeSurgeForZone,
  getSurgeMultiplier,
};
