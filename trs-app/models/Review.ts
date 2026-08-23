import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const CategoryRatingsSchema = new Schema(
  {
    foodQuality: { type: Number, required: true, min: 1, max: 5 },
    taste: { type: Number, required: true, min: 1, max: 5 },
    service: { type: Number, required: true, min: 1, max: 5 },
    speed: { type: Number, required: true, min: 1, max: 5 },
    packaging: { type: Number, min: 1, max: 5, default: null },
  },
  { _id: false, versionKey: false },
);

const OwnerReplySchema = new Schema(
  {
    message: { type: String, trim: true, maxlength: 1500, default: "" },
    repliedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    repliedAt: { type: Date, default: null },
  },
  { _id: false, versionKey: false },
);

const ReviewSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5, index: true },
    categoryRatings: { type: CategoryRatingsSchema, required: true },
    recommendation: { type: String, enum: ["definitely", "maybe", "no"], required: true, index: true },
    tags: {
      type: [String],
      default: [],
      validate: { validator: (value: string[]) => value.length <= 10, message: "A maximum of 10 tags is allowed." },
    },
    title: { type: String, trim: true, maxlength: 120, default: "" },
    comment: { type: String, trim: true, maxlength: 500, default: "" },
    images: {
      type: [String],
      default: [],
      validate: { validator: (value: string[]) => value.length <= 5, message: "A maximum of 5 review images is allowed." },
    },
    status: { type: String, enum: ["pending", "published", "rejected", "hidden"], default: "pending", index: true },
    approved: { type: Boolean, default: false, index: true },
    visible: { type: Boolean, default: false, index: true },
    moderationNote: { type: String, trim: true, maxlength: 1000, default: "" },
    moderatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    moderatedAt: { type: Date, default: null },
    isFeatured: { type: Boolean, default: false, index: true },
    helpfulCount: { type: Number, min: 0, default: 0 },
    ownerReply: { type: OwnerReplySchema, default: () => ({}) },
    sentiment: { type: String, enum: ["positive", "neutral", "negative", "critical"], default: "neutral", index: true },
    sentimentScore: { type: Number, min: -1, max: 1, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

ReviewSchema.index({ status: 1, visible: 1, isFeatured: 1, createdAt: -1 });
ReviewSchema.index({ customerId: 1, createdAt: -1 });
ReviewSchema.index({ rating: 1, recommendation: 1, createdAt: -1 });

export type ReviewDocument = InferSchemaType<typeof ReviewSchema>;
export const Review: Model<ReviewDocument> =
  (models.Review as Model<ReviewDocument>) || model<ReviewDocument>("Review", ReviewSchema);
