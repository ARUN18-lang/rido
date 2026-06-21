const config = require('./index');
const logger = require('../utils/logger');
const { haversineDistanceKm } = require('../utils/geo');

async function getDirections({ pickupLat, pickupLng, dropLat, dropLng, waypoints = [] }) {
  const { apiKey, directionsUrl } = config.googleMaps;

  if (!apiKey) {
    logger.warn('Google Maps API key not configured, using Haversine fallback');
    const distanceKm = haversineDistanceKm(pickupLat, pickupLng, dropLat, dropLng);
    const durationMinutes = Math.ceil((distanceKm / 25) * 60);
    return {
      polyline: null,
      distanceKm,
      durationMinutes,
      fallback: true,
    };
  }

  const origin = `${pickupLat},${pickupLng}`;
  const destination = `${dropLat},${dropLng}`;
  const params = new URLSearchParams({
    origin,
    destination,
    key: apiKey,
    mode: 'driving',
    region: 'in',
  });

  if (waypoints.length > 0) {
    const wp = waypoints.map((w) => `${w.lat},${w.lng}`).join('|');
    params.set('waypoints', `optimize:true|${wp}`);
  }

  const url = `${directionsUrl}?${params.toString()}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.routes?.length) {
      throw new Error(data.error_message || data.status || 'Directions API failed');
    }

    const route = data.routes[0];
    const leg = route.legs.reduce(
      (acc, l) => ({
        distanceMeters: acc.distanceMeters + l.distance.value,
        durationSeconds: acc.durationSeconds + l.duration.value,
      }),
      { distanceMeters: 0, durationSeconds: 0 }
    );

    return {
      polyline: route.overview_polyline.points,
      distanceKm: leg.distanceMeters / 1000,
      durationMinutes: Math.ceil(leg.durationSeconds / 60),
      fallback: false,
    };
  } catch (err) {
    logger.error('Google Directions API error', { error: err.message });
    const distanceKm = haversineDistanceKm(pickupLat, pickupLng, dropLat, dropLng);
    const durationMinutes = Math.ceil((distanceKm / 25) * 60);
    return {
      polyline: null,
      distanceKm,
      durationMinutes,
      fallback: true,
    };
  }
}

async function getDistanceMatrix(origins, destinations) {
  const { apiKey, distanceMatrixUrl } = config.googleMaps;
  if (!apiKey) return null;

  const params = new URLSearchParams({
    origins: origins.map((o) => `${o.lat},${o.lng}`).join('|'),
    destinations: destinations.map((d) => `${d.lat},${d.lng}`).join('|'),
    key: apiKey,
    mode: 'driving',
  });

  const response = await fetch(`${distanceMatrixUrl}?${params.toString()}`);
  const data = await response.json();
  return data;
}

module.exports = { getDirections, getDistanceMatrix };
