import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
const POSRefundLineSchema = new Schema({
  orderItemId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });
const POSRefundSchema = new Schema({
  idempotencyKey: { type: String, trim: true, maxlength: 120, default: "", index: true },
  orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", default: null },
  amount: { type: Number, required: true, min: 0 },
  method: { type: String, enum: ["cash", "upi"], required: true },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  lines: { type: [POSRefundLineSchema], default: [] },
  restockInventory: { type: Boolean, default: false },
  status: { type: String, enum: ["approved", "reversed"], default: "approved", index: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });
POSRefundSchema.index({ orderId: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string", $gt: "" } } });
export type POSRefundDocument = InferSchemaType<typeof POSRefundSchema>;
export const POSRefund: Model<POSRefundDocument> =
  (models.POSRefund as Model<POSRefundDocument>) || model<POSRefundDocument>("POSRefund", POSRefundSchema);
