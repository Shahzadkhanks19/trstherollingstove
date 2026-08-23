import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
const BreakdownSchema = new Schema({ key: { type: String, required: true }, count: { type: Number, required: true, min: 0 }, invoiced: { type: Number, required: true, min: 0 }, paid: { type: Number, required: true, min: 0 }, outstanding: { type: Number, required: true, min: 0 } }, { _id: false });
const AccountsReceivableSnapshotSchema = new Schema({
  periodKey: { type: String, required: true, unique: true, index: true },
  periodStart: { type: Date, required: true, index: true }, periodEnd: { type: Date, required: true, index: true }, currency: { type: String, required: true, default: "INR" },
  metrics: { invoiceCount: { type: Number, required: true, min: 0 }, customerCount: { type: Number, required: true, min: 0 }, issuedAmount: { type: Number, required: true, min: 0 }, collectedAmount: { type: Number, required: true, min: 0 }, outstandingAmount: { type: Number, required: true, min: 0 }, overdueAmount: { type: Number, required: true, min: 0 }, writtenOffAmount: { type: Number, required: true, min: 0 }, creditAmount: { type: Number, required: true, min: 0 }, collectionRate: { type: Number, required: true, min: 0 }, averageDaysOutstanding: { type: Number, required: true, min: 0 } },
  aging: { current: { type: Number, required: true, min: 0 }, days1To30: { type: Number, required: true, min: 0 }, days31To60: { type: Number, required: true, min: 0 }, days61To90: { type: Number, required: true, min: 0 }, daysOver90: { type: Number, required: true, min: 0 } },
  byStatus: { type: [BreakdownSchema], default: [] }, byCustomer: { type: [BreakdownSchema], default: [] }, byDay: { type: [BreakdownSchema], default: [] },
  generatedAt: { type: Date, required: true, default: Date.now }, generatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null }, source: { type: String, enum: ["manual", "scheduled", "system"], required: true },
}, { timestamps: true, versionKey: false });
export type AccountsReceivableSnapshotDocument = InferSchemaType<typeof AccountsReceivableSnapshotSchema>;
export const AccountsReceivableSnapshot: Model<AccountsReceivableSnapshotDocument> = (models.AccountsReceivableSnapshot as Model<AccountsReceivableSnapshotDocument>) || model<AccountsReceivableSnapshotDocument>("AccountsReceivableSnapshot", AccountsReceivableSnapshotSchema);
