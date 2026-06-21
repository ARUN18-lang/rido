const request = require('supertest');

jest.mock('../../src/utils/otp', () => ({
  generateOtp: () => '123456',
  hashOtp: jest.fn().mockResolvedValue('hashed'),
  verifyOtpHash: jest.fn().mockResolvedValue(true),
  checkOtpLockout: jest.fn(),
  incrementOtpAttempts: jest.fn(),
  clearOtpAttempts: jest.fn(),
  checkOtpSendRateLimit: jest.fn(),
  sendOtpSms: jest.fn().mockResolvedValue({ sent: true }),
  OTP_EXPIRY_MINUTES: 10,
  MAX_OTP_ATTEMPTS: 5,
}));

jest.mock('../../src/config/redis', () => {
  const store = new Map();
  const redis = {
    get: jest.fn((k) => Promise.resolve(store.get(k) || null)),
    set: jest.fn((k, v) => { store.set(k, v); return Promise.resolve('OK'); }),
    incr: jest.fn((k) => { store.set(k, (parseInt(store.get(k) || '0', 10) + 1).toString()); return Promise.resolve(parseInt(store.get(k), 10)); }),
    expire: jest.fn().mockResolvedValue(1),
    del: jest.fn((k) => { store.delete(k); return Promise.resolve(1); }),
    ping: jest.fn().mockResolvedValue('PONG'),
    call: jest.fn(),
    quit: jest.fn(),
    geoadd: jest.fn(),
    georadius: jest.fn().mockResolvedValue([]),
    zrem: jest.fn(),
    hset: jest.fn(),
    hgetall: jest.fn().mockResolvedValue({}),
    hdel: jest.fn(),
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
  stopWorkers: jest.fn().mockResolvedValue(),
}));

const prisma = require('../../src/utils/prisma');
const app = require('../../src/app');

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/send-otp', () => {
    it('validates phone number', async () => {
      const res = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone: 'invalid', purpose: 'LOGIN' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /health', () => {
    it('returns health status', async () => {
      jest.spyOn(prisma, '$queryRaw').mockResolvedValue([{ '?column?': 1 }]);

      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('timestamp');
    });
  });
});
