const { z } = require('zod');

const poolStatusSchema = z.object({
  rideId: z.string().uuid(),
});

module.exports = { poolStatusSchema };
