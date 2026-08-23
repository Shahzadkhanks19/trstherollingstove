import { z } from "zod";

const optionalObjectId = z.string().trim().regex(/^[a-f\d]{24}$/i).nullable().optional();
const money = z.number().min(0).max(1_000_000_000);

export const expenseRangeSchema = z.object({
  days: z.coerce.number().int().min(1).max(366).default(30),
});

export const expenseRebuildSchema = z.object({
  days: z.number().int().min(1).max(366).default(30),
  source: z.enum(["manual", "scheduled", "system"]).default("manual"),
});

const recurringExpenseSchema = z.object({
  enabled: z.boolean().default(false),
  frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]).nullable().default(null),
  nextDueDate: z.coerce.date().nullable().default(null),
  endDate: z.coerce.date().nullable().default(null),
});

const expenseBaseSchema = z.object({
  expenseDate: z.coerce.date().default(() => new Date()),
  category: z.enum([
    "operating",
    "payroll",
    "utility",
    "vendor",
    "marketing",
    "maintenance",
    "rent",
    "insurance",
    "tax",
    "miscellaneous",
  ]),
  department: z
    .enum([
      "restaurant",
      "kitchen",
      "administration",
      "marketing",
      "technology",
      "human_resources",
      "finance",
      "general",
    ])
    .default("general"),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2000).default(""),
  vendorId: optionalObjectId,
  vendorName: z.string().trim().max(180).default(""),
  purchaseOrderId: optionalObjectId,
  referenceNumber: z.string().trim().max(120).default(""),
  subtotal: money,
  taxAmount: money.default(0),
  discountAmount: money.default(0),
  paidAmount: money.default(0),
  paymentMethod: z
    .enum(["cash", "card", "upi", "bank_transfer", "wallet", "cheque", "credit", "other"])
    .default("cash"),
  approvalStatus: z.enum(["draft", "pending", "approved", "rejected", "void"]).default("draft"),
  recurring: recurringExpenseSchema.default({
    enabled: false,
    frequency: null,
    nextDueDate: null,
    endDate: null,
  }),
  invoiceUrl: z.string().trim().max(1000).default(""),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  notes: z.string().trim().max(2000).default(""),
});

export const expenseCreateSchema = expenseBaseSchema.superRefine((value, context) => {
  const total = value.subtotal + value.taxAmount - value.discountAmount;

  if (value.discountAmount > value.subtotal + value.taxAmount) {
    context.addIssue({
      code: "custom",
      path: ["discountAmount"],
      message: "Discount cannot exceed subtotal plus tax.",
    });
  }

  if (value.paidAmount > total) {
    context.addIssue({
      code: "custom",
      path: ["paidAmount"],
      message: "Paid amount cannot exceed total amount.",
    });
  }

  if (value.recurring.enabled && !value.recurring.frequency) {
    context.addIssue({
      code: "custom",
      path: ["recurring", "frequency"],
      message: "Frequency is required for recurring expenses.",
    });
  }
});

export const expenseUpdateSchema = expenseBaseSchema
  .partial()
  .extend({
    approvalStatus: z.enum(["draft", "pending", "approved", "rejected", "void"]).optional(),
    rejectionReason: z.string().trim().max(500).optional(),
  })
  .superRefine((value, context) => {
    if (
      value.subtotal !== undefined &&
      value.taxAmount !== undefined &&
      value.discountAmount !== undefined
    ) {
      const total = value.subtotal + value.taxAmount - value.discountAmount;

      if (value.discountAmount > value.subtotal + value.taxAmount) {
        context.addIssue({
          code: "custom",
          path: ["discountAmount"],
          message: "Discount cannot exceed subtotal plus tax.",
        });
      }

      if (value.paidAmount !== undefined && value.paidAmount > total) {
        context.addIssue({
          code: "custom",
          path: ["paidAmount"],
          message: "Paid amount cannot exceed total amount.",
        });
      }
    }

    if (value.recurring?.enabled && !value.recurring.frequency) {
      context.addIssue({
        code: "custom",
        path: ["recurring", "frequency"],
        message: "Frequency is required for recurring expenses.",
      });
    }
  });
