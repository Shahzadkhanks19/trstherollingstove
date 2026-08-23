import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const RevenueBreakdownSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    orders: { type: Number, required: true, min: 0, default: 0 },
    grossRevenue: { type: Number, required: true, min: 0, default: 0 },
    netRevenue: { type: Number, required: true, default: 0 },
    tax: { type: Number, required: true, min: 0, default: 0 },
    discounts: { type: Number, required: true, min: 0, default: 0 },
    refunds: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false, versionKey: false },
);

const RevenueSnapshotSchema = new Schema(
  {
    periodKey: { type: String, required: true, unique: true, index: true },
    periodStart: { type: Date, required: true, index: true },
    periodEnd: { type: Date, required: true, index: true },
    currency: { type: String, required: true, uppercase: true, default: "INR" },
    metrics: {
      orderCount: { type: Number, required: true, min: 0, default: 0 },
      paidOrderCount: { type: Number, required: true, min: 0, default: 0 },
      completedOrderCount: { type: Number, required: true, min: 0, default: 0 },
      grossRevenue: { type: Number, required: true, min: 0, default: 0 },
      recognizedRevenue: { type: Number, required: true, default: 0 },
      netRevenue: { type: Number, required: true, default: 0 },
      taxableRevenue: { type: Number, required: true, min: 0, default: 0 },
      taxCollected: { type: Number, required: true, min: 0, default: 0 },
      discountTotal: { type: Number, required: true, min: 0, default: 0 },
      couponDiscount: { type: Number, required: true, min: 0, default: 0 },
      coinDiscount: { type: Number, required: true, min: 0, default: 0 },
      refundTotal: { type: Number, required: true, min: 0, default: 0 },
      averageOrderValue: { type: Number, required: true, min: 0, default: 0 },
      dineInRevenue: { type: Number, required: true, min: 0, default: 0 },
      takeawayRevenue: { type: Number, required: true, min: 0, default: 0 },
    },
    byDay: { type: [RevenueBreakdownSchema], default: [] },
    byPaymentMethod: { type: [RevenueBreakdownSchema], default: [] },
    byOrderMode: { type: [RevenueBreakdownSchema], default: [] },
    bySource: { type: [RevenueBreakdownSchema], default: [] },
    generatedAt: { type: Date, required: true, default: Date.now, index: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    source: { type: String, enum: ["scheduled", "manual", "system"], default: "system" },
  },
  { timestamps: true, versionKey: false },
);

RevenueSnapshotSchema.index({ periodStart: -1, periodEnd: -1 });

export type RevenueSnapshotDocument = InferSchemaType<typeof RevenueSnapshotSchema>;
export const RevenueSnapshot: Model<RevenueSnapshotDocument> =
  (models.RevenueSnapshot as Model<RevenueSnapshotDocument>) ||
  model<RevenueSnapshotDocument>("RevenueSnapshot", RevenueSnapshotSchema);
