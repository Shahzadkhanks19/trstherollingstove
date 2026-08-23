import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const AllocationSchema = new Schema({
  month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
  revenueBudget: { type: Number, required: true, min: 0, default: 0 },
  expenseBudget: { type: Number, required: true, min: 0, default: 0 },
  capitalBudget: { type: Number, required: true, min: 0, default: 0 },
  notes: { type: String, trim: true, maxlength: 500, default: "" },
}, { _id: false, versionKey: false });

const BudgetPlanSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  fiscalYear: { type: Number, required: true, min: 2020, max: 2200, index: true },
  department: { type: String, required: true, trim: true, maxlength: 80, default: "Company" },
  scenario: { type: String, enum: ["base", "optimistic", "conservative"], required: true, default: "base", index: true },
  status: { type: String, enum: ["draft", "submitted", "approved", "rejected", "archived"], required: true, default: "draft", index: true },
  currency: { type: String, required: true, uppercase: true, default: "INR" },
  allocations: { type: [AllocationSchema], required: true, default: [] },
  assumptions: { type: [String], default: [] },
  growthRate: { type: Number, min: -100, max: 1000, default: 0 },
  inflationRate: { type: Number, min: -100, max: 1000, default: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  submittedAt: { type: Date, default: null },
  approvedAt: { type: Date, default: null },
  approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  rejectionReason: { type: String, trim: true, maxlength: 500, default: "" },
}, { timestamps: true, versionKey: false });

BudgetPlanSchema.index({ fiscalYear: 1, department: 1, scenario: 1 }, { unique: true });
export type BudgetPlanRecord = InferSchemaType<typeof BudgetPlanSchema>;
export const BudgetPlan: Model<BudgetPlanRecord> =
  (models.BudgetPlan as Model<BudgetPlanRecord>) || model<BudgetPlanRecord>("BudgetPlan", BudgetPlanSchema);
