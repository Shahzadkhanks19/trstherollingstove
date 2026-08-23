import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid ID.");

export const createKitchenStationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/),
  description: z.string().trim().max(500).default(""),
  colorLabel: z.string().trim().max(30).default(""),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  targetPreparationMinutes: z
    .number()
    .int()
    .min(1)
    .max(240)
    .default(15),
});

export const updateKitchenStationSchema =
  createKitchenStationSchema.partial();

const routingRuleBaseSchema = z.object({
  stationId: objectId,
  menuItemId: objectId.nullable().default(null),
  categoryId: objectId.nullable().default(null),
  priority: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const createRoutingRuleSchema =
  routingRuleBaseSchema.superRefine((value, ctx) => {
    if (!value.menuItemId && !value.categoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["menuItemId"],
        message:
          "Either menuItemId or categoryId must be provided.",
      });
    }
  });

export const updateRoutingRuleSchema =
  routingRuleBaseSchema
    .partial()
    .superRefine((value, ctx) => {
      const menuItemWasProvided =
        Object.prototype.hasOwnProperty.call(
          value,
          "menuItemId",
        );

      const categoryWasProvided =
        Object.prototype.hasOwnProperty.call(
          value,
          "categoryId",
        );

      if (
        menuItemWasProvided &&
        categoryWasProvided &&
        !value.menuItemId &&
        !value.categoryId
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["menuItemId"],
          message:
            "menuItemId and categoryId cannot both be null.",
        });
      }
    });

export const updateTicketStatusSchema = z.object({
  status: z.enum([
    "accepted",
    "preparing",
    "ready",
    "served",
    "cancelled",
  ]),
});

export const updateTicketPrioritySchema = z.object({
  priority: z.enum(["normal", "high", "urgent"]),
});

export const updateTicketItemStatusSchema = z.object({
  status: z.enum([
    "accepted",
    "preparing",
    "ready",
    "served",
    "cancelled",
  ]),
});