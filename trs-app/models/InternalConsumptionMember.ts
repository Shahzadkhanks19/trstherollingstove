import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const InternalConsumptionMemberSchema = new Schema(
  {
    type: { type: String, enum: ["family"], required: true, default: "family", index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100, index: true },
    relationship: { type: String, trim: true, maxlength: 80, default: "" },
    phone: { type: String, trim: true, maxlength: 20, default: "" },
    photoUrl: { type: String, trim: true, maxlength: 500, default: "" },
    qrCode: { type: String, trim: true, maxlength: 120, default: "", index: true },
    notes: { type: String, trim: true, maxlength: 1000, default: "" },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false },
);

InternalConsumptionMemberSchema.index({ type: 1, isActive: 1, name: 1 });

export type InternalConsumptionMemberDocument = InferSchemaType<typeof InternalConsumptionMemberSchema>;
export const InternalConsumptionMember: Model<InternalConsumptionMemberDocument> =
  (models.InternalConsumptionMember as Model<InternalConsumptionMemberDocument>) ||
  model<InternalConsumptionMemberDocument>("InternalConsumptionMember", InternalConsumptionMemberSchema);
