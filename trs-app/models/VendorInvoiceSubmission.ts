import { Schema, model, models, type Model, type Types } from "mongoose";
import type { VendorInvoiceStatus } from "@/types/production-vendor";

export interface VendorInvoiceSubmissionDocument {
  _id: Types.ObjectId;
  vendorId: Types.ObjectId;
  purchaseOrderId?: Types.ObjectId | null;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate?: Date | null;
  currency: string;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  status: VendorInvoiceStatus;
  documentUrl: string;
  originalFilename: string;
  notes: string;
  submittedAt: Date;
  reviewedAt?: Date | null;
  reviewedBy?: Types.ObjectId | null;
  rejectionReason: string;
  paidAt?: Date | null;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VendorInvoiceSubmissionSchema =
  new Schema<VendorInvoiceSubmissionDocument>(
    {
      vendorId: {
        type: Schema.Types.ObjectId,
        ref: "VendorProfile",
        required: true,
        index: true,
      },
      purchaseOrderId: {
        type: Schema.Types.ObjectId,
        ref: "PurchaseOrder",
        default: null,
        index: true,
      },
      invoiceNumber: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        maxlength: 100,
      },
      invoiceDate: { type: Date, required: true, index: true },
      dueDate: { type: Date, default: null },
      currency: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        default: "INR",
      },
      subtotal: { type: Number, required: true, min: 0 },
      taxTotal: { type: Number, required: true, min: 0, default: 0 },
      grandTotal: { type: Number, required: true, min: 0 },
      status: {
        type: String,
        enum: ["submitted", "under_review", "approved", "rejected", "paid"],
        default: "submitted",
        required: true,
        index: true,
      },
      documentUrl: { type: String, required: true, trim: true },
      originalFilename: { type: String, required: true, trim: true },
      notes: { type: String, trim: true, default: "", maxlength: 2000 },
      submittedAt: { type: Date, required: true, default: Date.now },
      reviewedAt: { type: Date, default: null },
      reviewedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
      rejectionReason: { type: String, trim: true, default: "", maxlength: 1000 },
      paidAt: { type: Date, default: null },
      createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true, versionKey: false }
  );

VendorInvoiceSubmissionSchema.index(
  { vendorId: 1, invoiceNumber: 1 },
  { unique: true }
);
VendorInvoiceSubmissionSchema.index({ status: 1, submittedAt: -1 });

export const VendorInvoiceSubmission: Model<VendorInvoiceSubmissionDocument> =
  (models.VendorInvoiceSubmission as
    | Model<VendorInvoiceSubmissionDocument>
    | undefined) ??
  model<VendorInvoiceSubmissionDocument>(
    "VendorInvoiceSubmission",
    VendorInvoiceSubmissionSchema
  );
