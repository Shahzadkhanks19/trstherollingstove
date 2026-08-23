import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ExpenseBreakdownSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    count: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0, default: 0 },
    paid: { type: Number, required: true, min: 0, default: 0 },
    outstanding: { type: Number, required: true, min: 0, default: 0 },
    tax: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false, versionKey: false },
);

const ExpenseSnapshotSchema = new Schema(
  {
    periodKey: { type: String, required: true, unique: true, index: true },
    periodStart: { type: Date, required: true, index: true },
    periodEnd: { type: Date, required: true, index: true },
    currency: { type: String, required: true, uppercase: true, default: "INR" },
    metrics: {
      expenseCount: { type: Number, required: true, min: 0, default: 0 },
      approvedCount: { type: Number, required: true, min: 0, default: 0 },
      pendingCount: { type: Number, required: true, min: 0, default: 0 },
      totalExpenses: { type: Number, required: true, min: 0, default: 0 },
      approvedExpenses: { type: Number, required: true, min: 0, default: 0 },
      paidExpenses: { type: Number, required: true, min: 0, default: 0 },
      outstandingExpenses: { type: Number, required: true, min: 0, default: 0 },
      taxPaid: { type: Number, required: true, min: 0, default: 0 },
      recurringCommitments: { type: Number, required: true, min: 0, default: 0 },
      averageExpense: { type: Number, required: true, min: 0, default: 0 },
    },
    byDay: { type: [ExpenseBreakdownSchema], default: [] },
    byCategory: { type: [ExpenseBreakdownSchema], default: [] },
    byDepartment: { type: [ExpenseBreakdownSchema], default: [] },
    byPaymentMethod: { type: [ExpenseBreakdownSchema], default: [] },
    generatedAt: { type: Date, required: true, default: Date.now, index: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    source: { type: String, enum: ["scheduled", "manual", "system"], default: "system" },
  },
  { timestamps: true, versionKey: false },
);

ExpenseSnapshotSchema.index({ periodStart: -1, periodEnd: -1 });
export type ExpenseSnapshotDocument = InferSchemaType<typeof ExpenseSnapshotSchema>;
export const ExpenseSnapshot: Model<ExpenseSnapshotDocument> =
  (models.ExpenseSnapshot as Model<ExpenseSnapshotDocument>) || model<ExpenseSnapshotDocument>("ExpenseSnapshot", ExpenseSnapshotSchema);
