import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const JobApplicationSchema = new Schema(
  {
    opening: { type: Schema.Types.ObjectId, ref: "CareerOpening", required: true, index: true },
    openingTitle: { type: String, required: true, trim: true, maxlength: 160 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 15, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, index: true },
    experience: { type: String, trim: true, maxlength: 200, default: "" },
    message: { type: String, trim: true, maxlength: 1500, default: "" },
    resumeUrl: { type: String, trim: true, maxlength: 1000, default: "" },
    resumeOriginalName: { type: String, trim: true, maxlength: 255, default: "" },
    status: { type: String, enum: ["new", "reviewing", "shortlisted", "rejected", "hired"], default: "new", index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

JobApplicationSchema.index({ opening: 1, email: 1, createdAt: -1 });
JobApplicationSchema.index({ status: 1, createdAt: -1 });

export type JobApplicationDocument = InferSchemaType<typeof JobApplicationSchema>;
export const JobApplication: Model<JobApplicationDocument> =
  (models.JobApplication as Model<JobApplicationDocument>) ||
  model<JobApplicationDocument>("JobApplication", JobApplicationSchema);
