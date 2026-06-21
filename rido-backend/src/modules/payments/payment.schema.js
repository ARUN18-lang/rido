const { z } = require('zod');

const initiatePaymentSchema = z.object({
  ride_id: z.string().uuid(),
  method: z.enum(['UPI', 'CASH', 'WALLET', 'CARD']),
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

const cashConfirmSchema = z.object({
  collected: z.boolean().default(true),
});

const refundSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
});

module.exports = { initiatePaymentSchema, verifyPaymentSchema, cashConfirmSchema, refundSchema };
