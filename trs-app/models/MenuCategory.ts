import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const MenuCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    imageUrl: { type: String, trim: true, maxlength: 500, default: "" },
    iconUrl: { type: String, trim: true, maxlength: 500, default: "" },
    sortOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, versionKey: false },
);

MenuCategorySchema.index({ isActive: 1, sortOrder: 1 });
MenuCategorySchema.index({ name: "text", description: "text" });

export type MenuCategoryDocument = InferSchemaType<typeof MenuCategorySchema>;
export const MenuCategory: Model<MenuCategoryDocument> =
  (models.MenuCategory as Model<MenuCategoryDocument>) ||
  model<MenuCategoryDocument>("MenuCategory", MenuCategorySchema);
