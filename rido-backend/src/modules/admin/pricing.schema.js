const { z } = require('zod');

const updateVehicleConfigSchema = z.object({
  base_fare: z.number().nonnegative().optional(),
  per_km_rate: z.number().nonnegative().optional(),
  per_minute_rate: z.number().nonnegative().optional(),
  per_min_rate: z.number().nonnegative().optional(), // alias to match per_minute_rate
  min_fare: z.number().nonnegative().optional(),
  max_surge_multiplier: z.number().min(1.0).optional(),
  per_stop_charge: z.number().nonnegative().optional(),
  waiting_charge_per_min: z.number().nonnegative().optional(),
});

const revenueMultiplierSchema = z.object({
  vehicle_type: z.enum(['BIKE_TAXI', 'AUTO', 'MINI_CAR', 'SEDAN', 'SUV', 'TEMPO']),
  passenger_count: z.number().int().min(1),
  revenue_multiplier: z.number().min(1.0),
});

const createEventSchema = z.object({
  zone_id: z.string().uuid(),
  event_name: z.string().min(1),
  event_type: z.enum(['SPORTS', 'CONCERT', 'FESTIVAL', 'RELIGIOUS', 'OTHER']),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  boost_peak_value: z.number().min(0.0).max(1.0),
  decay_minutes: z.number().int().nonnegative(),
});

const updateEventSchema = z.object({
  ends_at: z.string().datetime().optional(),
  decay_minutes: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),
});

const simulateSchema = z.object({
  vehicle_type: z.enum(['BIKE_TAXI', 'AUTO', 'MINI_CAR', 'SEDAN', 'SUV', 'TEMPO']),
  distance_km: z.coerce.number().positive(),
  duration_min: z.coerce.number().nonnegative(),
  passenger_count: z.coerce.number().int().min(1),
  surge_multiplier: z.coerce.number().min(1.0).default(1.0),
});

module.exports = {
  updateVehicleConfigSchema,
  revenueMultiplierSchema,
  createEventSchema,
  updateEventSchema,
  simulateSchema,
};
