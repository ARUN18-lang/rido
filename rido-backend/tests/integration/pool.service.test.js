const {
  FARE_CONFIG,
  COMBINED_ROUTE,
  createRide,
  createPool,
  createCandidateEntry,
  candidateRedisHash,
  SHARED_POLYLINE,
} = require('../helpers/pool.fixtures');

const mockRelease = jest.fn().mockResolvedValue(undefined);
let lockHeld = false;

const mockAcquire = jest.fn().mockImplementation(async () => {
  if (lockHeld) {
    throw new Error('Resource locked');
  }
  lockHeld = true;
  return {
    release: mockRelease.mockImplementation(async () => {
      lockHeld = false;
    }),
  };
});

jest.mock('redlock', () => jest.fn().mockImplementation(() => ({ acquire: mockAcquire })));

const redisHashStore = {};

const mockRedis = {
  hgetall: jest.fn((key) => Promise.resolve({ ...redisHashStore[key] })),
  hdel: jest.fn((key, field) => {
    if (redisHashStore[key]) delete redisHashStore[key][field];
    return Promise.resolve(1);
  }),
  hset: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

jest.mock('../../src/config/redis', () => ({
  getRedis: () => mockRedis,
  closeRedis: jest.fn(),
}));

jest.mock('../../src/config/maps', () => ({
  getDirections: jest.fn().mockResolvedValue({
    polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
    distanceKm: 8,
    durationMinutes: 22,
    fallback: false,
  }),
}));

jest.mock('../../src/queues', () => ({
  dispatchFindDriver: jest.fn().mockResolvedValue({}),
  dispatchNotification: jest.fn().mockResolvedValue({}),
  dispatchPoolMatch: jest.fn(),
}));

const mockPrisma = {
  ride: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
    count: jest.fn(),
  },
  ridePool: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  },
  poolFareAllocation: {
    upsert: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
  poolRevenueMultiplier: {
    findUnique: jest.fn().mockResolvedValue({ revenue_multiplier: 1.20 }),
  },
  ridePoolFareBreakdown: {
    upsert: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
  driver: {
    update: jest.fn().mockResolvedValue({}),
  },
  vehicleFareConfig: {
    findUnique: jest.fn().mockResolvedValue({
      vehicle_type: 'AUTO',
      base_fare: 30,
      per_km_rate: 12,
      per_minute_rate: 1.5,
      min_fare: 40,
      cancellation_fee: 20,
      shared_discount_percent: 25,
      driver_shared_bonus_percent: 5,
    }),
  },
  $transaction: jest.fn(async (arg) => {
    if (typeof arg === 'function') return arg(mockPrisma);
    return Promise.all(arg);
  }),
};

jest.mock('../../src/utils/prisma', () => mockPrisma);

jest.mock('../../src/utils/fare.calculator', () => {
  const actual = jest.requireActual('../../src/utils/fare.calculator');
  return {
    ...actual,
    getFareConfig: jest.fn().mockResolvedValue({
      vehicle_type: 'AUTO',
      base_fare: 30,
      per_km_rate: 12,
      per_minute_rate: 1.5,
      min_fare: 40,
      cancellation_fee: 20,
      shared_discount_percent: 25,
      driver_shared_bonus_percent: 5,
    }),
    computeSharedFareSplit: jest.fn((...args) => actual.computeSharedFareSplit(...args)),
  };
});

jest.mock('../../src/modules/fare/fare.calculator', () => {
  const actual = jest.requireActual('../../src/modules/fare/fare.calculator');
  return {
    ...actual,
    getVehicleFareConfig: jest.fn().mockResolvedValue({
      vehicle_type: 'AUTO',
      base_fare: 30,
      per_km_rate: 12,
      per_minute_rate: 1.5,
      min_fare: 40,
      cancellation_fee: 20,
      shared_discount_percent: 25,
      driver_shared_bonus_percent: 5,
      per_stop_charge: 8,
      waiting_charge_per_min: 2,
    }),
    computeSoloFare: jest.fn((...args) => actual.computeSoloFare(...args)),
    computePoolFareSplit: jest.fn(({ passengerRides, surgeMultiplier }) => {
      return passengerRides.map((pr, index) => ({
        rideId: pr.rideId,
        riderId: pr.riderId,
        soloBaseFare: 30,
        surgeMultiplier: surgeMultiplier || 1.0,
        revenueMultiplierApplied: 1.2,
        totalPoolFare: 100,
        rawPerRiderShare: 50,
        stopCharge: index > 0 ? 8 : 0,
        waitingCharge: 0,
        finalFare: 45,
        wasCappedToSolo: false,
      }));
    }),
  };
});

const { dispatchFindDriver, dispatchNotification } = require('../../src/queues');
const { getDirections } = require('../../src/config/maps');
const { getFareConfig, computeSharedFareSplit } = require('../../src/utils/fare.calculator');
const { computePoolFareSplit } = require('../../src/modules/fare/fare.calculator');
const mockFareConfig = {
  vehicle_type: 'AUTO',
  base_fare: 30,
  per_km_rate: 12,
  per_minute_rate: 1.5,
  min_fare: 40,
  cancellation_fee: 20,
  shared_discount_percent: 25,
  driver_shared_bonus_percent: 5,
};
const config = require('../../src/config');

let poolService;

function setWaitingCandidates(vehicleType, rideType, candidates) {
  const key = config.redisKeys.poolWaiting(vehicleType, rideType);
  redisHashStore[key] = candidateRedisHash(candidates);
}

function setupRideLookup(primaryRide, poolRides = null) {
  const rides = poolRides || [primaryRide];
  mockPrisma.ride.findUnique.mockImplementation(({ where }) => {
    if (where.id === primaryRide.id) return Promise.resolve(primaryRide);
    const found = rides.find((r) => r.id === where.id);
    return Promise.resolve(found || null);
  });
  mockPrisma.ride.findMany.mockImplementation(({ where }) => {
    if (where.pool_id) {
      return Promise.resolve(rides.filter((r) => r.pool_id === where.pool_id));
    }
    if (where.id?.in) {
      return Promise.resolve(rides.filter((r) => where.id.in.includes(r.id)));
    }
    return Promise.resolve(rides);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  lockHeld = false;
  Object.keys(redisHashStore).forEach((k) => delete redisHashStore[k]);

  mockAcquire.mockImplementation(async () => {
    if (lockHeld) throw new Error('Resource locked');
    lockHeld = true;
    return {
      release: jest.fn().mockImplementation(async () => {
        lockHeld = false;
      }),
    };
  });

  computeSharedFareSplit.mockImplementation((...args) => {
    const actual = jest.requireActual('../../src/utils/fare.calculator');
    return actual.computeSharedFareSplit(...args);
  });

  computePoolFareSplit.mockImplementation(({ passengerRides, surgeMultiplier }) => {
    return passengerRides.map((pr, index) => ({
      rideId: pr.rideId,
      riderId: pr.riderId,
      soloBaseFare: 30,
      surgeMultiplier: surgeMultiplier || 1.0,
      revenueMultiplierApplied: 1.2,
      totalPoolFare: 100,
      rawPerRiderShare: 50,
      stopCharge: index > 0 ? 8 : 0,
      waitingCharge: 0,
      finalFare: 45,
      wasCappedToSolo: false,
    }));
  });

  getDirections.mockReset();
  getDirections.mockResolvedValue(COMBINED_ROUTE);
  getFareConfig.mockResolvedValue(mockFareConfig);

  jest.isolateModules(() => {
    poolService = require('../../src/modules/pooling/pool.service');
  });
});

describe('pool.service integration', () => {
  describe('findPoolMatch', () => {
    describe('guard conditions', () => {
      it('returns lock_busy when Redlock cannot acquire mutex (concurrent pool-match jobs)', async () => {
        lockHeld = true;

        const result = await poolService.findPoolMatch('ride-1');

        expect(result).toEqual({ matched: false, reason: 'lock_busy' });
        expect(mockPrisma.ride.findUnique).not.toHaveBeenCalled();
      });

      it('returns invalid_ride_state when ride is missing', async () => {
        mockPrisma.ride.findUnique.mockResolvedValue(null);

        const result = await poolService.findPoolMatch('missing-ride');

        expect(result).toEqual({ matched: false, reason: 'invalid_ride_state' });
      });

      it('returns invalid_ride_state when ride is not in POOL_MATCHING status', async () => {
        const ride = createRide({ status: 'SEARCHING' });
        mockPrisma.ride.findUnique.mockResolvedValue(ride);

        const result = await poolService.findPoolMatch(ride.id);

        expect(result).toEqual({ matched: false, reason: 'invalid_ride_state' });
      });

      it('converts to solo when the 5-minute pool window has expired', async () => {
        const ride = createRide({
          created_at: new Date(Date.now() - (config.poolMatchWindowSeconds + 10) * 1000),
        });
        mockPrisma.ride.findUnique.mockResolvedValue(ride);
        mockPrisma.ride.update.mockResolvedValue({ ...ride, mode: 'SOLO', status: 'SEARCHING' });
        mockPrisma.ride.count.mockResolvedValue(0);

        const result = await poolService.findPoolMatch(ride.id);

        expect(result).toEqual({ matched: false, converted_to_solo: true });
        expect(mockPrisma.ride.update).toHaveBeenCalledWith({
          where: { id: ride.id },
          data: { mode: 'SOLO', status: 'SEARCHING' },
        });
        expect(dispatchNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: ride.rider_id,
            templateKey: 'RIDE_CONVERTED_SOLO',
          })
        );
        expect(dispatchFindDriver).toHaveBeenCalledWith(ride.id);
      });

      it('returns no_pool when ride has no associated pool record', async () => {
        const ride = createRide({ pool: null, pool_id: null });
        mockPrisma.ride.findUnique.mockResolvedValue(ride);
        mockPrisma.ridePool.findFirst.mockResolvedValue(null);
        setWaitingCandidates('AUTO', 'STANDARD', [createCandidateEntry()]);

        const result = await poolService.findPoolMatch(ride.id);

        expect(result).toEqual({ matched: false, reason: 'no_pool' });
      });

      it('returns pool_full when max_passengers has been reached', async () => {
        const ride = createRide({
          pool: createPool({ current_passenger_count: 3, max_passengers: 3 }),
        });
        setupRideLookup(ride);
        setWaitingCandidates('AUTO', 'STANDARD', [createCandidateEntry()]);

        const result = await poolService.findPoolMatch(ride.id);

        expect(result).toEqual({ matched: false, reason: 'pool_full' });
      });
    });

    describe('candidate filtering', () => {
      let primaryRide;

      beforeEach(() => {
        primaryRide = createRide();
        setupRideLookup(primaryRide);
      });

      it('returns no_candidates when the Redis waiting hash is empty', async () => {
        setWaitingCandidates('AUTO', 'STANDARD', []);

        const result = await poolService.findPoolMatch(primaryRide.id);

        expect(result).toEqual({ matched: false, reason: 'no_candidates' });
      });

      it('rejects candidates whose pickup is outside the 3 KM radius', async () => {
        setWaitingCandidates('AUTO', 'STANDARD', [
          createCandidateEntry({ pickup_lat: 10.05, pickup_lng: 78.5 }),
        ]);

        const result = await poolService.findPoolMatch(primaryRide.id);

        expect(result).toEqual({ matched: false, reason: 'no_candidates' });
      });

      it('rejects candidates created outside the 5-minute time window', async () => {
        setWaitingCandidates('AUTO', 'STANDARD', [
          createCandidateEntry({
            created_at: new Date(Date.now() - (config.poolMatchWindowSeconds + 60) * 1000),
          }),
        ]);

        const result = await poolService.findPoolMatch(primaryRide.id);

        expect(result).toEqual({ matched: false, reason: 'no_candidates' });
      });

      it('rejects non-female candidates for WOMEN_ONLY rides', async () => {
        const womenRide = createRide({ type: 'WOMEN_ONLY', rider: { id: 'rider-1', gender: 'FEMALE' } });
        setupRideLookup(womenRide);
        setWaitingCandidates('AUTO', 'WOMEN_ONLY', [
          createCandidateEntry({ rider_gender: 'MALE', ride_type: 'WOMEN_ONLY' }),
        ]);

        const result = await poolService.findPoolMatch(womenRide.id);

        expect(result).toEqual({ matched: false, reason: 'no_candidates' });
      });

      it('rejects candidates traveling in the opposite direction (>45° bearing deviation)', async () => {
        setWaitingCandidates('AUTO', 'STANDARD', [
          createCandidateEntry({
            pickup_lat: 9.926,
            pickup_lng: 78.1205,
            drop_lat: 9.92,
            drop_lng: 78.11,
          }),
        ]);

        const result = await poolService.findPoolMatch(primaryRide.id);

        expect(result).toEqual({ matched: false, reason: 'no_candidates' });
      });

      it('rejects candidates with route overlap below 65% threshold', async () => {
        setWaitingCandidates('AUTO', 'STANDARD', [
          createCandidateEntry({
            route_polyline: 'different_polyline_value',
          }),
        ]);

        const result = await poolService.findPoolMatch(primaryRide.id);

        expect(result).toEqual({ matched: false, reason: 'no_candidates' });
      });

      it('skips invalid JSON entries in the waiting hash without crashing', async () => {
        const key = config.redisKeys.poolWaiting('AUTO', 'STANDARD');
        redisHashStore[key] = {
          'ride-bad': 'not-valid-json{{{',
          'ride-2': JSON.stringify(createCandidateEntry()),
        };

        const candidateRide = createRide({
          id: 'ride-2',
          rider_id: 'rider-2',
          pool_id: 'pool-2',
          pool: createPool({ id: 'pool-2' }),
        });
        setupRideLookup(primaryRide, [primaryRide, candidateRide]);
        mockPrisma.ridePool.findUnique.mockResolvedValue(
          createPool({ id: 'pool-1', current_passenger_count: 2 })
        );

        const result = await poolService.findPoolMatch(primaryRide.id);

        expect(result.matched).toBe(true);
      });
    });

    describe('successful matching', () => {
      it('matches the best candidate, creates fare allocations, and notifies riders', async () => {
        const primaryRide = createRide({ id: 'ride-1', rider_id: 'rider-1' });
        const candidateRide = createRide({
          id: 'ride-2',
          rider_id: 'rider-2',
          pool_id: 'pool-1',
        });

        setupRideLookup(primaryRide, [primaryRide, candidateRide]);
        mockPrisma.ride.findMany.mockImplementation(({ where }) => {
          if (where.pool_id) {
            return Promise.resolve([primaryRide, candidateRide]);
          }
          if (where.id?.in) {
            return Promise.resolve(
              [primaryRide, candidateRide].filter((r) => where.id.in.includes(r.id))
            );
          }
          return Promise.resolve([primaryRide, candidateRide]);
        });
        setWaitingCandidates('AUTO', 'STANDARD', [
          createCandidateEntry({ rideId: 'ride-2' }),
        ]);
        mockPrisma.ridePool.findUnique.mockResolvedValue(
          createPool({ current_passenger_count: 2 })
        );

        const result = await poolService.findPoolMatch(primaryRide.id);

        expect(result).toEqual({
          matched: true,
          pool_id: 'pool-1',
          co_riders: 2,
        });
        expect(mockPrisma.poolFareAllocation.upsert).toHaveBeenCalled();
        expect(mockPrisma.ride.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'ride-2' },
            data: expect.objectContaining({ pool_id: 'pool-1' }),
          })
        );
        expect(dispatchNotification).toHaveBeenCalledTimes(2);
        expect(mockRedis.hdel).toHaveBeenCalled();
        expect(dispatchFindDriver).not.toHaveBeenCalled();
      });

      it('dispatches find-driver when pool reaches max_passengers after match', async () => {
        const primaryRide = createRide({
          pool: createPool({ current_passenger_count: 2, max_passengers: 3 }),
        });
        const candidateRide = createRide({ id: 'ride-2', rider_id: 'rider-2' });

        setupRideLookup(primaryRide, [primaryRide, candidateRide]);
        setWaitingCandidates('AUTO', 'STANDARD', [createCandidateEntry({ rideId: 'ride-2' })]);
        mockPrisma.ridePool.findUnique.mockResolvedValue(
          createPool({ current_passenger_count: 3, max_passengers: 3 })
        );

        const result = await poolService.findPoolMatch(primaryRide.id);

        expect(result.matched).toBe(true);
        expect(dispatchFindDriver).toHaveBeenCalledWith(primaryRide.id, 'pool-1');
      });

      it('prefers higher overlap_percent, then closer pickup distance', async () => {
        const primaryRide = createRide();
        setupRideLookup(primaryRide, [
          primaryRide,
          createRide({ id: 'ride-far', rider_id: 'rider-far' }),
          createRide({ id: 'ride-near', rider_id: 'rider-near' }),
        ]);

        setWaitingCandidates('AUTO', 'STANDARD', [
          createCandidateEntry({
            rideId: 'ride-far',
            pickup_lat: 9.928,
            pickup_lng: 78.123,
          }),
          createCandidateEntry({
            rideId: 'ride-near',
            pickup_lat: 9.9255,
            pickup_lng: 78.12,
          }),
        ]);
        mockPrisma.ridePool.findUnique.mockResolvedValue(
          createPool({ current_passenger_count: 2 })
        );

        await poolService.findPoolMatch(primaryRide.id);

        expect(mockPrisma.ride.update).toHaveBeenCalledWith(
          expect.objectContaining({ where: { id: 'ride-near' } })
        );
      });
    });

    describe('fare cap edge case', () => {
      it('rejects candidate when shared fare would exceed their solo fare', async () => {
        const primaryRide = createRide();
        setupRideLookup(primaryRide, [primaryRide, createRide({ id: 'ride-2', rider_id: 'rider-2' })]);
        setWaitingCandidates('AUTO', 'STANDARD', [createCandidateEntry({ rideId: 'ride-2' })]);

        computePoolFareSplit.mockResolvedValue([
          { rideId: 'ride-1', finalFare: 80, wasCappedToSolo: false, soloBaseFare: 30, surgeMultiplier: 1.0, revenueMultiplierApplied: 1.2, totalPoolFare: 100, rawPerRiderShare: 50, stopCharge: 0, waitingCharge: 0 },
          {
            rideId: 'ride-2',
            finalFare: 200,
            wasCappedToSolo: true,
            soloBaseFare: 30,
            surgeMultiplier: 1.0,
            revenueMultiplierApplied: 1.2,
            totalPoolFare: 100,
            rawPerRiderShare: 50,
            stopCharge: 8,
            waitingCharge: 0,
          },
        ]);

        const result = await poolService.findPoolMatch(primaryRide.id);

        expect(result).toEqual({ matched: false, reason: 'fare_exceeds_solo' });
        expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        expect(mockPrisma.ride.update).not.toHaveBeenCalledWith(
          expect.objectContaining({ where: { id: 'ride-2' } })
        );
      });

      it('keeps rejected candidate in waiting state (does not mutate pool)', async () => {
        const primaryRide = createRide();
        setupRideLookup(primaryRide, [primaryRide, createRide({ id: 'ride-2', rider_id: 'rider-2' })]);
        setWaitingCandidates('AUTO', 'STANDARD', [createCandidateEntry({ rideId: 'ride-2' })]);

        computePoolFareSplit.mockResolvedValue([
          { rideId: 'ride-1', finalFare: 80, wasCappedToSolo: false, soloBaseFare: 30, surgeMultiplier: 1.0, revenueMultiplierApplied: 1.2, totalPoolFare: 100, rawPerRiderShare: 50, stopCharge: 0, waitingCharge: 0 },
          { rideId: 'ride-2', finalFare: 200, wasCappedToSolo: true, soloBaseFare: 30, surgeMultiplier: 1.0, revenueMultiplierApplied: 1.2, totalPoolFare: 100, rawPerRiderShare: 50, stopCharge: 8, waitingCharge: 0 },
        ]);

        await poolService.findPoolMatch(primaryRide.id);

        const key = config.redisKeys.poolWaiting('AUTO', 'STANDARD');
        expect(redisHashStore[key]['ride-2']).toBeDefined();
      });
    });

    describe('concurrent pool-match jobs (Redlock)', () => {
      it('only allows one findPoolMatch to proceed when invoked in parallel', async () => {
        const primaryRide = createRide();
        let findUniqueCalls = 0;

        mockPrisma.ride.findUnique.mockImplementation(async () => {
          findUniqueCalls += 1;
          await new Promise((r) => setTimeout(r, 30));
          return primaryRide;
        });

        setWaitingCandidates('AUTO', 'STANDARD', []);

        const [first, second] = await Promise.all([
          poolService.findPoolMatch(primaryRide.id),
          poolService.findPoolMatch(primaryRide.id),
        ]);

        const outcomes = [first, second];
        expect(outcomes).toContainEqual({ matched: false, reason: 'lock_busy' });
        expect(outcomes).toContainEqual({ matched: false, reason: 'no_candidates' });
        expect(findUniqueCalls).toBe(1);
      });
    });

    describe('idempotent retry resilience (network error mid-match)', () => {
      it('releases lock in finally block even when getDirections throws', async () => {
        const primaryRide = createRide();
        const candidateRide = createRide({ id: 'ride-2', rider_id: 'rider-2' });
        setupRideLookup(primaryRide, [primaryRide, candidateRide]);
        setWaitingCandidates('AUTO', 'STANDARD', [createCandidateEntry({ rideId: 'ride-2' })]);
        getDirections.mockRejectedValueOnce(new Error('Network error'));

        await expect(poolService.findPoolMatch(primaryRide.id)).rejects.toThrow('Network error');
        expect(lockHeld).toBe(false);
      });

      it('allows a subsequent retry to acquire the lock after a failed attempt', async () => {
        const primaryRide = createRide();
        const candidateRide = createRide({ id: 'ride-2', rider_id: 'rider-2', pool_id: 'pool-1' });
        setupRideLookup(primaryRide, [primaryRide, candidateRide]);
        setWaitingCandidates('AUTO', 'STANDARD', [createCandidateEntry({ rideId: 'ride-2' })]);
        mockPrisma.ridePool.findUnique.mockResolvedValue(
          createPool({ current_passenger_count: 2 })
        );

        getDirections.mockRejectedValueOnce(new Error('Network error'));
        await expect(poolService.findPoolMatch(primaryRide.id)).rejects.toThrow('Network error');

        getDirections.mockResolvedValue(COMBINED_ROUTE);
        const retry = await poolService.findPoolMatch(primaryRide.id);
        expect(retry.matched).toBe(true);
      });
    });
  });

  describe('convertToSolo', () => {
    it('removes ride from Redis waiting hash and switches mode to SOLO', async () => {
      const ride = createRide();
      setWaitingCandidates('AUTO', 'STANDARD', [createCandidateEntry({ rideId: ride.id })]);
      mockPrisma.ride.update.mockResolvedValue({ ...ride, mode: 'SOLO' });
      mockPrisma.ride.count.mockResolvedValue(0);

      const result = await poolService.convertToSolo(ride);

      expect(result).toEqual({ matched: false, converted_to_solo: true });
      expect(mockRedis.hdel).toHaveBeenCalledWith(
        config.redisKeys.poolWaiting('AUTO', 'STANDARD'),
        ride.id
      );
      expect(mockPrisma.ride.update).toHaveBeenCalledWith({
        where: { id: ride.id },
        data: { mode: 'SOLO', status: 'SEARCHING' },
      });
      expect(dispatchFindDriver).toHaveBeenCalledWith(ride.id);
      expect(dispatchNotification).toHaveBeenCalledWith(
        expect.objectContaining({ templateKey: 'RIDE_CONVERTED_SOLO' })
      );
    });

    it('cancels the pool when no other active riders remain', async () => {
      const ride = createRide({ pool_id: 'pool-1' });
      mockPrisma.ride.count.mockResolvedValue(0);

      await poolService.convertToSolo(ride);

      expect(mockPrisma.ridePool.update).toHaveBeenCalledWith({
        where: { id: 'pool-1' },
        data: { status: 'CANCELLED' },
      });
    });
  });

  describe('handlePoolRiderCancel', () => {
    it('recomputes fare splits and notifies remaining riders when one co-rider cancels', async () => {
      const pool = createPool({ current_passenger_count: 3 });
      const rides = [
        createRide({ id: 'ride-1', rider_id: 'rider-1', pool_id: pool.id, status: 'CANCELLED' }),
        createRide({ id: 'ride-2', rider_id: 'rider-2', pool_id: pool.id }),
        createRide({ id: 'ride-3', rider_id: 'rider-3', pool_id: pool.id }),
      ];

      mockPrisma.ridePool.findUnique.mockResolvedValue({
        ...pool,
        rides,
        allocations: [],
      });

      await poolService.handlePoolRiderCancel('ride-1', pool.id);

      expect(mockPrisma.poolFareAllocation.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.ridePool.update).toHaveBeenCalledWith({
        where: { id: pool.id },
        data: { current_passenger_count: 2 },
      });
      expect(dispatchNotification).toHaveBeenCalledTimes(2);
      expect(getDirections).toHaveBeenCalled();
    });

    it('converts to solo fare when only one rider remains after cancellation', async () => {
      const pool = createPool({ current_passenger_count: 2 });
      const remaining = createRide({ id: 'ride-2', rider_id: 'rider-2', pool_id: pool.id });
      const cancelled = createRide({ id: 'ride-1', rider_id: 'rider-1', pool_id: pool.id, status: 'CANCELLED' });

      mockPrisma.ridePool.findUnique.mockResolvedValue({
        ...pool,
        rides: [cancelled, remaining],
        allocations: [],
      });

      await poolService.handlePoolRiderCancel('ride-1', pool.id);

      expect(mockPrisma.ride.update).toHaveBeenCalledWith({
        where: { id: 'ride-2' },
        data: expect.objectContaining({
          mode: 'SOLO',
          pool_id: null,
        }),
      });
      expect(mockPrisma.ridePool.update).toHaveBeenCalledWith({
        where: { id: pool.id },
        data: { status: 'CANCELLED' },
      });
      expect(mockPrisma.poolFareAllocation.deleteMany).toHaveBeenCalledWith({
        where: { pool_id: pool.id },
      });
      expect(dispatchNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'rider-2',
          push: expect.objectContaining({ title: 'Fare Updated' }),
        })
      );
    });

    it('cancels pool and releases driver when all riders have cancelled', async () => {
      const pool = createPool({ driver_id: 'driver-1', current_passenger_count: 2 });
      const rides = [
        createRide({ id: 'ride-1', status: 'CANCELLED', pool_id: pool.id }),
        createRide({ id: 'ride-2', status: 'CANCELLED', pool_id: pool.id }),
      ];

      mockPrisma.ridePool.findUnique.mockResolvedValue({ ...pool, rides, allocations: [] });

      await poolService.handlePoolRiderCancel('ride-2', pool.id);

      expect(mockPrisma.ridePool.update).toHaveBeenCalledWith({
        where: { id: pool.id },
        data: { status: 'CANCELLED' },
      });
      expect(mockPrisma.driver.update).toHaveBeenCalledWith({
        where: { id: 'driver-1' },
        data: { status: 'ONLINE' },
      });
    });

    it('returns early when pool record does not exist', async () => {
      mockPrisma.ridePool.findUnique.mockResolvedValue(null);

      await poolService.handlePoolRiderCancel('ride-1', 'missing-pool');

      expect(mockPrisma.ride.update).not.toHaveBeenCalled();
      expect(dispatchNotification).not.toHaveBeenCalled();
    });
  });

  describe('prompt edge cases delegated to other modules', () => {
    it('documents that driver-decline re-assignment lives in ride.worker', () => {
      expect(typeof require('../../src/workers/ride.worker').findAndAssignDriver).toBe('function');
    });
  });
});
