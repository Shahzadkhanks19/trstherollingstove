import { z } from "zod";

const executiveSaleTypeSchema = z.enum([
  "all",
  "staff_meal",
  "family_meal",
  "complimentary",
  "food_wastage",
  "kitchen_test",
]);

export const internalConsumptionExecutiveQuerySchema = z
  .object({
    from: z.string().date(),
    to: z.string().date(),
    saleType: executiveSaleTypeSchema.default("all"),
  })
  .superRefine((value, context) => {
    const from = new Date(`${value.from}T00:00:00.000Z`);
    const to = new Date(`${value.to}T00:00:00.000Z`);

    if (from > to) {
      context.addIssue({
        code: "custom",
        message: "The start date must be before or equal to the end date.",
        path: ["to"],
      });
      return;
    }

    const days = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
    if (days > 366) {
      context.addIssue({
        code: "custom",
        message: "Executive dashboard ranges cannot exceed 366 days.",
        path: ["to"],
      });
    }
  });

export type InternalConsumptionExecutiveQuery = z.infer<
  typeof internalConsumptionExecutiveQuerySchema
>;
