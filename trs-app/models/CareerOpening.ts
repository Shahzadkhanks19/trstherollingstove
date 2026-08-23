import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const CareerOpeningSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 180, unique: true, index: true },
    employmentType: { type: String, enum: ["Full-time", "Part-time", "Full-time / Part-time", "Internship"], required: true, index: true },
    location: { type: String, required: true, trim: true, maxlength: 180 },
    summary: { type: String, required: true, trim: true, maxlength: 600 },
    responsibilities: { type: [String], default: [] },
    requirements: { type: [String], default: [] },
    vacancies: { type: Number, min: 1, default: 1 },
    sortOrder: { type: Number, min: 0, default: 0 },
    isPublished: { type: Boolean, default: true, index: true },
    closesAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);

CareerOpeningSchema.index({ isPublished: 1, sortOrder: 1, createdAt: -1 });

export type CareerOpeningDocument = InferSchemaType<typeof CareerOpeningSchema>;
export const CareerOpening: Model<CareerOpeningDocument> =
  (models.CareerOpening as Model<CareerOpeningDocument>) ||
  model<CareerOpeningDocument>("CareerOpening", CareerOpeningSchema);
