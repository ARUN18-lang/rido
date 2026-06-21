const request = require('supertest');

jest.mock('../../src/config/redis', () => {
  const redis = {
    ping: jest.fn().mockResolvedValue('PONG'),
    get: jest.fn(),
    set: jest.fn(),
    quit: jest.fn(),
    call: jest.fn(),
    geoadd: jest.fn(),
    georadius: jest.fn().mockResolvedValue([]),
    hset: jest.fn(),
    hgetall: jest.fn().mockResolvedValue({}),
  };
  return { getRedis: () => redis, closeRedis: jest.fn() };
});

jest.mock('../../src/queues', () => ({
  dispatchPoolMatch: jest.fn(),
  dispatchFindDriver: jest.fn(),
  dispatchRideTimeout: jest.fn(),
  dispatchNotification: jest.fn(),
  closeQueues: jest.fn(),
}));

jest.mock('../../src/workers', () => ({
  startWorkers: jest.fn(),
  stopWorkers: jest.fn(),
}));

const app = require('../../src/app');

describe('Rides API', () => {
  describe('POST /api/v1/rides', () => {
    it('requires authentication', async () => {
      const res = await request(app)
        .post('/api/v1/rides')
        .send({
          pickup_lat: 9.9252,
          pickup_lng: 78.1198,
          pickup_address: 'Anna Nagar',
          drop_lat: 9.9312,
          drop_lng: 78.1560,
          drop_address: 'Bypass Road',
          vehicle_type: 'AUTO',
          mode: 'SOLO',
        });

      expect(res.status).toBe(401);
    });
  });
});
