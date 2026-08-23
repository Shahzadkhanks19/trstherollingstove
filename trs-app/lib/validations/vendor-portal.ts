import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid MongoDB id.");

export const vendorProfileSchema = z.object({
  supplierId: objectIdSchema,
  legalName: z.string().trim().min(2).max(180),
  displayName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(8).max(20),
  gstin: z.string().trim().max(20).default(""),
  pan: z.string().trim().max(20).default(""),
  isPortalEnabled: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

const quoteLineSchema = z.object({
  purchaseRequestLineId: z.string().trim().optional(),
  inventoryItemId: objectIdSchema.nullable().optional(),
  description: z.string().trim().min(1).max(300),
  quantity: z.coerce.number().positive(),
  unit: z.string().trim().min(1).max(40),
  unitPrice: z.coerce.number().nonnegative(),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  leadTimeDays: z.coerce.number().int().nonnegative().default(0),
});

export const createVendorQuoteSchema = z.object({
  purchaseRequestId: objectIdSchema.nullable().optional(),
  purchaseOrderId: objectIdSchema.nullable().optional(),
  validUntil: z.coerce.date().nullable().optional(),
  currency: z.string().trim().length(3).default("INR"),
  lines: z.array(quoteLineSchema).min(1),
  deliveryTerms: z.string().trim().max(1000).default(""),
  paymentTerms: z.string().trim().max(1000).default(""),
  notes: z.string().trim().max(2000).default(""),
});

export const vendorQuoteActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("submit") }),
  z.object({ action: z.literal("withdraw") }),
  z.object({ action: z.literal("accept") }),
  z.object({ action: z.literal("reject") }),
]);

export const submitVendorInvoiceSchema = z.object({
  purchaseOrderId: objectIdSchema.nullable().optional(),
  invoiceNumber: z.string().trim().min(1).max(100),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date().nullable().optional(),
  currency: z.string().trim().length(3).default("INR"),
  subtotal: z.coerce.number().nonnegative(),
  taxTotal: z.coerce.number().nonnegative().default(0),
  grandTotal: z.coerce.number().nonnegative(),
  documentUrl: z.string().trim().url(),
  originalFilename: z.string().trim().min(1).max(255),
  notes: z.string().trim().max(2000).default(""),
});
