const { computeSurgeForZone, getSurgeMultiplier } = require('../../src/modules/surge/surge.service');
const { fetchWeatherSeverity } = require('../../src/modules/surge/weather.service');
const prisma = require('../../src/utils/prisma');
const { getRedis } = require('../../src/config/redis');

jest.mock('../../src/utils/prisma', () => ({
  zone: {
    findUnique: jest.fn(),
  },
  eventBoostConfig: {
    findMany: jest.fn(),
  },
  vehicleFareConfig: {
    findMany: jest.fn(),
  },
  surgeZoneSnapshot: {
    create: jest.fn(),
  },
  $queryRaw: jest.fn(),
}));

jest.mock('../../src/config/redis', () => {
  const mRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    zrange: jest.fn(),
    zremrangebyscore: jest.fn(),
    zadd: jest.fn(),
  };
  return {
    getRedis: () => mRedis,
  };
});

jest.mock('../../src/modules/surge/weather.service', () => ({
  fetchWeatherSeverity: jest.fn(),
}));

describe('surge.service', () => {
  const mRedis = getRedis();

  const getQueryString = (query) => {
    if (Array.isArray(query)) return query.join('');
    if (query && typeof query === 'object' && query.text) return query.text;
    if (typeof query === 'string') return query;
    return '';
  };

  const mockZone = {
    id: 'zone-1',
    name: 'Madurai Central',
    is_active: true,
  };

  const mockConfigs = [
    { vehicle_type: 'AUTO', max_surge_multiplier: 1.8 },
    { vehicle_type: 'SEDAN', max_surge_multiplier: 2.2 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SURGE_ACTIVATION_THRESHOLD = '0.15';
    process.env.SURGE_EMA_SMOOTHING_FACTOR = '0.3';
    process.env.SURGE_WEIGHT_DEMAND_SUPPLY = '0.45';
    process.env.SURGE_WEIGHT_WEATHER = '0.20';
    process.env.SURGE_WEIGHT_TRAFFIC = '0.20';
    process.env.SURGE_WEIGHT_EVENT = '0.15';

    prisma.zone.findUnique.mockResolvedValue(mockZone);
    prisma.vehicleFareConfig.findMany.mockResolvedValue(mockConfigs);
    prisma.eventBoostConfig.findMany.mockResolvedValue([]);
    fetchWeatherSeverity.mockResolvedValue(0.0);
    mRedis.zrange.mockResolvedValue([]);
    mRedis.get.mockResolvedValue(null);

    // Mock queryRaw defaults
    prisma.$queryRaw.mockImplementation(async (query) => {
      const qStr = getQueryString(query);
      if (qStr.includes('ST_Centroid')) {
        return [{ lat: 9.92, lng: 78.11 }];
      }
      if (qStr.includes('rides r')) {
        // demand count: default 0
        return [{ count: 0 }];
      }
      if (qStr.includes('drivers d')) {
        // supply count: default 0
        return [{ count: 0 }];
      }
      return [];
    });
  });

  describe('computeSurgeForZone', () => {
    it('forces surge to 1.0 if zone has no active indicators (below threshold)', async () => {
      await computeSurgeForZone('zone-1');

      // Check snapshot created with multiplier 1.0
      expect(prisma.surgeZoneSnapshot.create).toHaveBeenCalled();
      const calls = prisma.surgeZoneSnapshot.create.mock.calls;
      const autoSnapshot = calls.find(c => c[0].data.vehicle_type === 'AUTO')[0].data;
      expect(Number(autoSnapshot.surge_multiplier)).toBe(1.0);
    });

    it('activates surge when threshold is crossed', async () => {
      // 1. Set demand high, supply low
      // demand count = 10, supply count = 2 -> ratio = 5
      // ratioScore = (5 - 1) / 3 = 1.33 -> clamped to 1.0
      // W1 * ratioScore = 0.45 * 1.0 = 0.45 (above activation threshold 0.15)
      prisma.$queryRaw.mockImplementation(async (query) => {
        const qStr = getQueryString(query);
        if (qStr.includes('ST_Centroid')) return [{ lat: 9.92, lng: 78.11 }];
        if (qStr.includes('rides r')) return [{ count: 10 }];
        if (qStr.includes('drivers d')) return [{ count: 2 }];
        return [];
      });
      mRedis.zrange.mockResolvedValue(['driver-1', 'driver-2']);

      await computeSurgeForZone('zone-1');

      // Auto max_surge = 1.8. Computed: 1.0 + 0.45 * (1.8 - 1) = 1.36 -> rounded to 1.35
      const calls = prisma.surgeZoneSnapshot.create.mock.calls;
      const autoSnapshot = calls.find(c => c[0].data.vehicle_type === 'AUTO')[0].data;
      expect(Number(autoSnapshot.surge_multiplier)).toBe(1.35);
    });

    it('handles zero-driver edge case safely', async () => {
      // demand = 5, supply = 0 -> ratio = 5 / max(0, 1) = 5
      prisma.$queryRaw.mockImplementation(async (query) => {
        const qStr = getQueryString(query);
        if (qStr.includes('ST_Centroid')) return [{ lat: 9.92, lng: 78.11 }];
        if (qStr.includes('rides r')) return [{ count: 5 }];
        if (qStr.includes('drivers d')) return [{ count: 0 }];
        return [];
      });
      mRedis.zrange.mockResolvedValue([]);

      await computeSurgeForZone('zone-1');

      // Should still compute and write snapshots successfully
      expect(prisma.surgeZoneSnapshot.create).toHaveBeenCalled();
      const calls = prisma.surgeZoneSnapshot.create.mock.calls;
      const autoSnapshot = calls.find(c => c[0].data.vehicle_type === 'AUTO')[0].data;
      expect(Number(autoSnapshot.surge_multiplier)).toBeGreaterThanOrEqual(1.0);
    });

    it('takes MAX not SUM of overlapping event boosts, and applies decay curves', async () => {
      // Mock two active events:
      // Event 1: starts_at = past, ends_at = future, peak = 0.5 (active)
      // Event 2: starts_at = past, ends_at = past, decay = 60 mins, peak = 0.8 (decaying)
      const now = Date.now();
      const events = [
        {
          id: 'event-1',
          zone_id: 'zone-1',
          event_name: 'IPL Match',
          boost_peak_value: 0.5,
          starts_at: new Date(now - 30 * 60 * 1000),
          ends_at: new Date(now + 60 * 60 * 1000),
          decay_minutes: 30,
          is_active: true,
        },
        {
          id: 'event-2',
          zone_id: 'zone-1',
          event_name: 'Concert',
          boost_peak_value: 0.8,
          starts_at: new Date(now - 120 * 60 * 1000),
          ends_at: new Date(now - 30 * 60 * 1000), // ended 30 mins ago
          decay_minutes: 60, // 50% decay (30 mins elapsed of 60 mins) -> value should be 0.4
          is_active: true,
        },
      ];
      prisma.eventBoostConfig.findMany.mockResolvedValue(events);

      // Max of Event 1 (0.5) and Event 2 (0.4 decaying) is 0.5.
      // Let's assert that the final computed event boost score is exactly 0.5 (not 0.9 or 0.4).
      await computeSurgeForZone('zone-1');

      const calls = prisma.surgeZoneSnapshot.create.mock.calls;
      const autoSnapshot = calls.find(c => c[0].data.vehicle_type === 'AUTO')[0].data;
      expect(Number(autoSnapshot.event_boost)).toBe(0.5);
    });

    it('applies EMA smoothing to prevent jitter', async () => {
      // Set weights so that demand-supply ratio is 100% of the score
      process.env.SURGE_WEIGHT_DEMAND_SUPPLY = '1.0';
      process.env.SURGE_WEIGHT_WEATHER = '0.0';
      process.env.SURGE_WEIGHT_TRAFFIC = '0.0';
      process.env.SURGE_WEIGHT_EVENT = '0.0';

      // Computed multiplier = 1.8, previous multiplier in Redis = 1.0
      // EMA = 0.7 * 1.0 + 0.3 * 1.8 = 0.7 + 0.54 = 1.24 -> rounded to nearest 0.05 is 1.25
      prisma.$queryRaw.mockImplementation(async (query) => {
        const qStr = getQueryString(query);
        if (qStr.includes('ST_Centroid')) return [{ lat: 9.92, lng: 78.11 }];
        if (qStr.includes('rides r')) return [{ count: 20 }];
        if (qStr.includes('drivers d')) return [{ count: 1 }];
        return [];
      });
      mRedis.zrange.mockResolvedValue(['driver-1']);
      mRedis.get.mockResolvedValue('1.0'); // previous multiplier

      await computeSurgeForZone('zone-1');

      const calls = prisma.surgeZoneSnapshot.create.mock.calls;
      const autoSnapshot = calls.find(c => c[0].data.vehicle_type === 'AUTO')[0].data;
      expect(Number(autoSnapshot.surge_multiplier)).toBe(1.25);
    });
  });
});
