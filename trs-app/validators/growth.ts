import { z } from "zod";

const prize = z.object({
  label: z.string().trim().min(2).max(80),
  type: z.enum(["coins", "coupon", "try_again"]),
  value: z.number().min(0).default(0),
  couponCode: z.string().trim().max(30).default(""),
  weight: z.number().int().min(1).max(1000),
  isActive: z.boolean().default(true),
}).superRefine((value, ctx) => {
  if (value.type === "coupon" && value.couponCode.length < 3) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["couponCode"], message: "Coupon prizes require a valid coupon code." });
  }
  if (value.type === "try_again" && value.value !== 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "Try Again prizes must have a zero value." });
  }
});

export const spinWheelCampaignSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(300).default(""),
  isActive: z.boolean().default(false),
  dailySpinLimit: z.number().int().min(1).max(20),
  startsAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  prizes: z.array(prize).min(2).max(24),
}).superRefine((value, ctx) => {
  const startsAt = new Date(value.startsAt);
  const expiresAt = new Date(value.expiresAt);
  if (expiresAt <= startsAt) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["expiresAt"], message: "Expiry must be after the start date." });
  if (expiresAt.getTime() <= Date.now()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["expiresAt"], message: "Expiry must be in the future." });
  if (!value.prizes.some((item) => item.isActive)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["prizes"], message: "At least one prize segment must be active." });
});

export const referralUpdateSchema = z.object({
  status: z.enum(["signed_up", "first_order_pending", "order_completed", "rewarded", "under_review", "rejected", "expired"]),
  rejectionReason: z.string().trim().max(500).default(""),
}).superRefine((value, ctx) => {
  if (value.status === "rejected" && value.rejectionReason.length < 3) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rejectionReason"], message: "Enter a rejection reason." });
  }
});


const spinWheelCampaignIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid campaign identifier.");

export const spinWheelCampaignUpdateSchema = spinWheelCampaignSchema.safeExtend({
  id: spinWheelCampaignIdSchema,
});

export const spinWheelActivationSchema = z.object({
  id: spinWheelCampaignIdSchema,
  isActive: z.boolean(),
});

export const spinWheelDeletionSchema = z.object({
  id: spinWheelCampaignIdSchema,
});
