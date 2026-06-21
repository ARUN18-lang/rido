const { z } = require('zod');

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  preferred_language: z.enum(['en', 'ta']).optional(),
  fcm_token: z.string().optional().nullable(),
});

const emergencyContactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().regex(/^\+?[6-9]\d{9}$/),
  is_primary: z.boolean().optional(),
});

const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

module.exports = { updateProfileSchema, emergencyContactSchema, paginationSchema };
