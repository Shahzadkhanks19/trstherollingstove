import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const InvoiceModifierSchema = new Schema(
  {
    groupName: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
    optionName: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
    unitPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);


const InvoicePaymentPartSchema = new Schema(
  {
    method: {
      type: String,
      enum: ["cash", "upi", "card", "online"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const InvoiceItemSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    variantName: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
    modifiers: {
      type: [InvoiceModifierSchema],
      default: [],
    },
    specialInstructions: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const InvoiceSchema = new Schema(
  {
    verificationPublicId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
      default: null,
    },
    verificationEnabled: {
      type: Boolean,
      default: true,
    },
    verificationVersion: {
      type: Number,
      min: 1,
      default: 1,
    },
    lastVerifiedAt: {
      type: Date,
      default: null,
    },
    verificationCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    issuedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    businessSnapshot: {
      legalName: {
        type: String,
        trim: true,
        maxlength: 180,
        default: "",
      },
      tradeName: {
        type: String,
        trim: true,
        maxlength: 120,
        default: "",
      },
      phone: {
        type: String,
        trim: true,
        maxlength: 30,
        default: "",
      },
      email: {
        type: String,
        trim: true,
        maxlength: 254,
        default: "",
      },
      gstin: {
        type: String,
        trim: true,
        maxlength: 30,
        default: "",
      },
      address: {
        type: String,
        trim: true,
        maxlength: 700,
        default: "",
      },
    },
    customerSnapshot: {
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
      },
      phone: {
        type: String,
        trim: true,
        maxlength: 30,
        default: "",
      },
      email: {
        type: String,
        trim: true,
        maxlength: 254,
        default: "",
      },
    },
    orderMode: {
      type: String,
      enum: ["dine_in", "takeaway"],
      required: true,
    },
    tableNumber: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "",
    },
    saleType: { type: String, enum: ["customer", "staff_meal", "family_meal", "complimentary", "food_wastage", "kitchen_test"], default: "customer" },
    internalConsumption: {
      personName: { type: String, trim: true, maxlength: 120, default: "" },
      reason: { type: String, trim: true, maxlength: 240, default: "" },
      notes: { type: String, trim: true, maxlength: 500, default: "" },
      menuValue: { type: Number, min: 0, default: 0 },
      approvalStatus: { type: String, trim: true, maxlength: 30, default: "not_required" },
      approvalReason: { type: String, trim: true, maxlength: 500, default: "" },
    },
    paymentMethod: {
      type: String,
      trim: true,
      maxlength: 40,
      default: "",
    },
    paymentStatus: {
      type: String,
      trim: true,
      maxlength: 40,
      default: "",
    },
    paymentBreakdown: {
      type: [InvoicePaymentPartSchema],
      default: [],
    },
    upiReference: { type: String, trim: true, maxlength: 100, default: "" },
    amountTendered: { type: Number, min: 0, default: 0 },
    changeDue: { type: Number, min: 0, default: 0 },
    items: {
      type: [InvoiceItemSchema],
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    packingCharge: { type: Number, required: true, min: 0, default: 0 },
    serviceCharge: { type: Number, required: true, min: 0, default: 0 },
    additionalCharge: { type: Number, required: true, min: 0, default: 0 },
    additionalChargeLabel: { type: String, trim: true, maxlength: 60, default: "Additional charge" },
    taxRate: { type: Number, min: 0, max: 100, default: 0 },
    taxMode: { type: String, enum: ["exclusive", "inclusive"], default: "exclusive" },
    discountReason: { type: String, trim: true, maxlength: 120, default: "" },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      trim: true,
      maxlength: 10,
      default: "INR",
    },
    currencySymbol: {
      type: String,
      trim: true,
      maxlength: 10,
      default: "₹",
    },
    printCount: { type: Number, min: 0, default: 0 },
    lastPrintedAt: { type: Date, default: null },
    lastPrintedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    generatedBy: {
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

export type InvoiceDocument =
  InferSchemaType<typeof InvoiceSchema>;

export const Invoice: Model<InvoiceDocument> =
  (models.Invoice as Model<InvoiceDocument>) ||
  model<InvoiceDocument>("Invoice", InvoiceSchema);
