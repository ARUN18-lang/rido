const config = require('../../config');
const { getRedis } = require('../../config/redis');
const { geohashEncode, haversineDistanceKm } = require('../../utils/geo');
const logger = require('../../utils/logger');

async function getRoute({ originLat, originLng, destLat, destLng, waypoints = [] }) {
  const redis = getRedis();
  const originGeohash = geohashEncode(Number(originLat), Number(originLng), 7);
  const destGeohash = geohashEncode(Number(destLat), Number(destLng), 7);
  
  let cacheKey = `route:${originGeohash}:${destGeohash}`;
  if (waypoints && waypoints.length > 0) {
    const wpGeohashes = waypoints.map(w => geohashEncode(Number(w.lat), Number(w.lng), 7)).join(':');
    cacheKey += `:${wpGeohashes}`;
  }

  // 1. Check logical cache
  try {
    const cached = await redis.get(`route:logical:${cacheKey}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    logger.warn('Failed to read from Redis logical cache', { error: err.message });
  }

  // 2. Query Directions API
  const { apiKey, directionsUrl } = config.googleMaps;

  if (!apiKey) {
    logger.warn('Google Maps API key not configured, using fallback');
    return getFallbackRoute(originLat, originLng, destLat, destLng);
  }

  const origin = `${originLat},${originLng}`;
  const destination = `${destLat},${destLng}`;
  const params = new URLSearchParams({
    origin,
    destination,
    key: apiKey,
    mode: 'driving',
    region: 'in',
    departure_time: 'now',
  });

  if (waypoints && waypoints.length > 0) {
    const wp = waypoints.map(w => `${w.lat},${w.lng}`).join('|');
    params.set('waypoints', wp);
  }

  const url = `${directionsUrl}?${params.toString()}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    const data = await response.json();

    if (data.status === 'ZERO_RESULTS') {
      throw new Error('ZERO_RESULTS');
    }

    if (data.status !== 'OK' || !data.routes?.length) {
      throw new Error(data.error_message || data.status || 'Directions API failed');
    }

    const route = data.routes[0];
    let distanceMeters = 0;
    let durationSeconds = 0;
    let durationInTrafficSeconds = 0;

    for (const leg of route.legs) {
      distanceMeters += leg.distance?.value || 0;
      durationSeconds += leg.duration?.value || 0;
      durationInTrafficSeconds += leg.duration_in_traffic?.value || leg.duration?.value || 0;
    }

    const distance_km = distanceMeters / 1000;
    const duration_min = Math.ceil(durationSeconds / 60);
    const duration_in_traffic_min = Math.ceil(durationInTrafficSeconds / 60);
    const congestion_ratio = durationSeconds > 0 ? (durationInTrafficSeconds / durationSeconds) : 1.0;
    const polyline = route.overview_polyline?.points || '';

    const result = {
      distance_km,
      duration_min,
      duration_in_traffic_min,
      polyline,
      congestion_ratio,
      route_source: 'google',
    };

    // Record route congestion ratio in Redis for the zone
    try {
      const zoneResult = await prisma.$queryRaw`
        SELECT id FROM zones
        WHERE is_active = true
          AND ST_Contains(polygon, ST_SetSRID(ST_MakePoint(${Number(originLng)}, ${Number(originLat)}), 4326))
        LIMIT 1
      `;
      const zoneId = zoneResult[0]?.id;
      if (zoneId) {
        const nowMs = Date.now();
        await redis.zadd(`rido:congestion:${zoneId}`, nowMs, `${congestion_ratio}:${nowMs}`);
        await redis.zremrangebyscore(`rido:congestion:${zoneId}`, '-inf', nowMs - 600000);
      }
    } catch (zoneErr) {
      logger.warn('Failed to record route congestion in Redis', { error: zoneErr.message });
    }

    // Cache the result
    try {
      await redis.set(`route:logical:${cacheKey}`, JSON.stringify(result), 'EX', 180); // 3 mins
      await redis.set(`route:stale:${cacheKey}`, JSON.stringify(result), 'EX', 86400); // 24 hours
    } catch (cacheErr) {
      logger.warn('Failed to cache route in Redis', { error: cacheErr.message });
    }

    return result;
  } catch (err) {
    if (err.message === 'ZERO_RESULTS') {
      throw err; // Don't use fallback for zero results
    }

    logger.warn('Google Directions API failed/timeout, trying stale cache or fallback', { error: err.message });

    // 3. Stale cache fallback
    try {
      const stale = await redis.get(`route:stale:${cacheKey}`);
      if (stale) {
        const parsed = JSON.parse(stale);
        parsed.route_source = 'stale';
        return parsed;
      }
    } catch (staleErr) {
      logger.warn('Failed to read from Redis stale cache', { error: staleErr.message });
    }

    // 4. Hard fallback
    return getFallbackRoute(originLat, originLng, destLat, destLng);
  }
}

async function getMultiStopRoute({ stops, finalDestination }) {
  const { apiKey, directionsUrl } = config.googleMaps;

  if (!apiKey || !stops || stops.length === 0) {
    logger.warn('Google Maps API key not configured or stops empty for multi-stop route, using fallback');
    return getMultiStopFallbackRoute(stops, finalDestination);
  }

  const origin = `${stops[0].lat},${stops[0].lng}`;
  const destination = `${finalDestination.lat},${finalDestination.lng}`;
  const params = new URLSearchParams({
    origin,
    destination,
    key: apiKey,
    mode: 'driving',
    region: 'in',
    departure_time: 'now',
  });

  if (stops.length > 1) {
    const wp = stops.slice(1).map(s => `${s.lat},${s.lng}`).join('|');
    params.set('waypoints', `optimize:true|${wp}`);
  }

  const url = `${directionsUrl}?${params.toString()}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    const data = await response.json();

    if (data.status === 'ZERO_RESULTS') {
      throw new Error('ZERO_RESULTS');
    }

    if (data.status !== 'OK' || !data.routes?.length) {
      throw new Error(data.error_message || data.status || 'Directions API failed');
    }

    const route = data.routes[0];
    let distanceMeters = 0;
    let durationSeconds = 0;
    let durationInTrafficSeconds = 0;
    const legs = [];

    for (const leg of route.legs) {
      distanceMeters += leg.distance?.value || 0;
      durationSeconds += leg.duration?.value || 0;
      const legTraffic = leg.duration_in_traffic?.value || leg.duration?.value || 0;
      durationInTrafficSeconds += legTraffic;

      legs.push({
        distance_km: leg.distance.value / 1000,
        duration_min: Math.ceil(leg.duration.value / 60),
        duration_in_traffic_min: Math.ceil(legTraffic / 60),
      });
    }

    return {
      distance_km: distanceMeters / 1000,
      duration_min: Math.ceil(durationSeconds / 60),
      duration_in_traffic_min: Math.ceil(durationInTrafficSeconds / 60),
      polyline: route.overview_polyline?.points || '',
      congestion_ratio: durationSeconds > 0 ? (durationInTrafficSeconds / durationSeconds) : 1.0,
      waypoint_order: route.waypoint_order || [], // waypoint index in stops.slice(1)
      legs,
      route_source: 'google',
    };
  } catch (err) {
    if (err.message === 'ZERO_RESULTS') {
      throw err;
    }
    logger.warn('Google Directions multi-stop API failed/timeout, using fallback', { error: err.message });
    return getMultiStopFallbackRoute(stops, finalDestination);
  }
}

function getFallbackRoute(originLat, originLng, destLat, destLng) {
  const dist = haversineDistanceKm(Number(originLat), Number(originLng), Number(destLat), Number(destLng));
  const distance_km = dist * 1.3;
  const duration_min = Math.ceil(distance_km * 3); // 20 km/h avg speed -> 3 mins per km
  return {
    distance_km,
    duration_min,
    duration_in_traffic_min: duration_min,
    polyline: '',
    congestion_ratio: 1.0,
    route_source: 'fallback',
  };
}

function getMultiStopFallbackRoute(stops, finalDestination) {
  const allStops = [...stops, finalDestination];
  let distance_km = 0;
  const legs = [];

  for (let i = 1; i < allStops.length; i++) {
    const d = haversineDistanceKm(
      Number(allStops[i - 1].lat),
      Number(allStops[i - 1].lng),
      Number(allStops[i].lat),
      Number(allStops[i].lng)
    ) * 1.3;
    distance_km += d;
    const legMin = Math.ceil(d * 3);
    legs.push({
      distance_km: d,
      duration_min: legMin,
      duration_in_traffic_min: legMin,
    });
  }

  const duration_min = Math.ceil(distance_km * 3);
  // Default waypoint order is sequential order of stops.slice(1)
  const waypoint_order = stops.slice(1).map((_, idx) => idx);

  return {
    distance_km,
    duration_min,
    duration_in_traffic_min: duration_min,
    polyline: '',
    congestion_ratio: 1.0,
    waypoint_order,
    legs,
    route_source: 'fallback',
  };
}

module.exports = {
  getRoute,
  getMultiStopRoute,
};
