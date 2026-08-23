import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const POSShiftSchema = new Schema(
  {
    registerId: {
      type: Schema.Types.ObjectId,
      ref: "POSRegister",
      required: true,
      index: true,
    },
    openedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    closedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
      index: true,
    },
    openingCash: {
      type: Number,
      min: 0,
      required: true,
    },
    expectedCash: {
      type: Number,
      min: 0,
      default: 0,
    },
    countedCash: {
      type: Number,
      min: 0,
      default: null,
    },
    cashDifference: {
      type: Number,
      default: null,
    },
    openedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    closedAt: {
      type: Date,
      default: null,
      index: true,
    },
    closingNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    closeApprovedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    closeApprovalNote: { type: String, trim: true, maxlength: 500, default: "" },
    closeSnapshot: {
      orderCount: { type: Number, min: 0, default: 0 },
      grossSales: { type: Number, min: 0, default: 0 },
      refundsTotal: { type: Number, min: 0, default: 0 },
      cashSales: { type: Number, min: 0, default: 0 },
      upiSales: { type: Number, min: 0, default: 0 },
      cashMovementsNet: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

POSShiftSchema.index(
  { registerId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "open" },
  },
);

export type POSShiftDocument =
  InferSchemaType<typeof POSShiftSchema>;

export const POSShift: Model<POSShiftDocument> =
  (models.POSShift as Model<POSShiftDocument>) ||
  model<POSShiftDocument>("POSShift", POSShiftSchema);
