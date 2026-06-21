require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  isProduction: process.env.NODE_ENV === 'production',

  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    oldAccessSecret: process.env.JWT_OLD_ACCESS_SECRET || null,
    oldRefreshSecret: process.env.JWT_OLD_REFRESH_SECRET || null,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',
  },

  msg91: {
    apiKey: process.env.MSG91_API_KEY,
    senderId: process.env.MSG91_SENDER_ID || 'RIDO',
    otpTemplateId: process.env.MSG91_OTP_TEMPLATE_ID,
  },

  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
    directionsUrl: process.env.GOOGLE_MAPS_DIRECTIONS_URL,
    distanceMatrixUrl: process.env.GOOGLE_MAPS_DISTANCE_MATRIX_URL,
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-south-1',
    s3Bucket: process.env.AWS_S3_BUCKET,
  },

  sentryDsn: process.env.SENTRY_DSN,
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map((o) => o.trim()),

  platformCommissionPercent: parseFloat(process.env.PLATFORM_COMMISSION_PERCENT || '10'),
  poolMatchWindowSeconds: parseInt(process.env.POOL_MATCH_WINDOW_SECONDS || '300', 10),
  poolMatchRadiusKm: parseFloat(process.env.POOL_MATCH_RADIUS_KM || '3'),
  poolRouteOverlapThreshold: parseFloat(process.env.POOL_ROUTE_OVERLAP_THRESHOLD || '65'),
  driverSearchRadiusKm: parseFloat(process.env.DRIVER_SEARCH_RADIUS_KM || '5'),
  driverAcceptTimeoutSeconds: parseInt(process.env.DRIVER_ACCEPT_TIMEOUT_SECONDS || '20', 10),
  rideCancelFreeWindowMinutes: parseInt(process.env.RIDE_CANCEL_FREE_WINDOW_MINUTES || '2', 10),
  routeDeviationThresholdMeters: parseFloat(process.env.ROUTE_DEVIATION_THRESHOLD_METERS || '500'),
  rideSearchTimeoutMinutes: parseInt(process.env.RIDE_SEARCH_TIMEOUT_MINUTES || '15', 10),

  redisKeys: {
    driversOnline: 'rido:drivers:online',
    poolWaiting: (vehicleType, rideType) => `rido:pool:waiting:${vehicleType}:${rideType}`,
    offer: (rideId, driverId) => `rido:offer:${rideId}:${driverId}`,
    location: (driverId) => `rido:location:${driverId}`,
    otpAttempts: (phone) => `rido:otp:attempts:${phone}`,
    otpLock: (phone) => `rido:otp:lock:${phone}`,
    poolLock: (rideId) => `rido:lock:pool:${rideId}`,
    surgeCache: (zoneId) => `rido:surge:cache:${zoneId}`,
    otpSendCount: (phone) => `rido:otp:send:${phone}`,
    routeCache: (key) => `rido:route:cache:${key}`,
    idempotency: (key) => `rido:idempotency:${key}`,
    driverAccept: (rideId, driverId) => `rido:driver:accept:${rideId}:${driverId}`,
    driverDecline: (rideId, driverId) => `rido:driver:decline:${rideId}:${driverId}`,
    driverLastDbUpdate: (driverId) => `rido:driver:db-location:${driverId}`,
    routeDeviation: (rideId) => `rido:route:deviation:${rideId}`,
    locationStale: (rideId) => `rido:location:stale:${rideId}`,
  },

  queueNames: {
    poolMatch: 'rido-pool-match',
    findDriver: 'rido-find-driver',
    notifications: 'rido-notifications',
    paymentRetry: 'rido-payment-retry',
    rideTimeout: 'rido-ride-timeout',
  },
};

module.exports = config;
