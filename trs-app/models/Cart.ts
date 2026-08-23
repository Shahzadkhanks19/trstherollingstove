import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const CartModifierSchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "ModifierGroup", required: true },
    groupName: { type: String, required: true, trim: true, maxlength: 80 },
    optionId: { type: Schema.Types.ObjectId, required: true },
    optionName: { type: String, required: true, trim: true, maxlength: 80 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false, versionKey: false },
);


const ComboSnapshotItemSchema = new Schema(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem", default: null },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    variantId: { type: Schema.Types.ObjectId, default: null },
    variantName: { type: String, trim: true, maxlength: 80, default: "" },
    quantity: { type: Number, required: true, min: 1, max: 50 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false, versionKey: false },
);

const CartItemSchema = new Schema(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    imageUrl: { type: String, trim: true, maxlength: 500, default: "" },
    variantId: { type: Schema.Types.ObjectId, default: null },
    variantName: { type: String, trim: true, maxlength: 80, default: "" },
    baseUnitPrice: { type: Number, required: true, min: 0 },
    isDiscountedItem: { type: Boolean, default: false },
    originalUnitPrice: { type: Number, min: 0, default: null },
    itemDiscountSavings: { type: Number, min: 0, default: null },
    isCombo: { type: Boolean, default: false },
    comboId: { type: Schema.Types.ObjectId, ref: "MenuItem", default: null },
    comboOriginalPrice: { type: Number, min: 0, default: null },
    comboSellingPrice: { type: Number, min: 0, default: null },
    comboSavings: { type: Number, min: 0, default: null },
    comboItems: { type: [ComboSnapshotItemSchema], default: [] },
    modifiers: { type: [CartModifierSchema], default: [] },
    quantity: { type: Number, required: true, min: 1, max: 50 },
    specialInstructions: { type: String, trim: true, maxlength: 500, default: "" },
    lineUnitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: true, versionKey: false },
);

const CartSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    items: { type: [CartItemSchema], default: [] },
    orderMode: {
      type: String,
      enum: ["dine_in", "takeaway"],
      default: "takeaway",
    },
    tableNumber: { type: String, trim: true, maxlength: 30, default: "" },
    requestedPickupAt: { type: Date, default: null },
    customerNote: { type: String, trim: true, maxlength: 500, default: "" },
    subtotal: { type: Number, min: 0, default: 0 },
    taxTotal: { type: Number, min: 0, default: 0 },
    discountTotal: { type: Number, min: 0, default: 0 },
    grandTotal: { type: Number, min: 0, default: 0 },
    itemCount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

export type CartDocument = InferSchemaType<typeof CartSchema>;
export const Cart: Model<CartDocument> =
  (models.Cart as Model<CartDocument>) || model<CartDocument>("Cart", CartSchema);
