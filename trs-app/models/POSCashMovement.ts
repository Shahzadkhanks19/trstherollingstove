import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const POSCashMovementSchema = new Schema(
  {
    shiftId: {
      type: Schema.Types.ObjectId,
      ref: "POSShift",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["cash_in", "cash_out", "cash_sale", "cash_refund"],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      min: 0.01,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    referenceType: {
      type: String,
      enum: ["manual", "order", "payment", "refund"],
      default: "manual",
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    createdBy: {
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

POSCashMovementSchema.index({ shiftId: 1, createdAt: -1 });

export type POSCashMovementDocument =
  InferSchemaType<typeof POSCashMovementSchema>;

export const POSCashMovement: Model<POSCashMovementDocument> =
  (models.POSCashMovement as Model<POSCashMovementDocument>) ||
  model<POSCashMovementDocument>(
    "POSCashMovement",
    POSCashMovementSchema,
  );
