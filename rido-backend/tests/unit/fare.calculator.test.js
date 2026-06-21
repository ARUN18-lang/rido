const {
  computeSoloFare,
  computePoolFareSplit,
  getVehicleFareConfig,
} = require('../../src/modules/fare/fare.calculator');
const prisma = require('../../src/utils/prisma');
const { ValidationError, AppError } = require('../../src/utils/errors');

jest.mock('../../src/utils/prisma', () => ({
  poolRevenueMultiplier: {
    findUnique: jest.fn(),
  },
  vehicleFareConfig: {
    findUnique: jest.fn(),
  },
}));

describe('fare.calculator', () => {
  const fareConfig = {
    id: 'config-1',
    vehicle_type: 'AUTO',
    base_fare: 30,
    per_km_rate: 12,
    per_minute_rate: 1.5,
    min_fare: 40,
    max_surge_multiplier: 1.8,
    per_stop_charge: 8,
    waiting_charge_per_min: 2,
  };

  describe('computeSoloFare', () => {
    it('calculates fare with surge', () => {
      const result = computeSoloFare({
        vehicleType: 'AUTO',
        distanceKm: 10,
        durationMin: 25,
        surgeMultiplier: 1.25,
        config: fareConfig,
      });

      // base + distance * rate + duration * rate
      // 30 + 10 * 12 + 25 * 1.5 = 30 + 120 + 37.5 = 187.5
      // 187.5 * 1.25 = 234.375 -> rounded to 234.38
      expect(result.baseFare).toBe(30);
      expect(result.distanceCharge).toBe(120);
      expect(result.timeCharge).toBe(37.5);
      expect(result.total).toBe(234.38);
    });

    it('applies minimum fare', () => {
      const result = computeSoloFare({
        vehicleType: 'AUTO',
        distanceKm: 0.1,
        durationMin: 1,
        surgeMultiplier: 1.0,
        config: fareConfig,
      });
      // 30 + 1.2 + 1.5 = 32.7 < 40 -> caps at 40
      expect(result.total).toBe(40);
    });

    it('throws ValidationError for zero or negative distance', () => {
      expect(() => {
        computeSoloFare({
          vehicleType: 'AUTO',
          distanceKm: 0,
          durationMin: 10,
          config: fareConfig,
        });
      }).toThrow(ValidationError);

      expect(() => {
        computeSoloFare({
          vehicleType: 'AUTO',
          distanceKm: -5,
          durationMin: 10,
          config: fareConfig,
        });
      }).toThrow(ValidationError);
    });

    it('throws ValidationError for negative duration', () => {
      expect(() => {
        computeSoloFare({
          vehicleType: 'AUTO',
          distanceKm: 5,
          durationMin: -2,
          config: fareConfig,
        });
      }).toThrow(ValidationError);
    });
  });

  describe('computePoolFareSplit', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      process.env.FREE_WAIT_MINUTES_PER_STOP = '2';
      process.env.ROUTE_ONLY_TOLERANCE_METERS = '150';
    });

    it('falls back to solo fare when n = 1 (single rider)', async () => {
      const passengerRides = [
        {
          rideId: 'ride-1',
          riderId: 'rider-1',
          individualDistanceKm: 10,
          individualDurationMin: 25,
          soloFareIfAlone: 187.5,
          stopSequenceIndex: 0,
          actualWaitMinutesAtPickup: 0,
        },
      ];

      const results = await computePoolFareSplit({
        vehicleType: 'AUTO',
        passengerRides,
        combinedRoute: null,
        surgeMultiplier: 1.0,
        config: fareConfig,
      });

      expect(results).toHaveLength(1);
      expect(results[0].finalFare).toBe(187.5);
      expect(results[0].revenueMultiplierApplied).toBe(1.0);
    });

    it('calculates proportional splits, stop charges, waiting charges, and capping', async () => {
      // Mock M_n for n=2
      prisma.poolRevenueMultiplier.findUnique.mockResolvedValue({
        revenue_multiplier: 1.20,
      });

      const passengerRides = [
        {
          rideId: 'ride-1', // Anchor rider
          riderId: 'rider-1',
          individualDistanceKm: 8,
          individualDurationMin: 20,
          soloFareIfAlone: 150, // Solo fare if alone
          stopSequenceIndex: 0,
          actualWaitMinutesAtPickup: 1, // Within free wait
        },
        {
          rideId: 'ride-2',
          riderId: 'rider-2',
          individualDistanceKm: 2,
          individualDurationMin: 5,
          soloFareIfAlone: 45, // Solo fare if alone
          stopSequenceIndex: 1, // Additional stop
          actualWaitMinutesAtPickup: 4, // 2 mins waiting charge (4 - 2 free)
        },
      ];

      // Anchor rider solo: base=30, dist=8*12=96, time=20*1.5=30. Total = 156.
      // Total Pool Fare = 156 * 1.20 = 187.20
      // Proportional split: Total distance = 10km.
      // Rider 1 share = 8/10 = 80% -> 187.20 * 0.8 = 149.76. Stop charge = 0. Wait charge = 0. Total = 149.76.
      // Rider 2 share = 2/10 = 20% -> 187.20 * 0.2 = 37.44. Stop charge = 8. Wait charge = 4 (2 mins * 2/min). Total = 49.44.
      // Rider 2 solo cap is 45. So Rider 2 is capped to 45.

      const results = await computePoolFareSplit({
        vehicleType: 'AUTO',
        passengerRides,
        combinedRoute: null,
        surgeMultiplier: 1.0,
        config: fareConfig,
      });

      expect(results).toHaveLength(2);

      const r1 = results.find(r => r.rideId === 'ride-1');
      const r2 = results.find(r => r.rideId === 'ride-2');

      expect(r1.finalFare).toBe(149.76);
      expect(r1.wasCappedToSolo).toBe(false);

      expect(r2.finalFare).toBe(45.00); // capped at soloFareIfAlone
      expect(r2.wasCappedToSolo).toBe(true);
      expect(r2.stopCharge).toBe(8.00);
      expect(r2.waitingCharge).toBe(4.00);
    });

    it('throws AppError if revenue multiplier is missing', async () => {
      prisma.poolRevenueMultiplier.findUnique.mockResolvedValue(null);

      const passengerRides = [
        { rideId: 'r-1', riderId: 'rider-1', individualDistanceKm: 10, individualDurationMin: 20 },
        { rideId: 'r-2', riderId: 'rider-2', individualDistanceKm: 5, individualDurationMin: 10 },
      ];

      await expect(
        computePoolFareSplit({
          vehicleType: 'AUTO',
          passengerRides,
          combinedRoute: null,
          config: fareConfig,
        })
      ).rejects.toThrow(AppError);
    });

    it('throws ValidationError if a rider is off-route beyond tolerance', async () => {
      prisma.poolRevenueMultiplier.findUnique.mockResolvedValue({
        revenue_multiplier: 1.20,
      });

      const passengerRides = [
        {
          rideId: 'ride-1',
          riderId: 'rider-1',
          individualDistanceKm: 8,
          individualDurationMin: 20,
          pickupLat: 9.9250,
          pickupLng: 78.1190,
        },
        {
          rideId: 'ride-2',
          riderId: 'rider-2',
          individualDistanceKm: 2,
          individualDurationMin: 5,
          pickupLat: 10.5000, // Very far away (off-route)
          pickupLng: 78.8000,
        },
      ];

      // Polyline with points around Madurai (9.92, 78.11)
      const combinedRoute = {
        polyline: 'qj~jK{tvwNs@wA', // simple encoded polyline
      };

      await expect(
        computePoolFareSplit({
          vehicleType: 'AUTO',
          passengerRides,
          combinedRoute,
          config: fareConfig,
        })
      ).rejects.toThrow(ValidationError);
    });
  });
});
