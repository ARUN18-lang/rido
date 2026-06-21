const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearing(lat1, lng1, lat2, lng2) {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function bearingDifference(b1, b2) {
  let diff = Math.abs(b1 - b2) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

function decodePolyline(encoded) {
  if (!encoded) return [];
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

function polylineLengthKm(points) {
  if (!points || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistanceKm(
      points[i - 1].lat,
      points[i - 1].lng,
      points[i].lat,
      points[i].lng
    );
  }
  return total;
}

function pointToSegmentDistanceMeters(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = lenSq !== 0 ? dot / lenSq : -1;
  let xx;
  let yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy) * 111320;
}

function nearestPointOnPolylineDistanceMeters(lat, lng, polylinePoints) {
  if (!polylinePoints || polylinePoints.length < 2) return Infinity;
  let minDist = Infinity;
  for (let i = 1; i < polylinePoints.length; i++) {
    const dist = pointToSegmentDistanceMeters(
      lng,
      lat,
      polylinePoints[i - 1].lng,
      polylinePoints[i - 1].lat,
      polylinePoints[i].lng,
      polylinePoints[i].lat
    );
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

function computeRouteOverlap(polyline1, polyline2) {
  const points1 = typeof polyline1 === 'string' ? decodePolyline(polyline1) : polyline1;
  const points2 = typeof polyline2 === 'string' ? decodePolyline(polyline2) : polyline2;

  if (!points1.length || !points2.length) return 0;

  const len1 = polylineLengthKm(points1);
  const len2 = polylineLengthKm(points2);
  const minLen = Math.min(len1, len2);
  if (minLen === 0) return 0;

  const thresholdMeters = 200;
  let overlapKm = 0;
  const step = Math.max(1, Math.floor(points1.length / 50));

  for (let i = 0; i < points1.length; i += step) {
    const p = points1[i];
    const dist = nearestPointOnPolylineDistanceMeters(p.lat, p.lng, points2);
    if (dist <= thresholdMeters) {
      const nextIdx = Math.min(i + step, points1.length - 1);
      overlapKm += haversineDistanceKm(p.lat, p.lng, points1[nextIdx].lat, points1[nextIdx].lng);
    }
  }

  return (overlapKm / minLen) * 100;
}

function geohashEncode(lat, lng, precision = 7) {
  const B32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let geohash = '';
  let bit = 0;
  let ch = 0;
  let isEven = true;

  while (geohash.length < precision) {
    if (isEven) {
      const mid = (minLng + maxLng) / 2;
      if (lng > mid) {
        ch = (ch << 1) | 1;
        minLng = mid;
      } else {
        ch = (ch << 1) | 0;
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat > mid) {
        ch = (ch << 1) | 1;
        minLat = mid;
      } else {
        ch = (ch << 1) | 0;
        maxLat = mid;
      }
    }
    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      geohash += B32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return geohash;
}

module.exports = {
  haversineDistanceKm,
  bearing,
  bearingDifference,
  decodePolyline,
  polylineLengthKm,
  nearestPointOnPolylineDistanceMeters,
  computeRouteOverlap,
  geohashEncode,
};
