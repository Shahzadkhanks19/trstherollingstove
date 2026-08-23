import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const SupplierSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 40,
      unique: true,
      index: true,
    },
    contactPerson: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: "",
    },
    alternatePhone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: "",
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 20,
      default: "",
    },
    addressLine1: {
      type: String,
      trim: true,
      maxlength: 240,
      default: "",
    },
    addressLine2: {
      type: String,
      trim: true,
      maxlength: 240,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    state: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    postalCode: {
      type: String,
      trim: true,
      maxlength: 20,
      default: "",
    },
    paymentTermsDays: {
      type: Number,
      min: 0,
      max: 365,
      default: 0,
    },
    creditLimit: {
      type: Number,
      min: 0,
      default: 0,
    },
    outstandingBalance: {
      type: Number,
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1500,
      default: "",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

SupplierSchema.index({
  isActive: 1,
  name: 1,
});

export type SupplierDocument =
  InferSchemaType<typeof SupplierSchema>;

export const Supplier: Model<SupplierDocument> =
  (models.Supplier as Model<SupplierDocument>) ||
  model<SupplierDocument>("Supplier", SupplierSchema);
