import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ContactMessageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    status: { type: String, enum: ["new", "in_progress", "resolved", "closed"], default: "new", index: true },
    isRead: { type: Boolean, default: false, index: true },
    adminNote: { type: String, trim: true, maxlength: 1500, default: "" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, collection: "contactmessages" },
);

ContactMessageSchema.index({ createdAt: -1, status: 1 });
ContactMessageSchema.index({ name: "text", email: "text", phone: "text", subject: "text", message: "text" });

export type ContactMessageDocument = InferSchemaType<typeof ContactMessageSchema>;
export const ContactMessage: Model<ContactMessageDocument> =
  (models.ContactMessage as Model<ContactMessageDocument>) || model<ContactMessageDocument>("ContactMessage", ContactMessageSchema);
