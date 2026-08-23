import { ReportDefinition } from "@/models/ReportDefinition";
import { ReportVersion } from "@/models/ReportVersion";
import { AppError } from "@/lib/errors/AppError";

const SNAPSHOT_FIELDS = ["name","description","dataset","columns","filters","groups","sort","visualization","chart","visibility","tags","isFavorite"] as const;

export function reportSnapshot(source: Record<string, unknown>) {
  return Object.fromEntries(SNAPSHOT_FIELDS.map((field) => [field, source[field]]));
}

export async function createReportVersion(reportId: string, actorId: string, changeSummary: string) {
  const current = await ReportDefinition.findById(reportId).lean();
  if (!current) throw new AppError("Report not found.", 404);
  await ReportVersion.updateOne(
    { reportId: current._id, version: current.version },
    { $setOnInsert: { snapshot: reportSnapshot(current as unknown as Record<string, unknown>), changeSummary, createdBy: actorId } },
    { upsert: true },
  );
}

export async function restoreReportVersion(reportId: string, version: number, actorId: string) {
  const versionRecord = await ReportVersion.findOne({ reportId, version }).lean();
  if (!versionRecord) throw new AppError("Report version not found.", 404);
  const report = await ReportDefinition.findOneAndUpdate(
    { _id: reportId, createdBy: actorId },
    { $set: { ...(versionRecord.snapshot as Record<string, unknown>), updatedBy: actorId }, $inc: { version: 1 } },
    { new: true },
  ).lean();
  if (!report) throw new AppError("Only the report owner can restore a version.", 403);
  return report;
}
