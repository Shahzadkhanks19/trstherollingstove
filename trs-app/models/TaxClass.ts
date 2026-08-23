import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const TaxClassSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    percentage: { type: Number, required: true, min: 0, max: 100 },
    isInclusive: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, versionKey: false },
);

export type TaxClassDocument = InferSchemaType<typeof TaxClassSchema>;
export const TaxClass: Model<TaxClassDocument> =
  (models.TaxClass as Model<TaxClassDocument>) ||
  model<TaxClassDocument>("TaxClass", TaxClassSchema);
