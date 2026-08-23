import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const CustomerProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    referralCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true, minlength: 6, maxlength: 20, index: true },
    referredByCustomerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    successfulReferralCount: { type: Number, default: 0, min: 0 },
    referralCoinsEarned: { type: Number, default: 0, min: 0 },
    preferredName: { type: String, trim: true, maxlength: 80, default: "" },
    dateOfBirth: { type: Date, default: null },
    anniversary: { type: Date, default: null },
    dietaryNotes: { type: String, trim: true, maxlength: 500, default: "" },
    adminNotes: { type: String, trim: true, maxlength: 1000, default: "" },
    marketingWhatsAppOptIn: { type: Boolean, default: false },
    marketingEmailOptIn: { type: Boolean, default: false },
    preferredCommunicationChannel: { type: String, enum: ["whatsapp", "email", "phone", "none"], default: "none" },
    source: { type: String, enum: ["website", "pos", "admin", "import", "other"], default: "website", index: true },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
  },
  { timestamps: true, versionKey: false },
);

export type CustomerProfileDocument = InferSchemaType<typeof CustomerProfileSchema>;
export const CustomerProfile: Model<CustomerProfileDocument> =
  (models.CustomerProfile as Model<CustomerProfileDocument>) ||
  model<CustomerProfileDocument>("CustomerProfile", CustomerProfileSchema);
