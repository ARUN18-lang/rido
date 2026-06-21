const { z } = require('zod');

const createRideSchema = z.object({
  pickup_lat: z.number(),
  pickup_lng: z.number(),
  pickup_address: z.string().min(1),
  drop_lat: z.number(),
  drop_lng: z.number(),
  drop_address: z.string().min(1),
  vehicle_type: z.enum(['AUTO', 'MINI_CAR', 'SEDAN', 'SUV', 'TEMPO']),
  mode: z.enum(['SOLO', 'SHARED']).default('SOLO'),
  ride_type: z.enum(['STANDARD', 'WOMEN_ONLY']).default('STANDARD'),
});

const cancelRideSchema = z.object({
  reason: z.string().optional(),
});

module.exports = { createRideSchema, cancelRideSchema };
