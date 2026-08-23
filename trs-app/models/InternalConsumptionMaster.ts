import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const INTERNAL_MASTER_TYPES = ["department", "designation", "meal_category"] as const;

const InternalConsumptionMasterSchema = new Schema(
  {
    type: { type: String, enum: INTERNAL_MASTER_TYPES, required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    code: { type: String, trim: true, uppercase: true, maxlength: 40, default: "" },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    sortOrder: { type: Number, min: 0, max: 9999, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false },
);

InternalConsumptionMasterSchema.index(
  { type: 1, name: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
InternalConsumptionMasterSchema.index({ type: 1, isActive: 1, sortOrder: 1, name: 1 });

export type InternalConsumptionMasterDocument = InferSchemaType<typeof InternalConsumptionMasterSchema>;
export const InternalConsumptionMaster: Model<InternalConsumptionMasterDocument> =
  (models.InternalConsumptionMaster as Model<InternalConsumptionMasterDocument>) ||
  model<InternalConsumptionMasterDocument>("InternalConsumptionMaster", InternalConsumptionMasterSchema);
