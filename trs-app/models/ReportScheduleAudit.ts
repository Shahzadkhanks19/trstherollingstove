import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const ReportScheduleAuditSchema = new Schema(
  {
    scheduleId: {
      type: Schema.Types.ObjectId,
      ref: "ScheduledReport",
      default: null,
      index: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "ReportJob",
      default: null,
      index: true,
    },
    action: {
      type: String,
      enum: [
  "created",
  "updated",
  "paused",
  "resumed",
  "run_requested",
  "archived",
  "restored",

  "job_completed",
  "job_retried",
  "job_failed",

  "delivery_started",
  "delivery_completed",
  "delivery_failed"
],
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false },
);

ReportScheduleAuditSchema.index({ scheduleId: 1, createdAt: -1 });
ReportScheduleAuditSchema.index({ actorId: 1, createdAt: -1 });

export type ReportScheduleAuditDocument = InferSchemaType<
  typeof ReportScheduleAuditSchema
>;
export const ReportScheduleAudit: Model<ReportScheduleAuditDocument> =
  (models.ReportScheduleAudit as Model<ReportScheduleAuditDocument>) ||
  model<ReportScheduleAuditDocument>(
    "ReportScheduleAudit",
    ReportScheduleAuditSchema,
  );
