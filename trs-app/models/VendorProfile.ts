import { Schema, model, models, type Model, type Types } from "mongoose";

export interface VendorProfileDocument {
  _id: Types.ObjectId;
  supplierId: Types.ObjectId;
  userId?: Types.ObjectId | null;
  legalName: string;
  displayName: string;
  email: string;
  phone: string;
  gstin: string;
  pan: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  bankDetails: {
    accountName: string;
    accountNumberMasked: string;
    bankName: string;
    ifsc: string;
    upiId: string;
  };
  isPortalEnabled: boolean;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VendorProfileSchema = new Schema<VendorProfileDocument>(
  {
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      sparse: true,
      index: true,
    },
    legalName: { type: String, required: true, trim: true, maxlength: 180 },
    displayName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, required: true, trim: true, index: true },
    gstin: { type: String, trim: true, uppercase: true, default: "" },
    pan: { type: String, trim: true, uppercase: true, default: "" },
    address: {
      line1: { type: String, trim: true, default: "" },
      line2: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
      state: { type: String, trim: true, default: "" },
      postalCode: { type: String, trim: true, default: "" },
      country: { type: String, trim: true, default: "India" },
    },
    bankDetails: {
      accountName: { type: String, trim: true, default: "" },
      accountNumberMasked: { type: String, trim: true, default: "" },
      bankName: { type: String, trim: true, default: "" },
      ifsc: { type: String, trim: true, uppercase: true, default: "" },
      upiId: { type: String, trim: true, lowercase: true, default: "" },
    },
    isPortalEnabled: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
  },
  { timestamps: true, versionKey: false }
);

VendorProfileSchema.index({ isActive: 1, displayName: 1 });

export const VendorProfile: Model<VendorProfileDocument> =
  (models.VendorProfile as Model<VendorProfileDocument> | undefined) ??
  model<VendorProfileDocument>("VendorProfile", VendorProfileSchema);
