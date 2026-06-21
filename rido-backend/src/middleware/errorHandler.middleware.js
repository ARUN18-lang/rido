const Sentry = require('@sentry/node');
const config = require('../config');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

if (config.sentryDsn) {
  Sentry.init({ dsn: config.sentryDsn, environment: config.env });
}

function errorHandler(err, req, res, next) {
  if (config.sentryDsn) {
    Sentry.captureException(err);
  }

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Internal server error';

  logger.error('Request error', {
    method: req.method,
    path: req.path,
    statusCode,
    code,
    message: err.message,
    userId: req.user?.id,
    stack: config.isProduction ? undefined : err.stack,
  });

  const response = {
    success: false,
    error: { code, message },
  };

  if (err.details) {
    response.error.details = err.details;
  }

  if (!config.isProduction && err.stack && statusCode === 500) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
}

module.exports = { errorHandler, notFoundHandler, Sentry };
