import { z } from "zod";

export const createRegisterSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/),
  locationLabel: z.string().trim().max(160).default(""),
  isActive: z.boolean().default(true),
});

export const updateRegisterSchema =
  createRegisterSchema.partial();

export const openShiftSchema = z.object({
  registerId: z.string().regex(/^[a-f\d]{24}$/i),
  openingCash: z.number().min(0),
});

export const closeShiftSchema = z.object({
  countedCash: z.number().min(0),
  closingNote: z.string().trim().max(1000).default(""),
  closeApprovalNote: z.string().trim().max(500).default(""),
});

export const createCashMovementSchema = z.object({
  type: z.enum(["cash_in", "cash_out"]),
  amount: z.number().positive(),
  reason: z.string().trim().min(2).max(500),
});

export const createPosItemSchema = z.object({
  name: z.string().trim().min(2).max(160),
  sellingPrice: z.number().min(0),
});

export const posItemSchema = z.object({
  name: z.string().trim().min(2).max(160),
  sku: z.string().trim().min(2).max(60).regex(/^[A-Za-z0-9_-]+$/),
  category: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).default(""),
  imageUrl: z.string().trim().max(500).default(""),
  sellingPrice: z.number().min(0),
  taxRate: z.number().min(0).max(100).default(0),
  trackInventory: z.boolean().default(false),
  inventoryItemId: z.string().regex(/^[a-f\d]{24}$/i).nullable().default(null),
  sendToKds: z.boolean().default(false),
  kitchenStationId: z.string().regex(/^[a-f\d]{24}$/i).nullable().default(null),
  allowCustomPrice: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const updatePosItemSchema = posItemSchema.partial();

const selectedModifierSchema = z.object({
  groupId: z.string().regex(/^[a-f\d]{24}$/i),
  groupName: z.string().trim().min(1).max(120).optional(),
  optionId: z.string().regex(/^[a-f\d]{24}$/i),
  optionName: z.string().trim().min(1).max(160).optional(),
  quantity: z.number().int().min(1).max(50),
});

const posOrderLineSchema = z.object({
  sourceType: z.enum(["menu", "pos"]),
  itemId: z.string().regex(/^[a-f\d]{24}$/i),
  variantId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
  quantity: z.number().int().min(1).max(50),
  unitPrice: z.number().min(0).optional(),
  specialInstructions: z.string().trim().max(500).default(""),
  modifiers: z.array(selectedModifierSchema).max(50).default([]),
});


const paymentPartSchema = z.object({
  method: z.enum(["cash", "upi"]),
  amount: z.number().min(0),
  reference: z.string().trim().max(100).default(""),
});

const adjustmentsSchema = z.object({
  discountType: z.enum(["none", "fixed", "percentage"]).default("none"),
  discountValue: z.number().min(0).default(0),
  discountReason: z.string().trim().max(120).default(""),
  packingCharge: z.number().min(0).default(0),
  serviceCharge: z.number().min(0).default(0),
  additionalCharge: z.number().min(0).default(0),
  additionalChargeLabel: z.string().trim().max(60).default("Additional charge"),
  taxRate: z.number().min(0).max(100).default(0),
  taxMode: z.enum(["exclusive", "inclusive"]).default("exclusive"),
});


const internalConsumptionSchema = z.object({
  saleType: z.enum(["customer", "staff_meal", "family_meal", "complimentary", "food_wastage", "kitchen_test"]).default("customer"),
  referenceId: z.string().regex(/^[a-f\d]{24}$/i).nullable().default(null),
  personName: z.string().trim().max(120).default(""),
  reason: z.string().trim().max(240).default(""),
  notes: z.string().trim().max(500).default(""),
  managerApprovalEmail: z.string().trim().email().or(z.literal("")).default(""),
  managerApprovalPassword: z.string().max(200).default(""),
  managerApprovalReason: z.string().trim().max(500).default(""),
});

export const createPosOrderSchema = z.object({
  clientOperationId: z.string().uuid().optional(),
  shiftId: z.string().regex(/^[a-f\d]{24}$/i),
  orderMode: z.enum(["dine_in", "takeaway"]),
  internalConsumption: internalConsumptionSchema.default({ saleType: "customer", referenceId: null, personName: "", reason: "", notes: "", managerApprovalEmail: "", managerApprovalPassword: "", managerApprovalReason: "" }),
  tableNumber: z.string().trim().max(30).default(""),
  customerId: z.string().regex(/^[a-f\d]{24}$/i).nullable().default(null),
  customerName: z.string().trim().min(1).max(120).default("Walk-in Customer"),
  customerPhone: z.union([z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."), z.literal("")]).default(""),
  customerEmail: z.string().trim().email().max(254).or(z.literal("")).default(""),
  customerNote: z.string().trim().max(500).default(""),
  paymentMethod: z.enum(["cash", "upi", "split"]),
  paymentBreakdown: z.array(paymentPartSchema).max(4).default([]),
  waivedAmount: z.number().min(0).max(1000).default(0),
  waivedReason: z.string().trim().max(240).default(""),
  tipAmount: z.number().min(0).max(100000).default(0),
  tipMethod: z.enum(["none", "cash", "upi"]).default("none"),
  tipCollection: z.enum(["none", "waiter_direct", "restaurant"]).default("none"),
  orderTakerName: z.string().trim().max(120).default(""),
  upiReference: z.string().trim().max(100).default(""),
  amountTendered: z.number().min(0).default(0),
  adjustments: adjustmentsSchema.default({
    discountType: "none",
    discountValue: 0,
    discountReason: "",
    packingCharge: 0,
    serviceCharge: 0,
    additionalCharge: 0,
    additionalChargeLabel: "Additional charge",
    taxRate: 0,
    taxMode: "exclusive",
  }),
  items: z.array(posOrderLineSchema).min(1).max(50),
}).superRefine((value, context) => {
  const isInternal = value.internalConsumption.saleType !== "customer";
  if (isInternal && !value.internalConsumption.personName.trim()) {
    context.addIssue({ code: "custom", path: ["internalConsumption", "personName"], message: "Select or enter the person/name for this internal order." });
  }
  if (isInternal && !value.internalConsumption.reason.trim()) {
    context.addIssue({ code: "custom", path: ["internalConsumption", "reason"], message: "Reason is required for internal consumption." });
  }
  if (value.internalConsumption.saleType === "staff_meal" && !value.internalConsumption.referenceId) {
    context.addIssue({ code: "custom", path: ["internalConsumption", "referenceId"], message: "Select a staff member." });
  }
  if (value.paymentMethod === "split" && value.paymentBreakdown.filter((part) => part.amount > 0).length < 2) {
    context.addIssue({ code: "custom", path: ["paymentBreakdown"], message: "Add at least two positive payment parts." });
  }
  if (value.waivedAmount > 0 && value.waivedReason.length < 3) {
    context.addIssue({ code: "custom", path: ["waivedReason"], message: "Enter why the balance was waived." });
  }
  if (value.tipAmount > 0 && value.tipMethod === "none") {
    context.addIssue({ code: "custom", path: ["tipMethod"], message: "Select how the tip was received." });
  }
  if (value.tipAmount > 0 && value.tipCollection === "none") {
    context.addIssue({ code: "custom", path: ["tipCollection"], message: "Select who currently holds the tip." });
  }
  if (value.tipMethod === "upi" && value.tipCollection !== "restaurant") {
    context.addIssue({ code: "custom", path: ["tipCollection"], message: "UPI tips are received by the restaurant." });
  }
  if (value.paymentMethod === "cash" && value.amountTendered < 0) {
    context.addIssue({ code: "custom", path: ["amountTendered"], message: "Amount tendered cannot be negative." });
  }
  if (value.adjustments.discountType !== "none" && !value.adjustments.discountReason) {
    context.addIssue({ code: "custom", path: ["adjustments", "discountReason"], message: "Discount reason is required." });
  }
});