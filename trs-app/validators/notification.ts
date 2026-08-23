import { z } from "zod";

const channelSchema = z.object({
  inApp: z.boolean(),
  email: z.boolean(),
  whatsapp: z.boolean(),
});

export const updateNotificationPreferencesSchema = z.object({
  transactional: channelSchema.optional(),
  reservations: channelSchema.optional(),
  rewards: channelSchema.optional(),
  promotions: channelSchema.optional(),
});

export const createBroadcastSchema = z.object({
  title: z.string().trim().min(2).max(160),
  message: z.string().trim().min(2).max(1200),
  type: z
    .enum([
      "system",
      "order",
      "payment",
      "reservation",
      "reward",
      "promotion",
      "security",
    ])
    .default("system"),
  actionUrl: z.string().trim().max(500).default(""),
  roleKeys: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  userIds: z
    .array(z.string().regex(/^[a-f\d]{24}$/i, "Invalid user ID."))
    .max(500)
    .default([]),
  channels: z
    .array(z.enum(["in_app", "email", "whatsapp"]))
    .min(1)
    .default(["in_app"]),
  expiresAt: z.iso.datetime().nullable().default(null),
});
