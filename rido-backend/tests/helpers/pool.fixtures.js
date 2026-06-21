const SHARED_POLYLINE = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

const FARE_CONFIG = {
  vehicle_type: 'AUTO',
  base_fare: 30,
  per_km_rate: 12,
  per_minute_rate: 1.5,
  min_fare: 40,
  cancellation_fee: 20,
  shared_discount_percent: 25,
  driver_shared_bonus_percent: 5,
};

function createRider(overrides = {}) {
  return {
    id: overrides.id || 'rider-1',
    gender: overrides.gender || 'MALE',
    phone: '+919800000001',
    name: 'Test Rider',
    ...overrides,
  };
}

function createPool(overrides = {}) {
  return {
    id: overrides.id || 'pool-1',
    vehicle_type: 'AUTO',
    max_passengers: overrides.max_passengers ?? 3,
    current_passenger_count: overrides.current_passenger_count ?? 1,
    status: overrides.status || 'WAITING',
    driver_id: overrides.driver_id ?? null,
    vehicle_id: overrides.vehicle_id ?? null,
    pool_window_start: new Date(),
    pool_window_end: new Date(Date.now() + 300000),
    ...overrides,
  };
}

function createRide(overrides = {}) {
  const pool = overrides.pool !== undefined ? overrides.pool : createPool(overrides.poolOverrides);
  const rider = overrides.rider || createRider({ id: overrides.rider_id || 'rider-1', gender: overrides.rider_gender });

  return {
    id: overrides.id || 'ride-1',
    rider_id: rider.id,
    driver_id: overrides.driver_id ?? null,
    vehicle_id: overrides.vehicle_id ?? null,
    pool_id: pool?.id || 'pool-1',
    mode: 'SHARED',
    type: overrides.type || 'STANDARD',
    vehicle_type: 'AUTO',
    status: overrides.status || 'POOL_MATCHING',
    pickup_address: 'Anna Nagar, Madurai',
    pickup_lat: overrides.pickup_lat ?? 9.9252,
    pickup_lng: overrides.pickup_lng ?? 78.1198,
    drop_address: 'Bypass Road, Madurai',
    drop_lat: overrides.drop_lat ?? 9.9312,
    drop_lng: overrides.drop_lng ?? 78.156,
    route_polyline: overrides.route_polyline ?? SHARED_POLYLINE,
    distance_km: overrides.distance_km ?? 5,
    duration_minutes: overrides.duration_minutes ?? 15,
    estimated_fare: overrides.estimated_fare ?? 120,
    surge_multiplier: overrides.surge_multiplier ?? 1,
    created_at: overrides.created_at ?? new Date(),
    rider,
    pool,
    ...overrides,
  };
}

function createCandidateEntry(overrides = {}) {
  return {
    rideId: overrides.rideId || 'ride-2',
    pickup_lat: overrides.pickup_lat ?? 9.926,
    pickup_lng: overrides.pickup_lng ?? 78.1205,
    drop_lat: overrides.drop_lat ?? 9.932,
    drop_lng: overrides.drop_lng ?? 78.157,
    route_polyline: overrides.route_polyline ?? SHARED_POLYLINE,
    max_passengers: 3,
    created_at: (overrides.created_at ?? new Date()).toISOString(),
    rider_gender: overrides.rider_gender ?? 'MALE',
    vehicle_type: 'AUTO',
    ride_type: overrides.ride_type ?? 'STANDARD',
  };
}

function candidateRedisHash(candidates = []) {
  const hash = {};
  for (const c of candidates) {
    const rideId = c.rideId || `ride-candidate-${Object.keys(hash).length + 2}`;
    hash[rideId] = JSON.stringify({ ...c, rideId });
  }
  return hash;
}

const COMBINED_ROUTE = {
  polyline: SHARED_POLYLINE,
  distanceKm: 8,
  durationMinutes: 22,
  fallback: false,
};

module.exports = {
  SHARED_POLYLINE,
  FARE_CONFIG,
  COMBINED_ROUTE,
  createRider,
  createPool,
  createRide,
  createCandidateEntry,
  candidateRedisHash,
};
