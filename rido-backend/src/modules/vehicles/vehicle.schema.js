const { z } = require('zod');

const createVehicleSchema = z.object({
  type: z.enum(['AUTO', 'MINI_CAR', 'SEDAN', 'SUV', 'TEMPO']),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 1),
  color: z.string().min(1),
  registration_number: z.string().min(1),
  is_ac: z.boolean().optional(),
});

const updateVehicleSchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().optional(),
  color: z.string().optional(),
  is_ac: z.boolean().optional(),
});

module.exports = { createVehicleSchema, updateVehicleSchema };
