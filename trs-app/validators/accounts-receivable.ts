import { z } from "zod";
const objectId = z.string().trim().regex(/^[a-f\d]{24}$/i);
const optionalObjectId = objectId.nullable().optional();
const money = z.number().finite().min(0).max(1_000_000_000);
export const receivableRangeSchema = z.object({ days: z.coerce.number().int().min(1).max(366).default(30) });
export const receivableRebuildSchema = z.object({ days: z.number().int().min(1).max(366).default(30), source: z.enum(["manual", "scheduled", "system"]).default("manual") });
const invoiceBaseSchema = z.object({
 customerId: optionalObjectId, customerName: z.string().trim().min(2).max(180), customerEmail: z.string().trim().email().max(254).or(z.literal("")).default(""), customerPhone: z.string().trim().max(30).default(""), orderId: optionalObjectId,
 invoiceDate: z.coerce.date().default(()=>new Date()), dueDate: z.coerce.date(), subtotal: money, taxAmount: money.default(0), discountAmount: money.default(0), creditAmount: money.default(0), paymentTerms: z.string().trim().max(500).default("Due on receipt"), referenceNumber: z.string().trim().max(120).default(""), notes: z.string().trim().max(2000).default(""), status: z.enum(["draft","issued"]).default("draft"),
});
const refineInvoice = (value: z.infer<typeof invoiceBaseSchema>, context: z.RefinementCtx) => { if(value.discountAmount + value.creditAmount > value.subtotal + value.taxAmount) context.addIssue({code:"custom",path:["discountAmount"],message:"Discount and credit cannot exceed subtotal plus tax."}); if(value.dueDate < value.invoiceDate) context.addIssue({code:"custom",path:["dueDate"],message:"Due date cannot be before invoice date."}); };
export const receivableInvoiceCreateSchema = invoiceBaseSchema.superRefine(refineInvoice);
export const receivableInvoiceUpdateSchema = invoiceBaseSchema.partial().extend({ status: z.enum(["draft","issued","cancelled"]).optional(), cancellationReason: z.string().trim().max(500).optional() });
export const receivablePaymentCreateSchema = z.object({ amount: z.number().finite().positive().max(1_000_000_000), paymentDate: z.coerce.date().default(()=>new Date()), paymentMethod: z.enum(["cash","card","upi","bank_transfer","wallet","cheque","other"]), transactionReference: z.string().trim().max(180).default(""), notes: z.string().trim().max(1000).default("") });
export const receivableWriteOffSchema = z.object({ amount: z.number().finite().positive().max(1_000_000_000), reason: z.string().trim().min(3).max(500) });
