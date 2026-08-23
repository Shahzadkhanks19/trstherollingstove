import { Schema, model, models, type Model, type Types } from "mongoose";
import type { VendorQuoteLine, VendorQuoteStatus } from "@/types/production-vendor";

export interface VendorQuoteDocument {
  _id: Types.ObjectId;
  quoteNumber: string;
  vendorId: Types.ObjectId;
  purchaseRequestId?: Types.ObjectId | null;
  purchaseOrderId?: Types.ObjectId | null;
  status: VendorQuoteStatus;
  validUntil?: Date | null;
  currency: string;
  lines: VendorQuoteLine[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  deliveryTerms: string;
  paymentTerms: string;
  notes: string;
  submittedAt?: Date | null;
  reviewedAt?: Date | null;
  reviewedBy?: Types.ObjectId | null;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VendorQuoteLineSchema = new Schema(
  {
    purchaseRequestLineId: { type: String, trim: true, default: "" },
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      default: null,
      index: true,
    },
    description: { type: String, required: true, trim: true, maxlength: 300 },
    quantity: { type: Number, required: true, min: 0.000001 },
    unit: { type: String, required: true, trim: true, maxlength: 40 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, required: true, min: 0, max: 100, default: 0 },
    leadTimeDays: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: true }
);

const VendorQuoteSchema = new Schema<VendorQuoteDocument>(
  {
    quoteNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "VendorProfile",
      required: true,
      index: true,
    },
    purchaseRequestId: {
      type: Schema.Types.ObjectId,
      ref: "PurchaseRequest",
      default: null,
      index: true,
    },
    purchaseOrderId: {
      type: Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "submitted", "under_review", "accepted", "rejected", "withdrawn"],
      default: "draft",
      required: true,
      index: true,
    },
    validUntil: { type: Date, default: null, index: true },
    currency: { type: String, required: true, trim: true, uppercase: true, default: "INR" },
    lines: { type: [VendorQuoteLineSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0, default: 0 },
    taxTotal: { type: Number, required: true, min: 0, default: 0 },
    grandTotal: { type: Number, required: true, min: 0, default: 0 },
    deliveryTerms: { type: String, trim: true, default: "", maxlength: 1000 },
    paymentTerms: { type: String, trim: true, default: "", maxlength: 1000 },
    notes: { type: String, trim: true, default: "", maxlength: 2000 },
    submittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false }
);

VendorQuoteSchema.index({ vendorId: 1, createdAt: -1 });
VendorQuoteSchema.index({ status: 1, validUntil: 1 });

export const VendorQuote: Model<VendorQuoteDocument> =
  (models.VendorQuote as Model<VendorQuoteDocument> | undefined) ??
  model<VendorQuoteDocument>("VendorQuote", VendorQuoteSchema);
