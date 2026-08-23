import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const SupplierIntelligenceSnapshotSchema = new Schema({
  runId: { type: Schema.Types.ObjectId, ref: "SupplierIntelligenceRun", required: true, index: true },
  supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
  supplierName: { type: String, required: true, trim: true, index: true },
  supplierCode: { type: String, required: true, trim: true, uppercase: true, index: true },
  isActive: { type: Boolean, required: true, index: true },
  purchaseOrderCount: { type: Number, min: 0, required: true },
  completedOrderCount: { type: Number, min: 0, required: true },
  totalSpend: { type: Number, min: 0, required: true },
  averageOrderValue: { type: Number, min: 0, required: true },
  orderedQuantity: { type: Number, min: 0, required: true },
  receivedQuantity: { type: Number, min: 0, required: true },
  acceptedQuantity: { type: Number, min: 0, required: true },
  rejectedQuantity: { type: Number, min: 0, required: true },
  fillRatePercent: { type: Number, min: 0, max: 100, required: true },
  rejectionRatePercent: { type: Number, min: 0, max: 100, required: true },
  qualityScore: { type: Number, min: 0, max: 100, required: true },
  onTimeDeliveryPercent: { type: Number, min: 0, max: 100, required: true },
  averageLeadTimeDays: { type: Number, min: 0, required: true },
  averageDelayDays: { type: Number, required: true },
  purchasePriceVariancePercent: { type: Number, required: true },
  returnCount: { type: Number, min: 0, required: true },
  returnValue: { type: Number, min: 0, required: true },
  deliveryScore: { type: Number, min: 0, max: 100, required: true },
  fulfilmentScore: { type: Number, min: 0, max: 100, required: true },
  priceScore: { type: Number, min: 0, max: 100, required: true },
  reliabilityScore: { type: Number, min: 0, max: 100, required: true },
  overallScore: { type: Number, min: 0, max: 100, required: true, index: true },
  grade: { type: String, enum: ["A", "B", "C", "D"], required: true, index: true },
  preferredSupplier: { type: Boolean, required: true, index: true },
  recommendation: { type: String, required: true, trim: true, maxlength: 500 },
  generatedAt: { type: Date, required: true, index: true },
}, { timestamps: true, versionKey: false });

SupplierIntelligenceSnapshotSchema.index({ runId: 1, overallScore: -1, totalSpend: -1 });
SupplierIntelligenceSnapshotSchema.index({ supplierId: 1, generatedAt: -1 });
export type SupplierIntelligenceSnapshotDocument = InferSchemaType<typeof SupplierIntelligenceSnapshotSchema>;
export const SupplierIntelligenceSnapshot: Model<SupplierIntelligenceSnapshotDocument> =
  (models.SupplierIntelligenceSnapshot as Model<SupplierIntelligenceSnapshotDocument> | undefined) ??
  model<SupplierIntelligenceSnapshotDocument>("SupplierIntelligenceSnapshot", SupplierIntelligenceSnapshotSchema);
