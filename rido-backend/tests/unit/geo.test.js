const {
  haversineDistanceKm,
  bearing,
  bearingDifference,
  decodePolyline,
  computeRouteOverlap,
} = require('../../src/utils/geo');

describe('geo utilities', () => {
  describe('haversineDistanceKm', () => {
    it('calculates distance between two points', () => {
      const dist = haversineDistanceKm(9.9252, 78.1198, 9.9312, 78.1560);
      expect(dist).toBeGreaterThan(3);
      expect(dist).toBeLessThan(6);
    });

    it('returns 0 for same point', () => {
      expect(haversineDistanceKm(9.9252, 78.1198, 9.9252, 78.1198)).toBe(0);
    });
  });

  describe('bearing', () => {
    it('calculates bearing between points', () => {
      const b = bearing(9.9252, 78.1198, 9.9312, 78.1560);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(360);
    });
  });

  describe('bearingDifference', () => {
    it('returns small difference for similar bearings', () => {
      expect(bearingDifference(90, 95)).toBe(5);
    });

    it('handles wrap-around', () => {
      expect(bearingDifference(350, 10)).toBe(20);
    });
  });

  describe('decodePolyline', () => {
    it('decodes Google encoded polyline', () => {
      const points = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
      expect(points.length).toBeGreaterThan(1);
      expect(points[0]).toHaveProperty('lat');
      expect(points[0]).toHaveProperty('lng');
    });

    it('returns empty array for null input', () => {
      expect(decodePolyline(null)).toEqual([]);
    });
  });

  describe('computeRouteOverlap', () => {
    it('returns 0 for empty polylines', () => {
      expect(computeRouteOverlap('', '')).toBe(0);
    });
  });
});
