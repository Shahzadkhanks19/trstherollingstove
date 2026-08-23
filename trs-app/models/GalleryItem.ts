import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const GalleryItemSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    mediaType: { type: String, enum: ["image", "video"], default: "image", index: true },
    mediaUrl: { type: String, required: true, trim: true, maxlength: 1000 },
    thumbnailUrl: { type: String, trim: true, maxlength: 1000, default: "" },
    category: { type: String, trim: true, maxlength: 100, default: "General", index: true },
    altText: { type: String, trim: true, maxlength: 200, default: "" },
    sortOrder: { type: Number, min: 0, default: 0 },
    isPublished: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);

GalleryItemSchema.index({ isPublished: 1, category: 1, sortOrder: 1 });

export type GalleryItemDocument = InferSchemaType<typeof GalleryItemSchema>;

export const GalleryItem: Model<GalleryItemDocument> =
  (models.GalleryItem as Model<GalleryItemDocument>) ||
  model<GalleryItemDocument>("GalleryItem", GalleryItemSchema);
