import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const POSRecipeIngredientSchema = new Schema(
  {
    inventoryItemId: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true },
    quantity: { type: Number, min: 0.0001, required: true },
  },
  { _id: true, versionKey: false },
);

const POSItemRecipeSchema = new Schema(
  {
    posItemId: { type: Schema.Types.ObjectId, ref: "POSItem", required: true, unique: true, index: true },
    yieldQuantity: { type: Number, min: 1, default: 1 },
    ingredients: { type: [POSRecipeIngredientSchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);

export type POSItemRecipeDocument = InferSchemaType<typeof POSItemRecipeSchema>;
export const POSItemRecipe: Model<POSItemRecipeDocument> =
  (models.POSItemRecipe as Model<POSItemRecipeDocument>) ||
  model<POSItemRecipeDocument>("POSItemRecipe", POSItemRecipeSchema);
