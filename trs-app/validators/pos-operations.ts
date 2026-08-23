import { z } from "zod";
const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const cartLine = z.object({
  lineId: z.string().min(1), itemId: z.string().min(1), source: z.enum(["menu", "pos"]), name: z.string().min(1),
  slug: z.string().default(""), imageUrl: z.string().default(""), categoryName: z.string().default("Other"),
  basePrice: z.number().min(0), unitPrice: z.number().min(0), quantity: z.number().int().min(1).max(99), note: z.string().max(240).default(""),
  variantId: z.string().nullable(), variantName: z.string().nullable(), modifierSignature: z.string().default(""),
  modifiers: z.array(z.object({ groupId: z.string(), groupName: z.string(), optionId: z.string(), optionName: z.string(), quantity: z.number().int().min(1), unitPrice: z.number().min(0) })).default([]),
});
const cart = z.object({
  version: z.literal(4), orderType: z.enum(["dine_in", "takeaway"]), lines: z.array(cartLine).min(1).max(100), orderNote: z.string().max(500).default(""),
  customer: z.object({ id: z.string(), name: z.string().min(1), phone: z.string(), email: z.string(), isWalkIn: z.boolean() }),
  internalConsumption: z.object({
    saleType: z.enum(["customer", "staff_meal", "family_meal", "complimentary", "food_wastage", "kitchen_test"]),
    referenceId: z.string().regex(/^[a-f\d]{24}$/i).nullable(),
    personName: z.string(), reason: z.string(), notes: z.string(),
    managerApprovalEmail: z.string(), managerApprovalPassword: z.string(), managerApprovalReason: z.string(),
  }).default({ saleType: "customer", referenceId: null, personName: "", reason: "", notes: "", managerApprovalEmail: "", managerApprovalPassword: "", managerApprovalReason: "" }),
  adjustments: z.object({ discountType: z.enum(["none", "fixed", "percentage"]), discountValue: z.number().min(0), discountReason: z.string(), packingCharge: z.number().min(0), serviceCharge: z.number().min(0), additionalCharge: z.number().min(0), additionalChargeLabel: z.string(), taxRate: z.number().min(0).max(100), taxMode: z.enum(["exclusive", "inclusive"]) }),
});
export const createTableSchema = z.object({ name: z.string().trim().min(1).max(40), code: z.string().trim().min(1).max(30), section: z.string().trim().max(60).default("Main"), capacity: z.number().int().min(1).max(50).default(4), sortOrder: z.number().int().default(0) });
export const updateTableSchema = createTableSchema.partial().extend({ status: z.enum(["available", "reserved", "out_of_service"]).optional(), reservationName: z.string().trim().max(100).optional(), reservationPhone: z.string().trim().max(20).optional(), reservationTime: z.string().datetime().nullable().optional(), isActive: z.boolean().optional() });
export const createRunningOrderSchema = z.object({ shiftId: objectId, tableId: objectId.nullable().default(null), tableName: z.string().trim().max(40).default(""), guestCount: z.number().int().min(1).max(100).default(1), cart });
export const updateRunningOrderSchema = z.object({ cart, guestCount: z.number().int().min(1).max(100).optional(), sendToKitchen: z.boolean().default(false) });
export const transferRunningOrderSchema = z.object({ tableId: objectId.nullable(), guestCount: z.number().int().min(1).max(100).optional() });
export const mergeRunningOrderSchema = z.object({ sourceOrderId: objectId });
export const splitRunningOrderSchema = z.object({ lineQuantities: z.record(z.string(), z.number().int().min(1)), targetTableId: objectId.nullable().default(null) });
export const voidRunningItemSchema = z.object({ lineId: z.string().min(1), quantity: z.number().int().min(1), reason: z.string().trim().min(3).max(500) });
export const cancelRunningOrderSchema = z.object({ reason: z.string().trim().min(3).max(500) });
const runningOrderPaymentPartSchema = z.object({
  method: z.enum(["cash", "upi"]),
  amount: z.number().min(0),
  reference: z.string().trim().max(100).default(""),
});

export const settleRunningOrderSchema = z
  .object({
    paymentMethod: z.enum(["cash", "upi", "split"]),
    paymentBreakdown: z.array(runningOrderPaymentPartSchema).max(2).default([]),
    amountTendered: z.number().min(0).default(0),
    upiReference: z.string().trim().max(100).default(""),
    tipAmount: z.number().min(0).max(100000).default(0),
    tipMethod: z.enum(["none", "cash", "upi"]).default("none"),
    tipCollection: z.enum(["none", "waiter_direct", "restaurant"]).default("none"),
    orderTakerName: z.string().trim().max(120).default(""),
  })
  .superRefine((value, context) => {
    if (value.tipAmount > 0 && value.tipMethod === "none") {
      context.addIssue({ code: "custom", path: ["tipMethod"], message: "Select how the waiter tip was received." });
    }
    if (value.tipAmount > 0 && value.tipCollection === "none") {
      context.addIssue({ code: "custom", path: ["tipCollection"], message: "Select who currently holds the tip." });
    }
    if (value.tipAmount > 0 && !value.orderTakerName) {
      context.addIssue({ code: "custom", path: ["orderTakerName"], message: "Enter the waiter or order taker name for the tip." });
    }
    if (value.tipMethod === "upi" && value.tipCollection !== "restaurant") {
      context.addIssue({ code: "custom", path: ["tipCollection"], message: "UPI tips are received by the restaurant." });
    }
    if (value.paymentMethod === "split" && value.paymentBreakdown.filter((part) => part.amount > 0).length < 2) {
      context.addIssue({ code: "custom", path: ["paymentBreakdown"], message: "Add both cash and UPI amounts for split payment." });
    }
    if (value.tipMethod === "upi" && value.paymentMethod === "cash") {
      context.addIssue({ code: "custom", path: ["tipMethod"], message: "An online tip must include a UPI payment." });
    }
    if (value.tipMethod === "upi" && value.paymentMethod === "split" && !value.paymentBreakdown.some((part) => part.method === "upi" && part.amount > 0)) {
      context.addIssue({ code: "custom", path: ["paymentBreakdown"], message: "Add a positive UPI part for the online tip." });
    }
  });
export const refundOrderSchema = z.object({ idempotencyKey: z.string().trim().min(8).max(120).optional(), amount: z.number().positive(), method: z.enum(["cash", "upi"]), reason: z.string().trim().min(3).max(500), restockInventory: z.boolean().default(false), lines: z.array(z.object({ orderItemId: objectId, quantity: z.number().int().min(1), amount: z.number().min(0) })).default([]) });

export const cancelPaidPosOrderSchema = z.object({
  method: z.enum(["cash", "upi"]),
  reason: z.string().trim().min(3).max(500),
});
