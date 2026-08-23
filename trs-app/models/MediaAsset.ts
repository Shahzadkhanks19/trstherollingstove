import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const MediaAssetSchema = new Schema(
  {
    filename: { type: String, required: true, trim: true, maxlength: 255 },
    originalName: { type: String, required: true, trim: true, maxlength: 255 },
    url: { type: String, required: true, trim: true, maxlength: 1000, unique: true },
    mediaType: { type: String, enum: ["image", "video"], required: true, index: true },
    mimeType: { type: String, required: true, trim: true, maxlength: 120 },
    sizeBytes: { type: Number, required: true, min: 1 },
    category: { type: String, required: true, trim: true, maxlength: 80, default: "general", index: true },
    altText: { type: String, trim: true, maxlength: 200, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);

MediaAssetSchema.index({ createdAt: -1 });
MediaAssetSchema.index({ originalName: "text", altText: "text", category: "text" });

export type MediaAssetDocument = InferSchemaType<typeof MediaAssetSchema>;
export const MediaAsset: Model<MediaAssetDocument> =
  (models.MediaAsset as Model<MediaAssetDocument>) || model<MediaAssetDocument>("MediaAsset", MediaAssetSchema);
