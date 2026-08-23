
import {z} from "zod";
export const alertRuleSchema=z.object({
 name:z.string().min(2),
 type:z.enum(["low_stock","reorder","near_expiry","expired","overstock","negative_stock","slow_moving","dead_stock"]),
 threshold:z.number().nonnegative().optional(),
 enabled:z.boolean().default(true)
});
export const reportRequestSchema=z.object({
 reportType:z.enum(["valuation","consumption","cogs","expiry","abc_analysis","supplier_performance","stock_ledger"]),
 format:z.enum(["xlsx","csv","pdf"]).default("xlsx")
});
