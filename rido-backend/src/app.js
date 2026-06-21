const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler.middleware');
const { apiLimiter } = require('./middleware/rateLimit.middleware');
const prisma = require('./utils/prisma');
const { getRedis } = require('./config/redis');

const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const driverRoutes = require('./modules/drivers/driver.routes');
const vehicleRoutes = require('./modules/vehicles/vehicle.routes');
const fareRoutes = require('./modules/fare/fare.routes');
const rideRoutes = require('./modules/rides/ride.routes');
const poolRoutes = require('./modules/pooling/pool.routes');
const paymentController = require('./modules/payments/payment.controller');
const paymentRoutes = require('./modules/payments/payment.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const pricingRoutes = require('./modules/admin/pricing.routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));

morgan.token('user_id', (req) => req.user?.id || '-');
app.use(
  morgan(':method :url :status :response-time ms user=:user_id', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  })
);

app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), paymentController.webhook);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/', apiLimiter);

app.get('/health', async (req, res) => {
  let db = 'ok';
  let redis = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = 'error';
  }
  try {
    await getRedis().ping();
  } catch {
    redis = 'error';
  }
  const status = db === 'ok' && redis === 'ok' ? 'ok' : 'degraded';
  res.status(status === 'ok' ? 200 : 503).json({
    status,
    db,
    redis,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/drivers', driverRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/fare', fareRoutes);
app.use('/api/v1/rides', rideRoutes);
app.use('/api/v1/pools', poolRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/admin/pricing', pricingRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
