const prisma = require('../../utils/prisma');
const { getRoute } = require('../routing/routing.service');
const { getVehicleFareConfig, computeSoloFare } = require('./fare.calculator');
const { getSurgeMultiplier } = require('../surge/surge.service');
const logger = require('../../utils/logger');

async function estimateFare({ pickup_lat, pickup_lng, drop_lat, drop_lng, vehicle_type, mode, ride_type }) {
  // 1. Get traffic-aware route
  const route = await getRoute({
    originLat: pickup_lat,
    originLng: pickup_lng,
    destLat: drop_lat,
    destLng: drop_lng,
  });

  // 2. Fetch vehicle fare configuration
  const config = await getVehicleFareConfig(vehicle_type);

  // 3. Find zone using PostGIS ST_Contains
  const zoneResult = await prisma.$queryRaw`
    SELECT id, name
    FROM zones
    WHERE is_active = true
      AND ST_Contains(polygon, ST_SetSRID(ST_MakePoint(${Number(pickup_lng)}, ${Number(pickup_lat)}), 4326))
    LIMIT 1
  `;

  let zone = null;
  let surgeMultiplier = 1.0;
  let surgeReason = 'normal';

  if (zoneResult?.length) {
    zone = { id: zoneResult[0].id, name: zoneResult[0].name };
    // Fetch surge multiplier for the zone and vehicle type
    const surge = await getSurgeMultiplier(zone.id, vehicle_type);
    surgeMultiplier = Number(surge.multiplier);
    if (surgeMultiplier > 1.0) {
      surgeReason = surge.no_drivers_available ? 'no_drivers' : 'high_demand';
    }
  }

  // 4. Calculate solo fare
  const soloFare = computeSoloFare({
    vehicleType: vehicle_type,
    distanceKm: route.distance_km,
    durationMin: route.duration_in_traffic_min, // traffic-aware duration
    surgeMultiplier,
    config,
  });

  const surgeAddon = Math.max(0, Math.round((soloFare.total - soloFare.preSurgeFare) * 100) / 100);

  // 5. Calculate shared estimates if vehicle supports pooling (capacity > 1)
  let shared_estimate = null;
  if (vehicle_type !== 'BIKE_TAXI') {
    const multipliers = await prisma.poolRevenueMultiplier.findMany({
      where: {
        vehicle_type,
        passenger_count: { in: [2, 3] },
        is_active: true,
      },
    });

    const M_2 = multipliers.find(m => m.passenger_count === 2);
    const M_3 = multipliers.find(m => m.passenger_count === 3);

    if (M_2 || M_3) {
      shared_estimate = {};
      if (M_2) {
        const perRider2 = (soloFare.total * Number(M_2.revenue_multiplier)) / 2;
        shared_estimate['2_riders'] = {
          per_rider: Math.round(perRider2 * 100) / 100,
          savings_percent: Math.round(Number(M_2.discount_percent)),
        };
      }
      if (M_3) {
        const perRider3 = (soloFare.total * Number(M_3.revenue_multiplier)) / 3;
        shared_estimate['3_riders'] = {
          per_rider: Math.round(perRider3 * 100) / 100,
          savings_percent: Math.round(Number(M_3.discount_percent)),
        };
      }
    }
  }

  return {
    distance_km: Math.round(route.distance_km * 10) / 10,
    duration_min: route.duration_min,
    duration_in_traffic_min: route.duration_in_traffic_min,
    zone,
    surge: {
      multiplier: surgeMultiplier,
      reason: surgeReason,
    },
    solo: {
      total: soloFare.total,
      breakdown: {
        base: soloFare.baseFare,
        distance: soloFare.distanceCharge,
        time: soloFare.timeCharge,
        surge_addon: surgeAddon,
      },
    },
    shared_estimate,
  };
}

module.exports = {
  estimateFare,
};
