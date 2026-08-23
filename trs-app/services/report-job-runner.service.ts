import { randomUUID } from "crypto";
import { Types } from "mongoose";
import { AppError } from "@/lib/errors/AppError";
import { ReportDefinition } from "@/models/ReportDefinition";
import { ReportJob } from "@/models/ReportJob";
import { ReportScheduleAudit } from "@/models/ReportScheduleAudit";
import { ScheduledReport } from "@/models/ScheduledReport";
import { executeReportPreview } from "@/services/report-builder.service";
import { createReportCsv, createReportPdf, createReportWorkbook, reportExportFilename } from "@/services/report-builder-export.service";
import { storeReportJobArtifact, deleteReportJobArtifact } from "@/services/report-job-artifact.service";
import { calculateNextRun } from "@/services/report-scheduler.service";
import { deliverReportJobArtifact } from "@/services/report-delivery.service";
import { getReportAutomationSettings } from "@/services/report-automation.service";
import { sendNotification } from "@/services/notification.service";
import { scheduledReportScheduleSchema } from "@/validators/scheduledReport";
import type { ReportDefinitionInput } from "@/types/report-builder";

const STALE_LOCK_MS = 15 * 60 * 1000;
const MAX_BATCH = 50;

function retryDelayMs(attempt: number): number {
  const base = 60_000;
  return Math.min(60 * 60 * 1000, base * 2 ** Math.max(0, attempt - 1));
}

function failureMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 2000) : "Unknown scheduled report error.";
}

function failureStack(error: unknown): string {
  return error instanceof Error ? (error.stack || "").slice(0, 8000) : "";
}

export async function enqueueDueScheduledReports(limit = 100): Promise<{ scanned: number; queued: number }> {
  const due = await ScheduledReport.find({
    status: "active",
    deletedAt: null,
    nextRunAt: { $ne: null, $lte: new Date() },
  }).sort({ nextRunAt: 1 }).limit(Math.min(Math.max(limit, 1), 500));

  let queued = 0;
  for (const schedule of due) {
    const scheduledFor = schedule.nextRunAt || new Date();
    const deduplicationKey = `scheduled-report:${schedule._id}:${scheduledFor.toISOString()}`;
    const existing = await ReportJob.findOne({ deduplicationKey, status: { $in: ["queued", "processing"] } }).select("_id").lean();
    if (!existing) {
      const job = await ReportJob.create({
        scheduleId: schedule._id,
        reportId: schedule.reportId,
        source: "scheduled",
        format: schedule.format,
        recipients: schedule.recipients,
        status: "queued",
        priority: 5,
        scheduledFor,
        nextAttemptAt: scheduledFor,
        requestedBy: schedule.createdBy,
        deduplicationKey,
      });
      schedule.lastJobId = job._id;
      queued += 1;
    }

    const normalized = scheduledReportScheduleSchema.parse({
      ...schedule.schedule,
      runAt: schedule.schedule.runAt ?? null,
    });
    const next = calculateNextRun(normalized, new Date(scheduledFor.getTime() + 1000));
    schedule.lastRunAt = scheduledFor;
    schedule.nextRunAt = next;
    if (!next && normalized.frequency === "one_time") schedule.status = "completed";
    await schedule.save();
  }
  return { scanned: due.length, queued };
}

async function claimNextReportJob(workerId: string) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_LOCK_MS);
  return ReportJob.findOneAndUpdate(
    {
      scheduledFor: { $lte: now },
      $and: [
        { $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }] },
        { $or: [
          { status: "queued" },
          { status: "processing", lockedAt: { $lt: staleBefore } },
        ] },
      ],
    },
    {
      $set: { status: "processing", lockedAt: now, lockedBy: workerId, startedAt: now, failedAt: null, errorMessage: "", errorStack: "" },
      $inc: { attempt: 1 },
    },
    { sort: { priority: -1, scheduledFor: 1, createdAt: 1 }, returnDocument: "after" },
  );
}

async function executeClaimedJob(job: NonNullable<Awaited<ReturnType<typeof claimNextReportJob>>>, workerId: string) {
  const startedAt = job.startedAt || new Date();
  try {
    const report = await ReportDefinition.findOne({ _id: job.reportId, isArchived: false }).lean();
    if (!report) throw new Error("Saved report is missing or archived.");
    const definition = report as unknown as ReportDefinitionInput;
    const result = await executeReportPreview({
      dataset: definition.dataset,
      columns: definition.columns,
      filters: definition.filters,
      groups: definition.groups,
      sort: definition.sort,
      visualization: definition.visualization,
      chart: definition.chart,
      limit: Number((await getReportAutomationSettings())?.maxRowsPerReport ?? 5000),
    }, String(job.requestedBy), String(job.reportId));

    const format = job.format as "csv" | "xlsx" | "pdf";
    const bytes = format === "csv" ? createReportCsv(result) : format === "xlsx" ? await createReportWorkbook(report.name, result) : await createReportPdf(report.name, result);
    const filename = reportExportFilename(report.name, format);
    const contentType = format === "csv" ? "text/csv; charset=utf-8" : format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf";
    if (job.outputKey) await deleteReportJobArtifact(job.outputKey);
    const artifact = await storeReportJobArtifact({ bytes, filename, contentType, jobId: String(job._id), reportId: String(job.reportId) });
    const completedAt = new Date();

    const completion = await ReportJob.updateOne({ _id: job._id, lockedBy: workerId, status: "processing" }, { $set: {
      status: "completed", completedAt, durationMs: completedAt.getTime() - startedAt.getTime(), rowCount: result.rowCount,
      outputKey: artifact.key, outputSize: artifact.size, outputContentType: contentType, outputFilename: filename,
      lockedAt: null, lockedBy: "", nextAttemptAt: null,
    }});
    if (completion.modifiedCount !== 1) { await deleteReportJobArtifact(artifact.key); return "cancelled" as const; }
    const settings = await getReportAutomationSettings();
    let deliveryStatus: "pending" | "skipped" | "sent" | "failed" = job.recipients.length ? "pending" : "skipped";
    let deliveryError = "";
    let deliveredAt: Date | null = null;
    if (job.recipients.length && settings?.emailDeliveryEnabled !== false) {
      try {
        await deliverReportJobArtifact({ outputKey: artifact.key, outputFilename: filename, recipients: job.recipients, reportName: report.name });
        deliveryStatus = "sent"; deliveredAt = new Date();
      } catch (deliveryFailure) {
        deliveryStatus = "failed"; deliveryError = failureMessage(deliveryFailure);
      }
    } else if (job.recipients.length) deliveryStatus = "skipped";
    await ReportJob.updateOne({ _id: job._id }, { $set: { deliveryStatus, deliveredAt, deliveryError }, $inc: { deliveryAttempts: job.recipients.length ? 1 : 0 } });
    if (job.scheduleId) {
      await Promise.all([
        ScheduledReport.updateOne({ _id: job.scheduleId }, { $inc: { runCount: 1 }, $set: { lastJobId: job._id, lastRunAt: completedAt } }),
        ReportScheduleAudit.create({ scheduleId: job.scheduleId, jobId: job._id, action: deliveryStatus === "failed" ? "delivery_failed" : "job_completed", actorId: job.requestedBy, metadata: { rowCount: result.rowCount, durationMs: completedAt.getTime() - startedAt.getTime(), deliveryStatus, deliveryError } }),
      ]);
    }
    if (settings?.notificationOnSuccess !== false) {
      await sendNotification({ recipientId: String(job.requestedBy), eventKey: "scheduled_report.completed", category: "transactional", type: "system", title: deliveryStatus === "failed" ? "Report generated; delivery failed" : "Scheduled report completed", message: deliveryStatus === "failed" ? `${report.name} was generated, but email delivery failed: ${deliveryError}` : `${report.name} completed with ${result.rowCount} rows.`, actionUrl: "/admin/report-jobs", metadata: { jobId: String(job._id), deliveryStatus }, channels: ["in_app"] }).catch(() => undefined);
    }
    return "completed" as const;
  } catch (error) {
    const now = new Date();
    const shouldRetry = job.attempt < job.maxAttempts;
    await ReportJob.updateOne({ _id: job._id, lockedBy: workerId }, { $set: {
      status: shouldRetry ? "queued" : "failed",
      nextAttemptAt: shouldRetry ? new Date(Date.now() + retryDelayMs(job.attempt)) : null,
      failedAt: shouldRetry ? null : now,
      durationMs: now.getTime() - startedAt.getTime(),
      lockedAt: null, lockedBy: "", errorMessage: failureMessage(error), errorStack: failureStack(error),
    }});
    if (job.scheduleId) {
      await Promise.all([
        shouldRetry ? Promise.resolve() : ScheduledReport.updateOne({ _id: job.scheduleId }, { $inc: { failureCount: 1 }, $set: { lastJobId: job._id } }),
        ReportScheduleAudit.create({ scheduleId: job.scheduleId, jobId: job._id, action: shouldRetry ? "job_retried" : "job_failed", actorId: job.requestedBy, metadata: { attempt: job.attempt, maxAttempts: job.maxAttempts, error: failureMessage(error) } }),
      ]);
    }
    if (!shouldRetry) {
      const settings = await getReportAutomationSettings();
      if (settings?.notificationOnFailure !== false) await sendNotification({ recipientId: String(job.requestedBy), eventKey: "scheduled_report.failed", category: "transactional", type: "system", title: "Scheduled report failed", message: failureMessage(error), actionUrl: "/admin/report-jobs", metadata: { jobId: String(job._id) }, channels: ["in_app"] }).catch(() => undefined);
    }
    return shouldRetry ? "retried" as const : "failed" as const;
  }
}

export async function runReportJobWorker(limit = 10) {
  const workerId = `${process.env.HOSTNAME || "trs-report-worker"}-${randomUUID()}`;
  const summary = { workerId, processed: 0, completed: 0, failed: 0, retried: 0 };
  for (let index = 0; index < Math.min(Math.max(limit, 1), MAX_BATCH); index += 1) {
    const job = await claimNextReportJob(workerId);
    if (!job) break;
    summary.processed += 1;
    const status = await executeClaimedJob(job, workerId);
    if (status === "completed") summary.completed += 1;
    if (status === "failed") summary.failed += 1;
    if (status === "retried") summary.retried += 1;
  }
  return summary;
}

export async function getReportJobQueueSummary() {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_LOCK_MS);
  const [statusRows, averageRows, staleProcessing] = await Promise.all([
    ReportJob.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ReportJob.aggregate<{ _id: null; averageDurationMs: number }>([{ $match: { status: "completed", durationMs: { $gt: 0 } } }, { $group: { _id: null, averageDurationMs: { $avg: "$durationMs" } } }]),
    ReportJob.countDocuments({ status: "processing", lockedAt: { $lt: staleBefore } }),
  ]);
  const counts = Object.fromEntries(statusRows.map((row) => [row._id, row.count]));
  return {
    queued: counts.queued || 0,
    processing: counts.processing || 0,
    completed: counts.completed || 0,
    failed: counts.failed || 0,
    cancelled: counts.cancelled || 0,
    staleProcessing,
    averageDurationMs: Math.round(averageRows[0]?.averageDurationMs || 0),
  };
}

export async function retryReportJob(id: string, actorId: string) {
  const job = await ReportJob.findById(id);
  if (!job) throw new AppError("Report job not found.", 404);
  if (!Types.ObjectId.isValid(actorId)) throw new AppError("Invalid actor.", 422);
  job.status = "queued";
  job.nextAttemptAt = new Date();
  job.failedAt = null;
  job.completedAt = null;
  job.lockedAt = null;
  job.lockedBy = "";
  job.errorMessage = "";
  job.errorStack = "";
  job.requestedBy = new Types.ObjectId(actorId) as never;
  await job.save();
  return job;
}

export async function cancelReportJob(id: string) {
  const job = await ReportJob.findOneAndUpdate({ _id: id, status: { $in: ["queued", "processing"] } }, { $set: { status: "cancelled", lockedAt: null, lockedBy: "", nextAttemptAt: null, completedAt: new Date() } }, { returnDocument: "after" });
  if (!job) throw new AppError("Only queued or processing jobs can be cancelled.", 409);
  return job;
}
