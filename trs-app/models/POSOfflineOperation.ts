import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const POSOfflineOperationSchema = new Schema(
  {
    operationId: { type: String, required: true, unique: true, index: true, trim: true, maxlength: 120 },
    deviceId: { type: String, required: true, index: true, trim: true, maxlength: 120 },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    operationType: {
      type: String,
      required: true,
      enum: [
        "running_order.update",
        "running_order.transfer",
        "running_order.void_item",
        "table.update",
      ],
      index: true,
    },
    entityId: { type: String, required: true, trim: true, maxlength: 120 },
    payload: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ["processing", "completed", "failed"], default: "processing", index: true },
    result: { type: Schema.Types.Mixed, default: null },
    errorMessage: { type: String, trim: true, maxlength: 1000, default: "" },
    clientCreatedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

POSOfflineOperationSchema.index({ deviceId: 1, createdAt: -1 });

export type POSOfflineOperationDocument = InferSchemaType<typeof POSOfflineOperationSchema>;
export const POSOfflineOperation: Model<POSOfflineOperationDocument> =
  (models.POSOfflineOperation as Model<POSOfflineOperationDocument>) ||
  model<POSOfflineOperationDocument>("POSOfflineOperation", POSOfflineOperationSchema);
