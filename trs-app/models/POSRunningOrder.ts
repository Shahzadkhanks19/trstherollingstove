import { Schema, model, models, type Model, type Types } from "mongoose";
import type { PosCartState } from "@/types/pos";
import type { RunningOrderKotRevision } from "@/lib/pos/running-order-kot";

export type POSRunningOrderDocument = {
  _id: Types.ObjectId;
  ticketNumber: string;
  kitchenToken: string;
  shiftId: Types.ObjectId;
  registerId: Types.ObjectId;
  cashierId: Types.ObjectId;
  tableId: Types.ObjectId | null;
  tableName: string;
  guestCount: number;
  status: "open" | "sent_to_kitchen" | "partially_paid" | "settled" | "voided";
  cart: PosCartState;
  kitchenSentAt: Date | null;
  kitchenRevision: number;
  lastKitchenCart: PosCartState | null;
  kotRevisions: RunningOrderKotRevision[];
  settledOrderId: Types.ObjectId | null;
  openedAt: Date;
  settledAt: Date | null;
  voidReason: string;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const RunningOrderKotItemSchema = new Schema(
  {
    action: {
      type: String,
      enum: [
        "initial",
        "addition",
        "modification",
        "cancellation",
        "instruction_update",
      ],
      required: true,
    },
    lineId: { type: String, required: true },
    name: { type: String, required: true },
    variantName: { type: String, default: undefined },
    specialInstructions: { type: String, default: undefined },
    quantity: { type: Number, required: true, min: 0 },
    previousQuantity: { type: Number, default: undefined, min: 0 },
    newQuantity: { type: Number, default: undefined, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    modifiers: {
      type: [
        new Schema(
          {
            groupName: { type: String, default: undefined },
            optionName: { type: String, default: undefined },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    changeSummary: { type: [String], default: [] },
  },
  { _id: false },
);

const RunningOrderKotRevisionSchema = new Schema<RunningOrderKotRevision>(
  {
    revision: { type: Number, required: true, min: 1 },
    type: {
      type: String,
      enum: [
        "initial",
        "addition",
        "modification",
        "cancellation",
        "instruction_update",
      ],
      required: true,
    },
    items: { type: [RunningOrderKotItemSchema], default: [] },
    orderNote: { type: String, default: "" },
    previousOrderNote: { type: String, default: "" },
    createdAt: { type: Date, required: true },
    createdBy: { type: String, required: true },
  },
  { _id: false },
);

const POSRunningOrderSchema = new Schema<POSRunningOrderDocument>({
  ticketNumber: { type: String, required: true, unique: true, index: true },
  kitchenToken: { type: String, required: true, index: true },
  shiftId: { type: Schema.Types.ObjectId, ref: "POSShift", required: true, index: true },
  registerId: { type: Schema.Types.ObjectId, ref: "POSRegister", required: true, index: true },
  cashierId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tableId: { type: Schema.Types.ObjectId, ref: "POSTable", default: null, index: true },
  tableName: { type: String, trim: true, maxlength: 40, default: "" },
  guestCount: { type: Number, min: 1, max: 100, default: 1 },
  status: { type: String, enum: ["open", "sent_to_kitchen", "partially_paid", "settled", "voided"], default: "open", index: true },
  cart: { type: Schema.Types.Mixed, required: true },
  kitchenSentAt: { type: Date, default: null },
  kitchenRevision: { type: Number, min: 0, default: 0 },
  lastKitchenCart: { type: Schema.Types.Mixed, default: null },
  kotRevisions: {
    type: [RunningOrderKotRevisionSchema],
    default: [],
  },
  settledOrderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
  openedAt: { type: Date, default: Date.now, index: true },
  settledAt: { type: Date, default: null },
  voidReason: { type: String, trim: true, maxlength: 500, default: "" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });

POSRunningOrderSchema.index({ tableId: 1, status: 1 });
export const POSRunningOrder: Model<POSRunningOrderDocument> =
  (models.POSRunningOrder as Model<POSRunningOrderDocument>) || model<POSRunningOrderDocument>("POSRunningOrder", POSRunningOrderSchema);
