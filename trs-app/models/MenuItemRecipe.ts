import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const RecipeIngredientSchema = new Schema({
  inventoryItemId: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true },
  quantity: { type: Number, min: 0.0001, required: true },
  wastagePercent: { type: Number, min: 0, max: 100, default: 0 },
  note: { type: String, trim: true, maxlength: 300, default: "" },
}, { _id: true, versionKey: false });

const MenuItemRecipeSchema = new Schema({
  menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true, index: true },
  variantId: { type: Schema.Types.ObjectId, default: null, index: true },
  variantNameSnapshot: { type: String, trim: true, maxlength: 80, default: "Base item" },
  yieldQuantity: { type: Number, min: 0.0001, default: 1 },
  yieldUnit: { type: String, trim: true, maxlength: 30, default: "portion" },
  ingredients: { type: [RecipeIngredientSchema], default: [] },
  preparationTimeMinutes: { type: Number, min: 0, max: 1440, default: 0 },
  cookingTimeMinutes: { type: Number, min: 0, max: 1440, default: 0 },
  cookingTemperatureC: { type: Number, min: 0, max: 600, default: null },
  restingTimeMinutes: { type: Number, min: 0, max: 10080, default: 0 },
  instructions: { type: String, trim: true, maxlength: 5000, default: "" },
  version: { type: Number, min: 1, default: 1 },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });

MenuItemRecipeSchema.index({ menuItemId: 1, variantId: 1 }, { unique: true });
export type MenuItemRecipeDocument = InferSchemaType<typeof MenuItemRecipeSchema>;
export const MenuItemRecipe: Model<MenuItemRecipeDocument> =
  (models.MenuItemRecipe as Model<MenuItemRecipeDocument>) || model<MenuItemRecipeDocument>("MenuItemRecipe", MenuItemRecipeSchema);
