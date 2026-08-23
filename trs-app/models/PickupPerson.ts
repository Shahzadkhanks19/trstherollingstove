import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const PickupPersonSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120, index: true },
  whatsappNumber: { type: String, required: true, trim: true, maxlength: 20 },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });

export type PickupPersonDocument = InferSchemaType<typeof PickupPersonSchema>;
export const PickupPerson: Model<PickupPersonDocument> =
  (models.PickupPerson as Model<PickupPersonDocument>) || model<PickupPersonDocument>("PickupPerson", PickupPersonSchema);
