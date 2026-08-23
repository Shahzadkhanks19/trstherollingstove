import { Schema, deleteModel, model, models, type InferSchemaType, type Model } from "mongoose";

const ModifierOptionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    price: { type: Number, default: 0, min: 0 },
    variantPrices: {
      type: [
        new Schema(
          {
            variantLabel: { type: String, required: true, trim: true, maxlength: 80 },
            price: { type: Number, required: true, min: 0 },
          },
          { _id: false, versionKey: false },
        ),
      ],
      default: [],
    },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    maxQuantity: { type: Number, default: 1, min: 1, max: 50 },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true, versionKey: false },
);

const ModifierGroupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    internalName: { type: String, required: true, trim: true, maxlength: 100 },
    selectionType: { type: String, enum: ["single", "multiple", "quantity"], required: true },
    isRequired: { type: Boolean, default: false },
    minSelections: { type: Number, default: 0, min: 0 },
    maxSelections: { type: Number, default: 1, min: 1 },
    options: { type: [ModifierOptionSchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, versionKey: false },
);

ModifierGroupSchema.index({ internalName: 1 }, { unique: true });

export type ModifierGroupDocument = InferSchemaType<typeof ModifierGroupSchema>;

const existingModifierGroupModel = models.ModifierGroup as
  | Model<ModifierGroupDocument>
  | undefined;

if (
  existingModifierGroupModel &&
  !existingModifierGroupModel.schema.path("options.variantPrices")
) {
  deleteModel("ModifierGroup");
}

export const ModifierGroup: Model<ModifierGroupDocument> =
  (models.ModifierGroup as Model<ModifierGroupDocument> | undefined) ??
  model<ModifierGroupDocument>("ModifierGroup", ModifierGroupSchema);
