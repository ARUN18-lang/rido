const Redlock = require('redlock');
const prisma = require('../../utils/prisma');
const config = require('../../config');
const { getRedis } = require('../../config/redis');
const { getDirections } = require('../../config/maps');
const {
  computeSoloFare,
  computePoolFareSplit,
  getVehicleFareConfig,
} = require('../fare/fare.calculator');
const VEHICLE_CAPACITY = {
  BIKE_TAXI: 1,
  AUTO: 3,
  MINI_CAR: 4,
  SEDAN: 4,
  SUV: 6,
  TEMPO: 8,
};
const {
  haversineDistanceKm,
  bearing,
  bearingDifference,
  computeRouteOverlap,
} = require('../../utils/geo');
const { dispatchFindDriver, dispatchNotification } = require('../../queues');
const logger = require('../../utils/logger');

let redlock = null;

function getRedlock() {
  if (!redlock) {
    redlock = new Redlock([getRedis()], { retryCount: 3, retryDelay: 200 });
  }
  return redlock;
}

async function findPoolMatch(rideId) {
  const lockKey = config.redisKeys.poolLock(rideId);
  let lock;
  try {
    lock = await getRedlock().acquire([lockKey], 30000);
  } catch {
    logger.debug('Pool match lock not acquired', { rideId });
    return { matched: false, reason: 'lock_busy' };
  }

  try {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { rider: true, pool: true },
    });

    if (!ride || ride.status !== 'POOL_MATCHING') {
      return { matched: false, reason: 'invalid_ride_state' };
    }

    const now = Date.now();
    const windowStart = ride.created_at.getTime();
    if (now - windowStart > config.poolMatchWindowSeconds * 1000) {
      return convertToSolo(ride);
    }

    const redis = getRedis();
    const vehicleType = ride.pool?.vehicle_type || 'AUTO';
    const actualKey = config.redisKeys.poolWaiting(vehicleType, ride.type);
    const waitingRaw = await redis.hgetall(actualKey);

    const candidates = [];
    for (const [candidateRideId, raw] of Object.entries(waitingRaw)) {
      if (candidateRideId === rideId) continue;
      try {
        const entry = JSON.parse(raw);
        const distToPickup = haversineDistanceKm(
          Number(ride.pickup_lat),
          Number(ride.pickup_lng),
          entry.pickup_lat,
          entry.pickup_lng
        );
        if (distToPickup > config.poolMatchRadiusKm) continue;

        const createdAt = new Date(entry.created_at).getTime();
        if (now - createdAt > config.poolMatchWindowSeconds * 1000) continue;

        if (ride.type === 'WOMEN_ONLY' && entry.rider_gender !== 'FEMALE') continue;

        const rideBearing = bearing(
          Number(ride.pickup_lat),
          Number(ride.pickup_lng),
          Number(ride.drop_lat),
          Number(ride.drop_lng)
        );
        const candidateBearing = bearing(
          entry.pickup_lat,
          entry.pickup_lng,
          entry.drop_lat,
          entry.drop_lng
        );
        if (bearingDifference(rideBearing, candidateBearing) > 45) continue;

        const overlap = computeRouteOverlap(ride.route_polyline, entry.route_polyline);
        if (overlap < config.poolRouteOverlapThreshold) continue;

        candidates.push({
          ...entry,
          rideId: candidateRideId,
          overlap_percent: overlap,
          distance_to_pickup: distToPickup,
        });
      } catch (err) {
        logger.warn('Invalid pool candidate', { candidateRideId, error: err.message });
      }
    }

    candidates.sort((a, b) => {
      if (b.overlap_percent !== a.overlap_percent) return b.overlap_percent - a.overlap_percent;
      return a.distance_to_pickup - b.distance_to_pickup;
    });

    if (!candidates.length) {
      return { matched: false, reason: 'no_candidates' };
    }

    const best = candidates[0];
    const pool = ride.pool || (await prisma.ridePool.findFirst({
      where: { rides: { some: { id: rideId } } },
    }));

    if (!pool) return { matched: false, reason: 'no_pool' };

    if (pool.current_passenger_count >= pool.max_passengers) {
      return { matched: false, reason: 'pool_full' };
    }

    const existingRides = await prisma.ride.findMany({
      where: { pool_id: pool.id },
      include: { rider: true },
    });

    const allRideIds = [...existingRides.map((r) => r.id), best.rideId];
    const allRides = await prisma.ride.findMany({ where: { id: { in: allRideIds } } });

    const waypoints = allRides.flatMap((r) => [
      { lat: Number(r.pickup_lat), lng: Number(r.pickup_lng) },
      { lat: Number(r.drop_lat), lng: Number(r.drop_lng) },
    ]);

    const firstRide = allRides[0];
    const lastRide = allRides[allRides.length - 1];
    const combinedRoute = await getDirections({
      pickupLat: Number(firstRide.pickup_lat),
      pickupLng: Number(firstRide.pickup_lng),
      dropLat: Number(lastRide.drop_lat),
      dropLng: Number(lastRide.drop_lng),
      waypoints: waypoints.slice(1, -1),
    });

    const fareConfig = await getVehicleFareConfig(pool.vehicle_type);

    const anchorRide = allRides.reduce((prev, current) => {
      return (Number(current.distance_km) > Number(prev.distance_km)) ? current : prev;
    });

    const passengerRides = await Promise.all(
      allRides.map(async (r) => {
        const solo = computeSoloFare({
          vehicleType: pool.vehicle_type,
          distanceKm: Number(r.distance_km),
          durationMin: r.duration_minutes,
          surgeMultiplier: Number(r.surge_multiplier),
          config: fareConfig,
        });
        return {
          rideId: r.id,
          riderId: r.rider_id,
          individualDistanceKm: Number(r.distance_km),
          individualDurationMin: r.duration_minutes,
          soloFareIfAlone: solo.total,
          stopSequenceIndex: r.id === anchorRide.id ? 0 : 1,
          actualWaitMinutesAtPickup: 0,
          pickupLat: Number(r.pickup_lat),
          pickupLng: Number(r.pickup_lng),
        };
      })
    );

    const allocations = await computePoolFareSplit({
      vehicleType: pool.vehicle_type,
      passengerRides,
      combinedRoute,
      surgeMultiplier: Number(ride.surge_multiplier),
      config: fareConfig,
    });

    const newAllocation = allocations.find((a) => a.rideId === best.rideId);
    if (newAllocation?.wasCappedToSolo && newAllocation?.finalFare > passengerRides.find(p => p.rideId === best.rideId)?.soloFareIfAlone) {
      return { matched: false, reason: 'fare_exceeds_solo' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.ride.update({
        where: { id: best.rideId },
        data: { pool_id: pool.id, status: 'POOL_MATCHING' },
      });

      await tx.ridePool.update({
        where: { id: pool.id },
        data: {
          current_passenger_count: { increment: 1 },
          status: 'MATCHED',
          matched_at: new Date(),
          combined_route_polyline: combinedRoute.polyline,
          total_distance_km: combinedRoute.distanceKm,
        },
      });

      for (const alloc of allocations) {
        const rideRecord = allRides.find((r) => r.id === alloc.rideId) || await tx.ride.findUnique({ where: { id: alloc.rideId } });
        
        await tx.poolFareAllocation.upsert({
          where: { ride_id: alloc.rideId },
          create: {
            pool_id: pool.id,
            ride_id: alloc.rideId,
            rider_id: rideRecord.rider_id,
            allocated_fare: alloc.finalFare,
            distance_share_percent: (Number(rideRecord.distance_km) / passengerRides.reduce((sum, pr) => sum + pr.individualDistanceKm, 0)) * 100,
          },
          update: {
            allocated_fare: alloc.finalFare,
            distance_share_percent: (Number(rideRecord.distance_km) / passengerRides.reduce((sum, pr) => sum + pr.individualDistanceKm, 0)) * 100,
          },
        });

        await tx.ridePoolFareBreakdown.upsert({
          where: { ride_id: alloc.rideId },
          create: {
            ride_id: alloc.rideId,
            pool_id: pool.id,
            vehicle_type: pool.vehicle_type,
            passenger_count: allRides.length,
            solo_base_fare: alloc.soloBaseFare,
            surge_multiplier: alloc.surgeMultiplier,
            revenue_multiplier_applied: alloc.revenueMultiplierApplied,
            total_pool_fare: alloc.totalPoolFare,
            raw_per_rider_share: alloc.rawPerRiderShare,
            detour_distance_km: 0.0,
            detour_duration_min: 0.0,
            detour_buffer_amount: 0.0,
            stop_charge: alloc.stopCharge,
            waiting_charge: alloc.waitingCharge,
            final_fare: alloc.finalFare,
            was_capped_to_solo: alloc.wasCappedToSolo,
          },
          update: {
            passenger_count: allRides.length,
            solo_base_fare: alloc.soloBaseFare,
            surge_multiplier: alloc.surgeMultiplier,
            revenue_multiplier_applied: alloc.revenueMultiplierApplied,
            total_pool_fare: alloc.totalPoolFare,
            raw_per_rider_share: alloc.rawPerRiderShare,
            stop_charge: alloc.stopCharge,
            waiting_charge: alloc.waitingCharge,
            final_fare: alloc.finalFare,
            was_capped_to_solo: alloc.wasCappedToSolo,
          },
        });

        await tx.ride.update({
          where: { id: alloc.rideId },
          data: { estimated_fare: alloc.finalFare },
        });
      }
    });

    await redis.hdel(actualKey, best.rideId);

    const allPoolRides = await prisma.ride.findMany({ where: { pool_id: pool.id } });
    for (const r of allPoolRides) {
      await dispatchNotification({
        userId: r.rider_id,
        push: {
          title: 'Pool Matched',
          body: `Matched with ${allPoolRides.length - 1} co-rider(s). You saved on your fare!`,
          data: { type: 'pool_matched', ride_id: r.id },
        },
        templateKey: 'POOL_MATCHED',
        params: { savings: newAllocation?.savings || 0 },
      });
    }

    const updatedPool = await prisma.ridePool.findUnique({ where: { id: pool.id } });
    if (updatedPool.current_passenger_count >= updatedPool.max_passengers) {
      await dispatchFindDriver(rideId, pool.id);
    }

    return { matched: true, pool_id: pool.id, co_riders: updatedPool.current_passenger_count };
  } finally {
    if (lock) await lock.release().catch(() => {});
  }
}

async function convertToSolo(ride) {
  const redis = getRedis();
  const vehicleType = ride.pool?.vehicle_type || 'AUTO';
  await redis.hdel(config.redisKeys.poolWaiting(vehicleType, ride.type), ride.id);

  await prisma.ride.update({
    where: { id: ride.id },
    data: { mode: 'SOLO', status: 'SEARCHING' },
  });

  if (ride.pool_id) {
    const remaining = await prisma.ride.count({
      where: { pool_id: ride.pool_id, status: { not: 'CANCELLED' }, id: { not: ride.id } },
    });
    if (remaining === 0) {
      await prisma.ridePool.update({
        where: { id: ride.pool_id },
        data: { status: 'CANCELLED' },
      });
    }
  }

  await dispatchNotification({
    userId: ride.rider_id,
    push: {
      title: 'Solo Ride',
      body: 'No pool match found. Finding a driver for your solo ride.',
      data: { type: 'ride_converted_solo', ride_id: ride.id },
    },
    templateKey: 'RIDE_CONVERTED_SOLO',
  });

  await dispatchFindDriver(ride.id);
  return { matched: false, converted_to_solo: true };
}

async function handlePoolRiderCancel(rideId, poolId) {
  const pool = await prisma.ridePool.findUnique({
    where: { id: poolId },
    include: { rides: true, allocations: true },
  });
  if (!pool) return;

  const remainingRides = pool.rides.filter((r) => r.id !== rideId && r.status !== 'CANCELLED');

  if (remainingRides.length === 0) {
    await prisma.ridePool.update({ where: { id: poolId }, data: { status: 'CANCELLED' } });
    if (pool.driver_id) {
      await prisma.driver.update({ where: { id: pool.driver_id }, data: { status: 'ONLINE' } });
    }
    return;
  }

  if (remainingRides.length === 1) {
    const soloRide = remainingRides[0];
    const fareConfig = await getVehicleFareConfig(pool.vehicle_type);
    const soloFare = computeSoloFare({
      vehicleType: pool.vehicle_type,
      distanceKm: Number(soloRide.distance_km),
      durationMin: soloRide.duration_minutes,
      surgeMultiplier: Number(soloRide.surge_multiplier),
      config: fareConfig,
    });

    await prisma.$transaction([
      prisma.ride.update({
        where: { id: soloRide.id },
        data: { mode: 'SOLO', estimated_fare: soloFare.total, pool_id: null },
      }),
      prisma.ridePool.update({ where: { id: poolId }, data: { status: 'CANCELLED' } }),
      prisma.poolFareAllocation.deleteMany({ where: { pool_id: poolId } }),
      prisma.ridePoolFareBreakdown.deleteMany({ where: { pool_id: poolId } }),
    ]);

    await dispatchNotification({
      userId: soloRide.rider_id,
      push: {
        title: 'Fare Updated',
        body: 'A co-rider cancelled. Your fare has been updated to solo rate.',
        data: { ride_id: soloRide.id },
      },
    });
    return;
  }

  const fareConfig = await getVehicleFareConfig(pool.vehicle_type);

  const anchorRide = remainingRides.reduce((prev, current) => {
    return (Number(current.distance_km) > Number(prev.distance_km)) ? current : prev;
  });

  const passengerRides = await Promise.all(
    remainingRides.map(async (r) => {
      const solo = computeSoloFare({
        vehicleType: pool.vehicle_type,
        distanceKm: Number(r.distance_km),
        durationMin: r.duration_minutes,
        surgeMultiplier: Number(r.surge_multiplier),
        config: fareConfig,
      });
      return {
        rideId: r.id,
        riderId: r.rider_id,
        individualDistanceKm: Number(r.distance_km),
        individualDurationMin: r.duration_minutes,
        soloFareIfAlone: solo.total,
        stopSequenceIndex: r.id === anchorRide.id ? 0 : 1,
        actualWaitMinutesAtPickup: 0,
        pickupLat: Number(r.pickup_lat),
        pickupLng: Number(r.pickup_lng),
      };
    })
  );

  const combinedRoute = await getDirections({
    pickupLat: Number(remainingRides[0].pickup_lat),
    pickupLng: Number(remainingRides[0].pickup_lng),
    dropLat: Number(remainingRides[remainingRides.length - 1].drop_lat),
    dropLng: Number(remainingRides[remainingRides.length - 1].drop_lng),
  });

  const allocations = await computePoolFareSplit({
    vehicleType: pool.vehicle_type,
    passengerRides,
    combinedRoute: {
      distance_km: combinedRoute.distanceKm,
      duration_min: combinedRoute.durationMinutes,
      duration_in_traffic_min: combinedRoute.durationMinutes,
      polyline: combinedRoute.polyline,
    },
    surgeMultiplier: Number(remainingRides[0].surge_multiplier),
    config: fareConfig,
  });

  for (const alloc of allocations) {
    const r = remainingRides.find((ride) => ride.id === alloc.rideId);
    
    await prisma.poolFareAllocation.upsert({
      where: { ride_id: alloc.rideId },
      create: {
        pool_id: poolId,
        ride_id: alloc.rideId,
        rider_id: r.rider_id,
        allocated_fare: alloc.finalFare,
        distance_share_percent: (Number(r.distance_km) / passengerRides.reduce((sum, pr) => sum + pr.individualDistanceKm, 0)) * 100,
      },
      update: {
        allocated_fare: alloc.finalFare,
        distance_share_percent: (Number(r.distance_km) / passengerRides.reduce((sum, pr) => sum + pr.individualDistanceKm, 0)) * 100,
      },
    });

    await prisma.ridePoolFareBreakdown.upsert({
      where: { ride_id: alloc.rideId },
      create: {
        ride_id: alloc.rideId,
        pool_id: poolId,
        vehicle_type: pool.vehicle_type,
        passenger_count: remainingRides.length,
        solo_base_fare: alloc.soloBaseFare,
        surge_multiplier: alloc.surgeMultiplier,
        revenue_multiplier_applied: alloc.revenueMultiplierApplied,
        total_pool_fare: alloc.totalPoolFare,
        raw_per_rider_share: alloc.rawPerRiderShare,
        detour_distance_km: 0.0,
        detour_duration_min: 0.0,
        detour_buffer_amount: 0.0,
        stop_charge: alloc.stopCharge,
        waiting_charge: alloc.waitingCharge,
        final_fare: alloc.finalFare,
        was_capped_to_solo: alloc.wasCappedToSolo,
      },
      update: {
        passenger_count: remainingRides.length,
        solo_base_fare: alloc.soloBaseFare,
        surge_multiplier: alloc.surgeMultiplier,
        revenue_multiplier_applied: alloc.revenueMultiplierApplied,
        total_pool_fare: alloc.totalPoolFare,
        raw_per_rider_share: alloc.rawPerRiderShare,
        stop_charge: alloc.stopCharge,
        waiting_charge: alloc.waitingCharge,
        final_fare: alloc.finalFare,
        was_capped_to_solo: alloc.wasCappedToSolo,
      },
    });

    await prisma.ride.update({
      where: { id: alloc.rideId },
      data: { estimated_fare: alloc.finalFare },
    });

    await dispatchNotification({
      userId: r.rider_id,
      push: {
        title: 'Fare Updated',
        body: `Pool fare updated to ₹${alloc.finalFare}`,
        data: { ride_id: alloc.rideId },
      },
    });
  }

  await prisma.ridePool.update({
    where: { id: poolId },
    data: { current_passenger_count: remainingRides.length },
  });
}

module.exports = { findPoolMatch, convertToSolo, handlePoolRiderCancel };
