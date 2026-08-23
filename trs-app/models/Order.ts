import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const OrderPaymentPartSchema = new Schema(
  {
    method: { type: String, enum: ["cash", "upi", "card", "online"], required: true },
    amount: { type: Number, required: true, min: 0 },
    reference: { type: String, trim: true, maxlength: 100, default: "" },
  },
  { _id: false, versionKey: false },
);

const OrderModifierSchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "ModifierGroup", required: true },
    groupName: { type: String, required: true, trim: true, maxlength: 80 },
    optionId: { type: Schema.Types.ObjectId, required: true },
    optionName: { type: String, required: true, trim: true, maxlength: 80 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false, versionKey: false },
);


const ComboSnapshotItemSchema = new Schema(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem", default: null },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    variantId: { type: Schema.Types.ObjectId, default: null },
    variantName: { type: String, trim: true, maxlength: 80, default: "" },
    quantity: { type: Number, required: true, min: 1, max: 50 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false, versionKey: false },
);

const OrderItemSchema = new Schema(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem", default: null },
    posItemId: { type: Schema.Types.ObjectId, ref: "POSItem", default: null },
    sourceType: { type: String, enum: ["menu", "pos"], default: "menu" },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    imageUrl: { type: String, trim: true, maxlength: 500, default: "" },
    variantId: { type: Schema.Types.ObjectId, default: null },
    variantName: { type: String, trim: true, maxlength: 80, default: "" },
    baseUnitPrice: { type: Number, required: true, min: 0 },
    isDiscountedItem: { type: Boolean, default: false },
    originalUnitPrice: { type: Number, min: 0, default: null },
    itemDiscountSavings: { type: Number, min: 0, default: null },
    isCombo: { type: Boolean, default: false },
    comboId: { type: Schema.Types.ObjectId, ref: "MenuItem", default: null },
    comboOriginalPrice: { type: Number, min: 0, default: null },
    comboSellingPrice: { type: Number, min: 0, default: null },
    comboSavings: { type: Number, min: 0, default: null },
    comboItems: { type: [ComboSnapshotItemSchema], default: [] },
    modifiers: { type: [OrderModifierSchema], default: [] },
    quantity: { type: Number, required: true, min: 1, max: 50 },
    specialInstructions: { type: String, trim: true, maxlength: 500, default: "" },
    lineUnitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: true, versionKey: false },
);

const StatusHistorySchema = new Schema(
  {
    status: {
      type: String,
      required: true,
      enum: [
        "placed",
        "accepted",
        "preparing",
        "ready",
        "completed",
        "cancelled",
        "rejected",
      ],
    },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    changedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false, versionKey: false },
);

const OrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    clientOperationId: { type: String, trim: true, unique: true, sparse: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    orderSource: { type: String, enum: ["website", "pos", "admin"], default: "website", index: true },
    posShiftId: { type: Schema.Types.ObjectId, ref: "POSShift", default: null, index: true },
    posRegisterId: { type: Schema.Types.ObjectId, ref: "POSRegister", default: null, index: true },
    cashierId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    saleType: { type: String, enum: ["customer", "staff_meal", "family_meal", "complimentary", "food_wastage", "kitchen_test"], default: "customer", index: true },
    isRevenueOrder: { type: Boolean, default: true, index: true },
    internalConsumption: {
      referenceId: { type: Schema.Types.ObjectId, ref: "User", default: null },
      personName: { type: String, trim: true, maxlength: 120, default: "" },
      reason: { type: String, trim: true, maxlength: 240, default: "" },
      notes: { type: String, trim: true, maxlength: 500, default: "" },
      menuValue: { type: Number, min: 0, default: 0 },
      approvalStatus: { type: String, enum: ["not_required", "required", "approved", "rejected"], default: "not_required", index: true },
      approvalReason: { type: String, trim: true, maxlength: 500, default: "" },
      approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
      approvedAt: { type: Date, default: null },
      dailyUsageBefore: { type: Number, min: 0, default: 0 },
      monthlyUsageBefore: { type: Number, min: 0, default: 0 },
      dailyLimit: { type: Number, min: 0, default: 0 },
      monthlyLimit: { type: Number, min: 0, default: 0 },
    },
    upiReference: { type: String, trim: true, maxlength: 100, default: "" },
    paymentBreakdown: { type: [OrderPaymentPartSchema], default: [] },
    waivedAmount: { type: Number, min: 0, default: 0 },
    waivedReason: { type: String, trim: true, maxlength: 240, default: "" },
    tipAmount: { type: Number, min: 0, default: 0 },
    tipMethod: { type: String, enum: ["none", "cash", "upi"], default: "none" },
    tipCollection: { type: String, enum: ["none", "waiter_direct", "restaurant"], default: "none" },
    orderTakerName: { type: String, trim: true, maxlength: 120, default: "" },
    paymentConfirmedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    paymentConfirmedAt: { type: Date, default: null },
    amountTendered: { type: Number, min: 0, default: 0 },
    changeDue: { type: Number, min: 0, default: 0 },
    customerSnapshot: {
      name: { type: String, required: true, trim: true, maxlength: 80 },
      phone: { type: String, trim: true, maxlength: 20, default: "" },
      email: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
    },
    items: { type: [OrderItemSchema], required: true },
    orderMode: {
      type: String,
      required: true,
      enum: ["dine_in", "takeaway"],
      index: true,
    },
    tableNumber: { type: String, trim: true, maxlength: 30, default: "" },
    requestedPickupAt: { type: Date, default: null },
    customerNote: { type: String, trim: true, maxlength: 500, default: "" },
    status: {
      type: String,
      required: true,
      enum: [
        "placed",
        "accepted",
        "preparing",
        "ready",
        "completed",
        "cancelled",
        "rejected",
      ],
      default: "placed",
      index: true,
    },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "card", "online", "split"],
      default: "cash",
    },

    couponId: { type: Schema.Types.ObjectId, ref: "Coupon", default: null },
    couponCode: { type: String, uppercase: true, trim: true, default: "" },
    couponDiscount: { type: Number, min: 0, default: 0 },

    coinsRedeemed: { type: Number, min: 0, default: 0 },
    coinDiscount: { type: Number, min: 0, default: 0 },
    coinsEarned: { type: Number, min: 0, default: 0 },
    coinsAwardedAt: { type: Date, default: null },
    redeemedCoinsRefundedAt: { type: Date, default: null },

    subtotal: { type: Number, required: true, min: 0 },
    taxTotal: { type: Number, required: true, min: 0, default: 0 },
    discountTotal: { type: Number, required: true, min: 0, default: 0 },
    packingCharge: { type: Number, required: true, min: 0, default: 0 },
    serviceCharge: { type: Number, required: true, min: 0, default: 0 },
    additionalCharge: { type: Number, required: true, min: 0, default: 0 },
    additionalChargeLabel: { type: String, trim: true, maxlength: 60, default: "Additional charge" },
    taxRate: { type: Number, min: 0, max: 100, default: 0 },
    taxMode: { type: String, enum: ["exclusive", "inclusive"], default: "exclusive" },
    discountType: { type: String, enum: ["none", "fixed", "percentage"], default: "none" },
    discountValue: { type: Number, min: 0, default: 0 },
    discountReason: { type: String, trim: true, maxlength: 120, default: "" },
    grandTotal: { type: Number, required: true, min: 0 },
    loyaltyEligibleAmount: { type: Number, required: true, min: 0, default: 0 },
    itemCount: { type: Number, required: true, min: 1 },

    estimatedReadyAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    preparingAt: { type: Date, default: null },
    readyAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, trim: true, maxlength: 500, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);

OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ orderMode: 1, status: 1, createdAt: -1 });
OrderSchema.index({ saleType: 1, createdAt: -1 });

export type OrderDocument = InferSchemaType<typeof OrderSchema>;
export const Order: Model<OrderDocument> =
  (models.Order as Model<OrderDocument>) || model<OrderDocument>("Order", OrderSchema);
