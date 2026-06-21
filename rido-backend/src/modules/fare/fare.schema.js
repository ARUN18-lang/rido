const { z } = require('zod');

const estimateSchema = z.object({
  pickup_lat: z.number(),
  pickup_lng: z.number(),
  drop_lat: z.number(),
  drop_lng: z.number(),
  vehicle_type: z.enum(['AUTO', 'MINI_CAR', 'SEDAN', 'SUV', 'TEMPO']),
  mode: z.enum(['SOLO', 'SHARED']).default('SOLO'),
  ride_type: z.enum(['STANDARD', 'WOMEN_ONLY']).default('STANDARD'),
});

module.exports = { estimateSchema };
