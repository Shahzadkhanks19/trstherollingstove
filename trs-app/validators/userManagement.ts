import { z } from "zod";

import { strongPassword } from "@/validators/auth";

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const phone = z.string().regex(/^[6-9]\d{9}$/);
const date = z.string().date().nullable().optional();

const customerProfileSchema = z.object({
  preferredName: z.string().trim().max(80).optional(),
  dateOfBirth: date,
  anniversary: date,
  dietaryNotes: z.string().trim().max(500).optional(),
  adminNotes: z.string().trim().max(1000).optional(),
  marketingWhatsAppOptIn: z.boolean().optional(),
  marketingEmailOptIn: z.boolean().optional(),
  preferredCommunicationChannel: z
    .enum(["whatsapp", "email", "phone", "none"])
    .optional(),
  source: z
    .enum(["website", "pos", "admin", "import", "other"])
    .optional(),
  tags: z
    .array(z.string().trim().min(1).max(40))
    .max(20)
    .optional(),
});

const customerUpdateBaseSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: phone.nullable().optional(),
  avatarUrl: z.url().max(500).or(z.literal("")).optional(),
  isActive: z.boolean().optional(),
  deactivationReason: z.string().trim().max(300).optional(),
  profile: customerProfileSchema.optional(),
});

export const customerUpdateSchema = customerUpdateBaseSchema.refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "Provide at least one field.",
  },
);

const customerSelfProfileSchema = customerProfileSchema.omit({
  adminNotes: true,
  source: true,
  tags: true,
});

export const customerSelfUpdateSchema = customerUpdateBaseSchema
  .omit({
    isActive: true,
    deactivationReason: true,
    profile: true,
  })
  .extend({
    profile: customerSelfProfileSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field.",
  });

export const staffCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().transform((value) => value.toLowerCase()),
  phone: phone.optional(),
  avatarUrl: z.url().max(500).or(z.literal("")).default(""),
  password: strongPassword,
  roleId: objectId,
  employeeCode: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .transform((value) => value.toUpperCase()),
  designation: z.string().trim().max(100).default(""),
  department: z
    .enum([
      "management",
      "cashier",
      "kitchen",
      "inventory",
      "operations",
      "marketing",
      "other",
    ])
    .default("other"),
  employmentType: z
    .enum(["full_time", "part_time", "contract", "intern"])
    .default("full_time"),
  joiningDate: z.string().date().optional(),
  shiftName: z.string().trim().max(80).default(""),
  emergencyContactName: z.string().trim().max(80).default(""),
  emergencyContactPhone: phone.or(z.literal("")).default(""),
  address: z.string().trim().max(500).default(""),
  notes: z.string().trim().max(1000).default(""),
});

const staffProfileSchema = z.object({
  employeeCode: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .transform((value) => value.toUpperCase())
    .optional(),
  designation: z.string().trim().max(100).optional(),
  department: z
    .enum([
      "management",
      "cashier",
      "kitchen",
      "inventory",
      "operations",
      "marketing",
      "other",
    ])
    .optional(),
  employmentType: z
    .enum(["full_time", "part_time", "contract", "intern"])
    .optional(),
  joiningDate: date,
  shiftName: z.string().trim().max(80).optional(),
  emergencyContactName: z.string().trim().max(80).optional(),
  emergencyContactPhone: phone.or(z.literal("")).optional(),
  address: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
});

const staffUpdateBaseSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: phone.nullable().optional(),
  avatarUrl: z.url().max(500).or(z.literal("")).optional(),
  roleId: objectId.optional(),
  isActive: z.boolean().optional(),
  deactivationReason: z.string().trim().max(300).optional(),
  profile: staffProfileSchema.optional(),
});

export const staffUpdateSchema = staffUpdateBaseSchema.refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "Provide at least one field.",
  },
);

const staffSelfProfileSchema = staffProfileSchema.pick({
  emergencyContactName: true,
  emergencyContactPhone: true,
  address: true,
});

export const staffSelfUpdateSchema = staffUpdateBaseSchema
  .omit({
    roleId: true,
    isActive: true,
    deactivationReason: true,
    profile: true,
  })
  .extend({
    profile: staffSelfProfileSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field.",
  });

export const bulkUserActionSchema = z.object({
  userIds: z.array(objectId).min(1).max(100),
  action: z.enum(["activate", "deactivate"]),
  reason: z.string().trim().max(300).default(""),
});
