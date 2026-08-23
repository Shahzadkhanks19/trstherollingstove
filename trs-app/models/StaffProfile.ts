import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const StaffProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    employeeCode: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    designation: { type: String, trim: true, maxlength: 100, default: "" },
    department: { type: String, enum: ["management", "cashier", "kitchen", "inventory", "operations", "marketing", "other"], default: "other", index: true },
    employmentType: { type: String, enum: ["full_time", "part_time", "contract", "intern"], default: "full_time", index: true },
    joiningDate: { type: Date, default: Date.now },
    shiftName: { type: String, trim: true, maxlength: 80, default: "" },
    emergencyContactName: { type: String, trim: true, maxlength: 80, default: "" },
    emergencyContactPhone: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, maxlength: 500, default: "" },
    notes: { type: String, trim: true, maxlength: 1000, default: "" },
    mealEligible: { type: Boolean, default: true, index: true },
    dailyMealLimit: { type: Number, default: 2, min: 0, max: 20 },
    weeklyMealLimit: { type: Number, default: 14, min: 0, max: 140 },
    monthlyMealLimit: { type: Number, default: 60, min: 0, max: 500 },
    yearlyMealLimit: { type: Number, default: 720, min: 0, max: 5000 },
    requireManagerApprovalOnLimit: { type: Boolean, default: true },
    unlimitedMeals: { type: Boolean, default: false },
    mealSuspendedUntil: { type: Date, default: null },
    mealSuspensionReason: { type: String, trim: true, maxlength: 300, default: "" },
  },
  { timestamps: true, versionKey: false },
);

export type StaffProfileDocument = InferSchemaType<typeof StaffProfileSchema>;
export const StaffProfile: Model<StaffProfileDocument> =
  (models.StaffProfile as Model<StaffProfileDocument>) ||
  model<StaffProfileDocument>("StaffProfile", StaffProfileSchema);
