import { z } from "zod";
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier.");
const lineItemSchema = z.object({
  description: z.string().trim().min(1).max(300), quantity: z.coerce.number().positive(), unitPrice: z.coerce.number().min(0), taxRate: z.coerce.number().min(0).max(100).default(0), discountAmount: z.coerce.number().min(0).default(0),
});
const documentBaseSchema = z.object({
  documentType: z.enum(["sales_invoice", "credit_note", "debit_note"]), sourceType: z.enum(["order", "receivable", "payable", "manual"]).default("manual"), sourceId: objectId.nullable().optional(), customerId: objectId.nullable().optional(), partyName: z.string().trim().min(2).max(180), partyEmail: z.string().trim().email().or(z.literal("")).default(""), partyPhone: z.string().trim().max(30).default(""), billingAddress: z.string().trim().max(1000).default(""), gstin: z.string().trim().max(20).default(""), currency: z.string().trim().length(3).default("INR"), issueDate: z.coerce.date(), dueDate: z.coerce.date(), lineItems: z.array(lineItemSchema).min(1).max(100), roundingAmount: z.coerce.number().min(-10).max(10).default(0), notes: z.string().trim().max(2000).default(""), terms: z.string().trim().max(2000).default("Payment due as stated on this document."),
});
export const financeDocumentCreateSchema = documentBaseSchema.superRefine((value, ctx) => { if (value.dueDate < value.issueDate) ctx.addIssue({ code: "custom", path: ["dueDate"], message: "Due date cannot be earlier than issue date." }); for (const [index, item] of value.lineItems.entries()) { if (item.discountAmount > item.quantity * item.unitPrice) ctx.addIssue({ code: "custom", path: ["lineItems", index, "discountAmount"], message: "Line discount exceeds line subtotal." }); } });
export const financeDocumentUpdateSchema = documentBaseSchema.partial().superRefine((value, ctx) => { if (value.issueDate && value.dueDate && value.dueDate < value.issueDate) ctx.addIssue({ code: "custom", path: ["dueDate"], message: "Due date cannot be earlier than issue date." }); });
export const receiptCreateSchema = z.object({ amount: z.coerce.number().positive(), receiptDate: z.coerce.date().default(() => new Date()), paymentMethod: z.enum(["cash", "card", "upi", "bank_transfer", "wallet", "cheque", "other"]), transactionReference: z.string().trim().max(180).default(""), notes: z.string().trim().max(1000).default("") });
export const documentActionSchema = z.object({ reason: z.string().trim().min(3).max(500) });
export const invoiceReceiptRangeSchema = z.object({ days: z.coerce.number().int().min(1).max(3650).default(30) });
export const invoiceReceiptRebuildSchema = invoiceReceiptRangeSchema.extend({ source: z.enum(["manual", "scheduled", "system"]).default("manual") });
