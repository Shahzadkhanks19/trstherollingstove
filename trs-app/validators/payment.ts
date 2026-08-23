import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier.");

export const createPaymentOrderSchema = z.object({
  orderId: objectId,
});

export const verifyPaymentSchema = z.object({
  orderId: objectId,
  razorpayOrderId: z.string().trim().min(5).max(100),
  razorpayPaymentId: z.string().trim().min(5).max(100),
  razorpaySignature: z.string().trim().min(20).max(500),
});

export const refundPaymentSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().trim().min(3).max(300).default("Admin initiated refund."),
});

export const failPaymentSchema = z.object({
  orderId: objectId,
  razorpayOrderId: z.string().trim().min(5).max(100),
  code: z.string().trim().max(200).optional(),
  description: z.string().trim().max(500).optional(),
  reason: z.string().trim().max(500).optional(),
});
