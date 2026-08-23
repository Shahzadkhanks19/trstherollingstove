import { z } from "zod";

export const internalSaleTypeSchema = z.enum([
  "staff_meal",
  "family_meal",
  "complimentary",
  "food_wastage",
  "kitchen_test",
]);

export const familyMemberSchema = z.object({
  name: z.string().trim().min(2).max(100),
  relationship: z.string().trim().max(80).default(""),
  phone: z.string().trim().max(20).default(""),
  photoUrl: z.string().trim().max(500).default(""),
  qrCode: z.string().trim().max(120).default(""),
  notes: z.string().trim().max(1000).default(""),
  isActive: z.boolean().default(true),
});

export const internalReasonSchema = z.object({
  saleType: internalSaleTypeSchema,
  name: z.string().trim().min(2).max(100),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  description: z.string().trim().max(500).default(""),
  color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).default("#C8102E"),
  icon: z.string().trim().max(80).default(""),
  requiresApproval: z.boolean().default(false),
  maximumMenuValue: z.coerce.number().min(0).max(100000).default(0),
  severity: z.enum(["low", "medium", "high", "critical"]).default("low"),
  costCenter: z.string().trim().max(100).default(""),
});

export const staffMealSettingsSchema = z.object({
  userId: z.string().trim().min(1),
  mealEligible: z.boolean(),
  dailyMealLimit: z.coerce.number().int().min(0).max(20),
  weeklyMealLimit: z.coerce.number().int().min(0).max(140).default(14),
  monthlyMealLimit: z.coerce.number().int().min(0).max(500),
  yearlyMealLimit: z.coerce.number().int().min(0).max(5000).default(720),
  unlimitedMeals: z.boolean().default(false),
  mealSuspendedUntil: z.string().datetime().nullable().optional(),
  mealSuspensionReason: z.string().trim().max(300).default(""),
  requireManagerApprovalOnLimit: z.boolean(),
});

export const internalMasterTypeSchema = z.enum(["department", "designation", "meal_category"]);
export const internalMasterSchema = z.object({
  type: internalMasterTypeSchema,
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().max(40).default(""),
  description: z.string().trim().max(500).default(""),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});

export const internalPolicySchema = z.object({
  name: z.string().trim().min(2).max(120),
  scopeType: z.enum(["global", "staff", "department", "designation"]),
  scopeId: z.string().trim().nullable().optional(),
  dailyLimit: z.coerce.number().int().min(0).max(100).default(2),
  weeklyLimit: z.coerce.number().int().min(0).max(700).default(14),
  monthlyLimit: z.coerce.number().int().min(0).max(3000).default(60),
  yearlyLimit: z.coerce.number().int().min(0).max(36500).default(720),
  unlimited: z.boolean().default(false),
  requireManagerApproval: z.boolean().default(true),
  requireOwnerApprovalAboveValue: z.coerce.number().min(0).default(0),
  allowedMealCategoryIds: z.array(z.string().trim()).default([]),
  allowedFrom: z.string().trim().max(5).default(""),
  allowedUntil: z.string().trim().max(5).default(""),
  priority: z.coerce.number().int().min(0).max(9999).default(100),
  isActive: z.boolean().default(true),
});

export const internalSettingsSchema = z.object({
  enableMealLimits: z.boolean(),
  enableManagerApproval: z.boolean(),
  enableAuditLogging: z.boolean(),
  enableEmailNotifications: z.boolean(),
  enableSmsNotifications: z.boolean(),
  allowOwnerOverride: z.boolean(),
  defaultDailyLimit: z.coerce.number().int().min(0).max(100),
  defaultMonthlyLimit: z.coerce.number().int().min(0).max(3000),
});

export const internalDirectoryTypeSchema = z.enum(["family_member", "complimentary_reason", "wastage_reason", "testing_reason"]);

export const internalDirectorySchema = z.object({
  type: internalDirectoryTypeSchema,
  name: z.string().trim().min(2).max(120),
  relationship: z.string().trim().max(80).default(""),
  phone: z.string().trim().max(20).default(""),
  notes: z.string().trim().max(1000).default(""),
  color: z.string().trim().max(20).default(""),
  icon: z.string().trim().max(80).default(""),
  category: z.string().trim().max(100).default(""),
  severity: z.enum(["low", "medium", "high", "critical"]).default("low"),
  requiresApproval: z.boolean().default(false),
  maximumValue: z.coerce.number().min(0).max(1000000).default(0),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});

export const internalApprovalDecisionSchema = z.object({
  orderId: z.string().regex(/^[a-f\d]{24}$/i),
  decision: z.enum(["approve", "reject"]),
  comments: z.string().trim().min(2).max(1000),
});
