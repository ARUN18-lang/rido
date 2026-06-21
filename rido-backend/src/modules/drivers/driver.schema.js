const { z } = require('zod');

const registerDriverSchema = z.object({
  is_women_ride_enabled: z.boolean().optional(),
});

const updateDriverSchema = z.object({
  is_women_ride_enabled: z.boolean().optional(),
});

const driverStatusSchema = z.object({
  status: z.enum(['ONLINE', 'OFFLINE']),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

const documentSchema = z.object({
  document_type: z.enum(['AADHAAR', 'DRIVING_LICENSE', 'VEHICLE_RC', 'VEHICLE_INSURANCE', 'PROFILE_PHOTO']),
});

const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  period: z.enum(['daily', 'weekly', 'monthly']).optional(),
});

module.exports = {
  registerDriverSchema,
  updateDriverSchema,
  driverStatusSchema,
  documentSchema,
  paginationSchema,
};
