import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const SiteBannerSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    subtitle: { type: String, trim: true, maxlength: 300, default: "" },
    imageUrl: { type: String, required: true, trim: true, maxlength: 1000 },
    mobileImageUrl: { type: String, trim: true, maxlength: 1000, default: "" },
    ctaLabel: { type: String, trim: true, maxlength: 80, default: "" },
    ctaUrl: { type: String, trim: true, maxlength: 1000, default: "" },
    placement: {
      type: String,
      enum: ["home_hero", "home_offer", "menu", "checkout", "global"],
      required: true,
      index: true,
    },
    sortOrder: { type: Number, min: 0, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);

SiteBannerSchema.index({ placement: 1, isActive: 1, sortOrder: 1 });

export type SiteBannerDocument = InferSchemaType<typeof SiteBannerSchema>;

export const SiteBanner: Model<SiteBannerDocument> =
  (models.SiteBanner as Model<SiteBannerDocument>) ||
  model<SiteBannerDocument>("SiteBanner", SiteBannerSchema);
