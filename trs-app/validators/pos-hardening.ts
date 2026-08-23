import { z } from "zod";
import { updateRunningOrderSchema, transferRunningOrderSchema, voidRunningItemSchema, updateTableSchema } from "@/validators/pos-operations";

const operationBase = z.object({
  operationId: z.string().trim().min(8).max(120),
  entityId: z.string().regex(/^[a-f\d]{24}$/i),
  clientCreatedAt: z.string().datetime().optional(),
});

export const offlineSyncSchema = z.object({
  deviceId: z.string().trim().min(2).max(120),
  operations: z.array(z.discriminatedUnion("operationType", [
    operationBase.extend({ operationType: z.literal("running_order.update"), payload: updateRunningOrderSchema }),
    operationBase.extend({ operationType: z.literal("running_order.transfer"), payload: transferRunningOrderSchema }),
    operationBase.extend({ operationType: z.literal("running_order.void_item"), payload: voidRunningItemSchema }),
    operationBase.extend({ operationType: z.literal("table.update"), payload: updateTableSchema }),
  ])).min(1).max(50),
});

export const receiptQuerySchema = z.object({
  format: z.enum(["a4", "thermal", "kitchen"]).default("a4"),
  download: z.enum(["true", "false"]).default("false"),
  qr: z.enum(["true", "false"]).default("false"),
});
