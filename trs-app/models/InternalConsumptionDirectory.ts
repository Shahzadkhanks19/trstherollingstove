import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const INTERNAL_DIRECTORY_TYPES = ["family_member", "complimentary_reason", "wastage_reason", "testing_reason"] as const;

const InternalConsumptionDirectorySchema = new Schema({
  type: { type: String, enum: INTERNAL_DIRECTORY_TYPES, required: true, index: true },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  relationship: { type: String, trim: true, maxlength: 80, default: "" },
  phone: { type: String, trim: true, maxlength: 20, default: "" },
  notes: { type: String, trim: true, maxlength: 1000, default: "" },
  color: { type: String, trim: true, maxlength: 20, default: "" },
  icon: { type: String, trim: true, maxlength: 80, default: "" },
  category: { type: String, trim: true, maxlength: 80, default: "" },
  severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "low" },
  requiresApproval: { type: Boolean, default: false },
  maximumValue: { type: Number, min: 0, default: 0 },
  sortOrder: { type: Number, min: 0, max: 9999, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true, versionKey: false });

InternalConsumptionDirectorySchema.index({ type: 1, name: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
InternalConsumptionDirectorySchema.index({ type: 1, isActive: 1, sortOrder: 1, name: 1 });

export type InternalConsumptionDirectoryDocument = InferSchemaType<typeof InternalConsumptionDirectorySchema>;
export const InternalConsumptionDirectory: Model<InternalConsumptionDirectoryDocument> =
  (models.InternalConsumptionDirectory as Model<InternalConsumptionDirectoryDocument>) ||
  model<InternalConsumptionDirectoryDocument>("InternalConsumptionDirectory", InternalConsumptionDirectorySchema);
