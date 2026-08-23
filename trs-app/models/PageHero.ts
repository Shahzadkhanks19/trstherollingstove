import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const PageHeroSchema = new Schema(
  {
    pageKey: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true, maxlength: 80 },
    pageName: { type: String, required: true, trim: true, maxlength: 120 },
    desktopImageUrl: { type: String, trim: true, maxlength: 1000, default: "" },
    mobileImageUrl: { type: String, trim: true, maxlength: 1000, default: "" },
    imageAlt: { type: String, trim: true, maxlength: 200, default: "" },
    overlayOpacity: { type: Number, min: 0, max: 100, default: 58 },
    focalPointX: { type: Number, min: 0, max: 100, default: 50 },
    focalPointY: { type: Number, min: 0, max: 100, default: 50 },
    isActive: { type: Boolean, default: true, index: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false },
);

export type PageHeroDocument = InferSchemaType<typeof PageHeroSchema>;
export const PageHero: Model<PageHeroDocument> =
  (models.PageHero as Model<PageHeroDocument>) || model<PageHeroDocument>("PageHero", PageHeroSchema);
