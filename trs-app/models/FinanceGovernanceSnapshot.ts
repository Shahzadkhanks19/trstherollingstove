import { Schema, model, models, type InferSchemaType } from "mongoose";
const financeGovernanceSnapshotSchema = new Schema({
  periodKey: { type: String, required: true, unique: true, index: true },
  periodStart: { type: Date, required: true }, periodEnd: { type: Date, required: true },
  metrics: { totalAuditEvents: { type: Number, default: 0 }, pendingApprovals: { type: Number, default: 0 }, approvedRequests: { type: Number, default: 0 }, rejectedRequests: { type: Number, default: 0 }, expiredRequests: { type: Number, default: 0 }, criticalPending: { type: Number, default: 0 }, pendingValue: { type: Number, default: 0 }, averageDecisionHours: { type: Number, default: 0 }, approvalRate: { type: Number, default: 0 } },
  byModule: { type: [new Schema({ module: String, auditEvents: Number, approvals: Number, pending: Number }, { _id: false })], default: [] },
  recentApprovals: { type: [Schema.Types.Mixed], default: [] }, recentAuditEvents: { type: [Schema.Types.Mixed], default: [] },
  generatedAt: { type: Date, default: Date.now }, source: { type: String, enum: ["manual", "scheduled", "system"], default: "system" },
}, { timestamps: true, versionKey: false });
export type FinanceGovernanceSnapshotDocument = InferSchemaType<typeof financeGovernanceSnapshotSchema>;
export const FinanceGovernanceSnapshot = models.FinanceGovernanceSnapshot ?? model("FinanceGovernanceSnapshot", financeGovernanceSnapshotSchema);
