import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const TestimonialSchema = new Schema(
  {
    customerName: { type: String, required: true, trim: true, maxlength: 120 },
    designation: { type: String, trim: true, maxlength: 120, default: "" },
    message: { type: String, required: true, trim: true, maxlength: 1500 },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    avatarUrl: { type: String, trim: true, maxlength: 1000, default: "" },
    source: {
      type: String,
      enum: ["manual", "google", "review"],
      default: "manual",
      index: true,
    },
    sourceUrl: { type: String, trim: true, maxlength: 1000, default: "" },
    isFeatured: { type: Boolean, default: false, index: true },
    isPublished: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, min: 0, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);

TestimonialSchema.index({ isPublished: 1, isFeatured: -1, sortOrder: 1 });

export type TestimonialDocument = InferSchemaType<typeof TestimonialSchema>;

export const Testimonial: Model<TestimonialDocument> =
  (models.Testimonial as Model<TestimonialDocument>) ||
  model<TestimonialDocument>("Testimonial", TestimonialSchema);
