import { z } from "zod";

export const internalConsumptionFinancialsQuerySchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "From date must use YYYY-MM-DD."),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "To date must use YYYY-MM-DD."),
    format: z.enum(["json", "csv", "xlsx", "pdf"]).default("json"),
  })
  .superRefine((value, context) => {
    const from = new Date(`${value.from}T00:00:00.000+05:30`);
    const to = new Date(`${value.to}T23:59:59.999+05:30`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return;
    if (from > to) {
      context.addIssue({ code: "custom", path: ["to"], message: "To date must be on or after from date." });
      return;
    }
    const days = Math.ceil((to.getTime() - from.getTime()) / 86_400_000) + 1;
    if (days > 366) {
      context.addIssue({ code: "custom", path: ["to"], message: "Financial reports support a maximum range of 366 days." });
    }
  });
