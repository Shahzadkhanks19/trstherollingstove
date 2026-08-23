import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const POSCartRecordSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    registerId: { type: Schema.Types.ObjectId, ref: "POSRegister", default: null, index: true },
    shiftId: { type: Schema.Types.ObjectId, ref: "POSShift", default: null, index: true },
    status: { type: String, enum: ["draft", "held"], required: true, index: true },
    title: { type: String, trim: true, maxlength: 120, default: "" },
    customerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    customerSnapshot: { type: Schema.Types.Mixed, default: null },
    cartSnapshot: { type: Schema.Types.Mixed, required: true },
    itemCount: { type: Number, min: 0, default: 0 },
    grandTotal: { type: Number, min: 0, default: 0 },
    lastSavedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, versionKey: false },
);

POSCartRecordSchema.index({ ownerId: 1, status: 1, updatedAt: -1 });
POSCartRecordSchema.index(
  { ownerId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "draft" } },
);

export type POSCartRecordDocument = InferSchemaType<typeof POSCartRecordSchema>;
export const POSCartRecord: Model<POSCartRecordDocument> =
  (models.POSCartRecord as Model<POSCartRecordDocument>) ||
  model<POSCartRecordDocument>("POSCartRecord", POSCartRecordSchema);
