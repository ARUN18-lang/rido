const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const prisma = require('./utils/prisma');
const { closeRedis } = require('./config/redis');
const { closeQueues } = require('./queues');
const { startWorkers, stopWorkers } = require('./workers');
const { setupTrackingSockets } = require('./modules/tracking/tracking.socket');

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: config.corsOrigins, credentials: true },
});

setupTrackingSockets(io);
app.set('io', io);

async function start() {
  startWorkers();

  server.listen(config.port, () => {
    logger.info(`Rido backend running on port ${config.port}`, { env: config.env });
  });
}

async function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);

  server.close(async () => {
    try {
      await stopWorkers();
      await closeQueues();
      await closeRedis();
      await prisma.$disconnect();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error('Shutdown error', { error: err.message });
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});

start().catch((err) => {
  logger.error('Failed to start server', { error: err.message });
  process.exit(1);
});

module.exports = { server, io };
