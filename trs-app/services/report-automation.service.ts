import mongoose, { Types } from "mongoose";
import { ReportAutomationSettings } from "@/models/ReportAutomationSettings";
import { ReportJob } from "@/models/ReportJob";
import { ScheduledReport } from "@/models/ScheduledReport";
import { deleteReportJobArtifact } from "@/services/report-job-artifact.service";

export async function getReportAutomationSettings() {
  return ReportAutomationSettings.findOneAndUpdate(
    { key: "global" },
    { $setOnInsert: { key: "global" } },
    { upsert: true, returnDocument: "after" },
  ).lean();
}

export async function updateReportAutomationSettings(input: Record<string, unknown>, actorId: string) {
  return ReportAutomationSettings.findOneAndUpdate(
    { key: "global" },
    { $set: { ...input, updatedBy: new Types.ObjectId(actorId) }, $setOnInsert: { key: "global" } },
    { upsert: true, returnDocument: "after", runValidators: true },
  ).lean();
}

export async function getReportAutomationMonitor() {
  const settings = await getReportAutomationSettings();
  const staleBefore = new Date(Date.now() - Number(settings?.staleWorkerMinutes ?? 15) * 60_000);
  const [statusRows, deliveryRows, schedules, storageRows, recentFailures, staleProcessing] = await Promise.all([
    ReportJob.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ReportJob.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$deliveryStatus", count: { $sum: 1 } } }]),
    ScheduledReport.aggregate<{ _id: string; count: number }>([{ $match: { deletedAt: null } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    ReportJob.aggregate<{ _id: null; bytes: number; files: number }>([{ $match: { outputKey: { $ne: "" } } }, { $group: { _id: null, bytes: { $sum: "$outputSize" }, files: { $sum: 1 } } }]),
    ReportJob.find({ status: "failed" }).select("errorMessage outputFilename failedAt reportId").populate("reportId", "name").sort({ failedAt: -1 }).limit(10).lean(),
    ReportJob.countDocuments({ status: "processing", lockedAt: { $lt: staleBefore } }),
  ]);
  const jobs = Object.fromEntries(statusRows.map((row) => [row._id, row.count]));
  const deliveries = Object.fromEntries(deliveryRows.map((row) => [row._id || "pending", row.count]));
  const scheduleCounts = Object.fromEntries(schedules.map((row) => [row._id, row.count]));
  const totalFinished = (jobs.completed || 0) + (jobs.failed || 0);
  return {
    settings,
    jobs,
    deliveries,
    schedules: scheduleCounts,
    storage: storageRows[0] || { bytes: 0, files: 0 },
    staleProcessing,
    successRate: totalFinished ? Math.round(((jobs.completed || 0) / totalFinished) * 1000) / 10 : 100,
    queueHealthy: (jobs.queued || 0) < Number(settings?.queueWarningThreshold ?? 100) && staleProcessing === 0,
    recentFailures,
  };
}

export async function cleanupExpiredReportArtifacts() {
  const settings = await getReportAutomationSettings();
  const artifactBefore = new Date(Date.now() - Number(settings?.artifactRetentionDays ?? 30) * 86_400_000);
  const failedBefore = new Date(Date.now() - Number(settings?.failedJobRetentionDays ?? 90) * 86_400_000);
  const artifacts = await ReportJob.find({ status: "completed", completedAt: { $lt: artifactBefore }, outputKey: { $ne: "" } }).select("outputKey").limit(1000);
  for (const job of artifacts) {
    await deleteReportJobArtifact(job.outputKey);
    job.outputKey = ""; job.outputSize = 0; job.outputContentType = ""; job.outputFilename = "";
    await job.save();
  }
  const removed = await ReportJob.deleteMany({ status: { $in: ["failed", "cancelled"] }, updatedAt: { $lt: failedBefore } });
  return { artifactsRemoved: artifacts.length, jobsRemoved: removed.deletedCount };
}

export function reportArtifactsBucketName() { return "report-job-artifacts"; }
export function reportArtifactsCollectionName() { return `${reportArtifactsBucketName()}.files`; }
export function databaseReady() { return Boolean(mongoose.connection.db); }
