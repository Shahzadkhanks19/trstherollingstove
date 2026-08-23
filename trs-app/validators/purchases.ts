import { z } from "zod";

const indianWhatsappNumber = /^(?:\+91)?[6-9]\d{9}$/;

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid ID.");

export const createSupplierSchema = z.object({
  name: z.string().trim().min(2).max(180),
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/),
  contactPerson: z.string().trim().max(160).default(""),
  phone: z.string().trim().regex(indianWhatsappNumber, "Enter a valid 10-digit Indian WhatsApp number."),
  alternatePhone: z.union([z.string().trim().regex(indianWhatsappNumber, "Enter a valid 10-digit Indian phone number."), z.literal("")]).default(""),
  gstin: z.string().trim().max(20).default(""),
  addressLine1: z.string().trim().max(240).default(""),
  addressLine2: z.string().trim().max(240).default(""),
  city: z.string().trim().max(100).default(""),
  state: z.string().trim().max(100).default(""),
  postalCode: z.string().trim().max(20).default(""),
  paymentTermsDays: z.number().int().min(0).max(365).default(0),
  creditLimit: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
  notes: z.string().trim().max(1500).default(""),
});

export const updateSupplierSchema =
  createSupplierSchema.partial();

const purchaseOrderItemSchema = z.object({
  inventoryItemId: objectId,
  orderedQuantity: z.number().positive().max(1000000),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: objectId,
  expectedDeliveryDate: z.coerce.date().nullable().default(null),
  fulfilmentType: z.enum(["vendor_delivery", "self_pickup"]),
  pickupPersonId: objectId.nullable().default(null),
  items: z.array(purchaseOrderItemSchema).min(1).max(200),
  notes: z.string().trim().max(1500).default(""),
}).superRefine((value, ctx) => {
  if (value.expectedDeliveryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (value.expectedDeliveryDate < today) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["expectedDeliveryDate"], message: "Expected delivery date cannot be in the past." });
    }
  }
  if (value.fulfilmentType === "self_pickup" && !value.pickupPersonId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pickupPersonId"], message: "Select a pickup person for self pickup." });
  }
  const uniqueItems = new Set(value.items.map((item) => item.inventoryItemId));
  if (uniqueItems.size !== value.items.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["items"], message: "Each inventory item can only be added once." });
  }
  if (value.fulfilmentType === "vendor_delivery" && value.pickupPersonId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pickupPersonId"], message: "Pickup person is only allowed for self pickup." });
  }
});

export const createPickupPersonSchema = z.object({
  name: z.string().trim().min(2).max(120),
  whatsappNumber: z.string().trim().regex(indianWhatsappNumber, "Enter a valid 10-digit Indian WhatsApp number."),
  isActive: z.boolean().default(true),
});

export const updatePickupPersonSchema = createPickupPersonSchema.partial();

export const updatePurchaseOrderSchema = z.object({
  expectedDeliveryDate: z.coerce.date().nullable().optional(),
  notes: z.string().trim().max(1500).optional(),
}).superRefine((value, ctx) => {
  if (value.expectedDeliveryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (value.expectedDeliveryDate < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expectedDeliveryDate"],
        message: "Expected delivery date cannot be in the past.",
      });
    }
  }
});

export const cancelPurchaseOrderSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

const goodsReceiptItemSchema = z
  .object({
    purchaseOrderItemId: objectId,
    receivedQuantity: z.number().positive(),
    acceptedQuantity: z.number().min(0),
    rejectedQuantity: z.number().min(0),
    batchNumber: z.string().trim().max(100).default(""),
    expiryDate: z.coerce.date().nullable().default(null),
    rejectionReason: z.string().trim().max(500).default(""),
  })
  .superRefine((value, ctx) => {
    if (
      value.acceptedQuantity + value.rejectedQuantity !==
      value.receivedQuantity
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["acceptedQuantity"],
        message:
          "Accepted and rejected quantities must equal received quantity.",
      });
    }
  });

export const createGoodsReceiptSchema = z.object({
  invoiceNumber: z.string().trim().max(100).default(""),
  invoiceDate: z.coerce.date().nullable().default(null),
  items: z.array(goodsReceiptItemSchema).min(1).max(200),
  notes: z.string().trim().max(1000).default(""),
}).superRefine((value, ctx) => {
  const uniqueItems = new Set(
    value.items.map((item) => item.purchaseOrderItemId),
  );
  if (uniqueItems.size !== value.items.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["items"],
      message: "Each purchase-order item can only be received once per receipt.",
    });
  }

  value.items.forEach((item, index) => {
    if (item.rejectedQuantity > 0 && !item.rejectionReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items", index, "rejectionReason"],
        message: "A rejection reason is required for rejected stock.",
      });
    }
  });

  if (value.invoiceDate) {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    if (value.invoiceDate > endOfToday) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["invoiceDate"],
        message: "Invoice date cannot be in the future.",
      });
    }
  }
});

export const createSupplierPaymentSchema = z.object({
  supplierId: objectId,
  purchaseOrderId: objectId.nullable().default(null),
  amount: z.number().positive(),
  method: z.enum([
    "cash",
    "upi",
    "bank_transfer",
    "cheque",
    "card",
    "other",
  ]),
  referenceNumber: z.string().trim().max(120).default(""),
  paymentDate: z.coerce.date().optional(),
  notes: z.string().trim().max(1000).default(""),
}).superRefine((value, ctx) => {
  if (value.paymentDate && value.paymentDate.getTime() > Date.now()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["paymentDate"],
      message: "Payment date cannot be in the future.",
    });
  }
});
