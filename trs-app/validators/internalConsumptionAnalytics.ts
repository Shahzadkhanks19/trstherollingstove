import { z } from "zod";

export const internalConsumptionAnalyticsQuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
  saleType: z.enum([
    "all",
    "staff_meal",
    "family_meal",
    "complimentary",
    "food_wastage",
    "kitchen_test",
  ]).default("all"),
  format: z.enum(["json", "csv", "xlsx", "pdf"]).default("json"),
}).refine((value) => new Date(value.from) <= new Date(value.to), {
  message: "The start date must be before or equal to the end date.",
  path: ["to"],
});

export type InternalConsumptionAnalyticsQuery = z.infer<typeof internalConsumptionAnalyticsQuerySchema>;
