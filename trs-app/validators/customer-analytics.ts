import { z } from "zod";
export const customerAnalyticsQuerySchema=z.object({days:z.coerce.number().int().min(7).max(730).default(90),cohortMonths:z.coerce.number().int().min(3).max(24).default(12)});
export const customerAnalyticsRebuildSchema=z.object({days:z.number().int().min(7).max(730).default(365),cohortMonths:z.number().int().min(3).max(24).default(12),source:z.enum(["manual","scheduled","script"]).default("manual")});
