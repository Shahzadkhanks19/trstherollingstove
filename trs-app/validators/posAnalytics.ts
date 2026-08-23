import { z } from "zod";

export const posAnalyticsQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  orderMode: z.enum(["all", "dine_in", "takeaway"]).default("all"),
  saleType: z.enum(["all", "customer", "staff_meal", "family_meal", "complimentary", "food_wastage", "kitchen_test"]).default("all"),
});
