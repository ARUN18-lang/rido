const {
  haversineDistanceKm,
  bearing,
  bearingDifference,
  computeRouteOverlap
} = require('../../src/utils/geo');

describe('Madurai Pooling Geometry Matching Logic', () => {
  // Config parameters
  const POOL_MATCH_RADIUS_KM = 3.0;
  const BEARING_DEVIATION_LIMIT_DEGREES = 45.0;
  const ROUTE_OVERLAP_THRESHOLD_PERCENT = 65.0;

  // 1. Route A (Anna Nagar to Goripalayam - Spine Route)
  const routeA = {
    pickup: { lat: 9.9216, lng: 78.1402 },
    drop: { lat: 9.9324, lng: 78.1345 },
    points: [
      { lat: 9.9216, lng: 78.1402 }, // Anna Nagar
      { lat: 9.9270, lng: 78.1375 }, // Melur Road Middle
      { lat: 9.9324, lng: 78.1345 }  // Goripalayam
    ]
  };

  // 2. Route B (KK Nagar to Goripalayam - Overlapping Candidate)
  const routeB = {
    pickup: { lat: 9.9268, lng: 78.1385 },
    drop: { lat: 9.9324, lng: 78.1345 },
    points: [
      { lat: 9.9268, lng: 78.1385 }, // KK Nagar west
      { lat: 9.9270, lng: 78.1375 }, // Melur Road Middle
      { lat: 9.9324, lng: 78.1345 }  // Goripalayam
    ]
  };

  // 3. Route C (Simmakkal to Goripalayam - Non-overlapping pickup too far or different heading direction)
  const routeC = {
    pickup: { lat: 9.9221, lng: 78.1214 },
    drop: { lat: 9.9324, lng: 78.1345 },
    points: [
      { lat: 9.9221, lng: 78.1214 }, // Simmakkal
      { lat: 9.9324, lng: 78.1345 }  // Goripalayam
    ]
  };

  // 4. Route D (Mattuthavani to Tirupparankundram - Totally opposite/non-overlapping)
  const routeD = {
    pickup: { lat: 9.9405, lng: 78.1505 },
    drop: { lat: 9.8821, lng: 78.0718 },
    points: [
      { lat: 9.9405, lng: 78.1505 },
      { lat: 9.9110, lng: 78.1110 },
      { lat: 9.8821, lng: 78.0718 }
    ]
  };

  // 5. Route E (Anna Nagar to Goripalayam - Identical to Route A)
  const routeE = {
    pickup: { lat: 9.9216, lng: 78.1402 },
    drop: { lat: 9.9324, lng: 78.1345 },
    points: [
      { lat: 9.9216, lng: 78.1402 },
      { lat: 9.9270, lng: 78.1375 },
      { lat: 9.9324, lng: 78.1345 }
    ]
  };

  // 6. Route F (Horizontal Candidate Route for boundary testing)
  const routeF = {
    pickup: { lat: 9.9270, lng: 78.1375 - 0.05 },
    drop: { lat: 9.9270, lng: 78.1375 + 0.05 },
    points: [
      { lat: 9.9270, lng: 78.1375 - 0.05 },
      { lat: 9.9270, lng: 78.1375 },
      { lat: 9.9270, lng: 78.1375 + 0.05 }
    ]
  };

  // 7. Route G1 (Vertical Spine Route - Just above 65.0% overlap with Route F)
  const routeG1 = {
    pickup: { lat: 9.9270 - 0.0035, lng: 78.1375 },
    drop: { lat: 9.9270 + 0.00651, lng: 78.1375 },
    points: [
      { lat: 9.9270 - 0.0035, lng: 78.1375 },
      { lat: 9.9270, lng: 78.1375 },
      { lat: 9.9270 + 0.00651, lng: 78.1375 }
    ]
  };

  // 8. Route G2 (Vertical Spine Route - Just below 65.0% overlap with Route F)
  const routeG2 = {
    pickup: { lat: 9.9270 - 0.0035, lng: 78.1375 },
    drop: { lat: 9.9270 + 0.00650, lng: 78.1375 },
    points: [
      { lat: 9.9270 - 0.0035, lng: 78.1375 },
      { lat: 9.9270, lng: 78.1375 },
      { lat: 9.9270 + 0.00650, lng: 78.1375 }
    ]
  };

  // Helper to check matching conditions
  function evaluatePoolMatch(primary, candidate) {
    const dist = haversineDistanceKm(primary.pickup.lat, primary.pickup.lng, candidate.pickup.lat, candidate.pickup.lng);
    const bPrimary = bearing(primary.pickup.lat, primary.pickup.lng, primary.drop.lat, primary.drop.lng);
    const bCandidate = bearing(candidate.pickup.lat, candidate.pickup.lng, candidate.drop.lat, candidate.drop.lng);
    const bDiff = bearingDifference(bPrimary, bCandidate);
    const overlap = computeRouteOverlap(primary.points, candidate.points);

    return {
      distancePassed: dist <= POOL_MATCH_RADIUS_KM,
      bearingPassed: bDiff <= BEARING_DEVIATION_LIMIT_DEGREES,
      overlapPassed: overlap >= ROUTE_OVERLAP_THRESHOLD_PERCENT,
      matched: dist <= POOL_MATCH_RADIUS_KM && bDiff <= BEARING_DEVIATION_LIMIT_DEGREES && overlap >= ROUTE_OVERLAP_THRESHOLD_PERCENT,
      details: { dist, bDiff, overlap }
    };
  }

  it('correctly accepts genuinely overlapping candidate (Route B) onto spine (Route A)', () => {
    const result = evaluatePoolMatch(routeA, routeB);
    expect(result.distancePassed).toBe(true);
    expect(result.bearingPassed).toBe(true);
    expect(result.overlapPassed).toBe(true);
    expect(result.matched).toBe(true);
  });

  it('correctly rejects candidate with bad bearing and low overlap (Route C) ending at same place', () => {
    const result = evaluatePoolMatch(routeA, routeC);
    expect(result.bearingPassed).toBe(false);
    expect(result.overlapPassed).toBe(false);
    expect(result.matched).toBe(false);
  });

  it('correctly rejects completely opposite route (Route D)', () => {
    const result = evaluatePoolMatch(routeA, routeD);
    expect(result.bearingPassed).toBe(false);
    expect(result.overlapPassed).toBe(false);
    expect(result.matched).toBe(false);
  });

  it('correctly accepts an identical route (Route E) with 100% overlap', () => {
    const result = evaluatePoolMatch(routeA, routeE);
    expect(result.distancePassed).toBe(true);
    expect(result.bearingPassed).toBe(true);
    expect(result.overlapPassed).toBe(true);
    expect(result.matched).toBe(true);
    expect(result.details.overlap).toBe(100.0);
  });

  it('correctly accepts candidate just above the 65.0% overlap threshold (Route G1)', () => {
    const result = evaluatePoolMatch(routeG1, routeF);
    expect(result.details.overlap).toBeGreaterThanOrEqual(65.00);
    expect(result.overlapPassed).toBe(true);
  });

  it('correctly rejects candidate just below the 65.0% overlap threshold (Route G2)', () => {
    const result = evaluatePoolMatch(routeG2, routeF);
    expect(result.details.overlap).toBeLessThan(65.00);
    expect(result.overlapPassed).toBe(false);
  });
});
