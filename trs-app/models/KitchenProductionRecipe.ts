import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
const IngredientSchema = new Schema({
  inventoryItemId: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true },
  quantityPerBaseYield: { type: Number, min: 0.0001, required: true },
  wastagePercent: { type: Number, min: 0, max: 100, default: 0 },
  note: { type: String, trim: true, maxlength: 300, default: "" },
}, { _id: true });
const OutputSchema = new Schema({
  inventoryItemId: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true },
  quantityPerBaseYield: { type: Number, min: 0.0001, required: true },
  note: { type: String, trim: true, maxlength: 300, default: "" },
}, { _id: true });
const SchemaDef = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 60, unique: true, index: true },
  category: { type: String, trim: true, maxlength: 100, default: "Prepared food", index: true },
  scalingMode: { type: String, enum: ["ratio", "multiplier"], default: "ratio" },
  baseYieldQuantity: { type: Number, min: 0.0001, required: true },
  yieldUnit: { type: String, trim: true, maxlength: 30, required: true },
  ingredients: { type: [IngredientSchema], default: [] },
  outputs: { type: [OutputSchema], default: [] },
  preparationTimeMinutes: { type: Number, min: 0, max: 1440, default: 0 },
  cookingTimeMinutes: { type: Number, min: 0, max: 1440, default: 0 },
  restingTimeMinutes: { type: Number, min: 0, max: 10080, default: 0 },
  cookingTemperatureC: { type: Number, min: 0, max: 600, default: null },
  shelfLifeHours: { type: Number, min: 0, max: 8760, default: 0 },
  expectedWastagePercent: { type: Number, min: 0, max: 100, default: 0 },
  instructions: { type: String, trim: true, maxlength: 5000, default: "" },
  version: { type: Number, min: 1, default: 1 },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });
export type KitchenProductionRecipeDocument = InferSchemaType<typeof SchemaDef>;
export const KitchenProductionRecipe: Model<KitchenProductionRecipeDocument> =
 (models.KitchenProductionRecipe as Model<KitchenProductionRecipeDocument>) || model<KitchenProductionRecipeDocument>("KitchenProductionRecipe", SchemaDef);
