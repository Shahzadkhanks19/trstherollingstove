import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const InternalConsumptionReasonSchema = new Schema(
  {
    saleType: {
      type: String,
      enum: ["staff_meal", "family_meal", "complimentary", "food_wastage", "kitchen_test"],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0, min: 0 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    color: { type: String, trim: true, maxlength: 20, default: "#C8102E" },
    icon: { type: String, trim: true, maxlength: 80, default: "" },
    requiresApproval: { type: Boolean, default: false },
    maximumMenuValue: { type: Number, min: 0, default: 0 },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "low" },
    costCenter: { type: String, trim: true, maxlength: 100, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false },
);

InternalConsumptionReasonSchema.index(
  { saleType: 1, name: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
InternalConsumptionReasonSchema.index({ saleType: 1, isActive: 1, sortOrder: 1, name: 1 });

export type InternalConsumptionReasonDocument = InferSchemaType<typeof InternalConsumptionReasonSchema>;
export const InternalConsumptionReason: Model<InternalConsumptionReasonDocument> =
  (models.InternalConsumptionReason as Model<InternalConsumptionReasonDocument>) ||
  model<InternalConsumptionReasonDocument>("InternalConsumptionReason", InternalConsumptionReasonSchema);
