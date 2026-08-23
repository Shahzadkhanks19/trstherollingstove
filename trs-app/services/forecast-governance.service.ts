import { Types } from "mongoose";
import { BusinessForecastRun } from "@/models/BusinessForecastRun";
import { ForecastAccuracySnapshot } from "@/models/ForecastAccuracySnapshot";
import { ForecastAudit } from "@/models/ForecastAudit";
import { ForecastGovernance } from "@/models/ForecastGovernance";
import { Order } from "@/models/Order";
import type { BusinessForecastResult } from "@/services/business-forecast.service";

const DAY_MS = 86_400_000;
const round = (value: number, digits = 2) => Math.round((value + Number.EPSILON) * 10 ** digits) / 10 ** digits;

type ActualRevenueRow = { date: string; revenue: number };
type GovernanceAction = "approve" | "publish" | "unpublish" | "archive" | "restore" | "recalculate_accuracy" | "update_notes";

export async function calculateForecastAccuracy(runId: string) {
  const run = await BusinessForecastRun.findById(runId).select("result completedAt").lean();
  if (!run?.result) throw new Error("Forecast result is unavailable.");
  const result = run.result as BusinessForecastResult;
  const todayKey = new Date().toISOString().slice(0, 10);
  const eligible = result.forecasts.filter((row) => row.date < todayKey);
  if (!eligible.length) {
    return ForecastAccuracySnapshot.create({ runId, evaluatedThrough: new Date(), sampleDays: 0, mae: 0, rmse: 0, mape: 0, bias: 0, accuracyScore: 0, driftDetected: false });
  }
  const from = new Date(`${eligible[0].date}T00:00:00.000Z`);
  const to = new Date(`${eligible.at(-1)?.date ?? eligible[0].date}T23:59:59.999Z`);
  const actualRows = await Order.aggregate<ActualRevenueRow>([
    { $match: { createdAt: { $gte: from, $lte: to }, saleType: "customer", paymentStatus: "paid", status: { $nin: ["cancelled", "rejected"] } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } }, revenue: { $sum: "$grandTotal" } } },
    { $project: { _id: 0, date: "$_id", revenue: 1 } },
  ]);
  const actualMap = new Map(actualRows.map((row) => [row.date, Number(row.revenue ?? 0)]));
  const errors = eligible.map((row) => ({ forecast: row.revenue, actual: actualMap.get(row.date) ?? 0 }));
  const absolute = errors.map((row) => Math.abs(row.forecast - row.actual));
  const mae = absolute.reduce((sum, value) => sum + value, 0) / errors.length;
  const rmse = Math.sqrt(errors.reduce((sum, row) => sum + (row.forecast - row.actual) ** 2, 0) / errors.length);
  const percentageErrors = errors.filter((row) => row.actual > 0).map((row) => Math.abs(row.forecast - row.actual) / row.actual * 100);
  const mape = percentageErrors.length ? percentageErrors.reduce((sum, value) => sum + value, 0) / percentageErrors.length : 100;
  const bias = errors.reduce((sum, row) => sum + (row.forecast - row.actual), 0) / errors.length;
  const accuracyScore = Math.max(0, Math.min(100, 100 - mape));
  const driftDetected = mape > 35 || Math.abs(bias) > Math.max(500, errors.reduce((sum, row) => sum + row.actual, 0) / errors.length * 0.25);
  return ForecastAccuracySnapshot.create({ runId, evaluatedThrough: to, sampleDays: errors.length, mae: round(mae), rmse: round(rmse), mape: round(mape), bias: round(bias), accuracyScore: round(accuracyScore, 1), driftDetected });
}

export async function getForecastGovernanceDashboard(limit = 30) {
  const [runs, governance, accuracy, audits, failedRuns] = await Promise.all([
    BusinessForecastRun.find({ status: "completed" }).sort({ createdAt: -1 }).limit(limit).select("source lookbackDays dataDays durationMs result completedAt createdAt requestedBy").lean(),
    ForecastGovernance.find({}).sort({ updatedAt: -1 }).lean(),
    ForecastAccuracySnapshot.find({}).sort({ createdAt: -1 }).lean(),
    ForecastAudit.find({}).sort({ createdAt: -1 }).limit(100).populate("actorId", "name email").lean(),
    BusinessForecastRun.countDocuments({ status: "failed", createdAt: { $gte: new Date(Date.now() - 7 * DAY_MS) } }),
  ]);
  const governanceMap = new Map(governance.map((row) => [String(row.runId), row]));
  const accuracyMap = new Map<string, (typeof accuracy)[number]>();
  for (const row of accuracy) if (!accuracyMap.has(String(row.runId))) accuracyMap.set(String(row.runId), row);
  const items = runs.map((run) => {
    const id = String(run._id); const result = run.result as BusinessForecastResult | null;
    const control = governanceMap.get(id); const metric = accuracyMap.get(id);
    return { id, source: run.source, lookbackDays: run.lookbackDays, dataDays: run.dataDays, durationMs: run.durationMs, completedAt: run.completedAt, createdAt: run.createdAt, qualityScore: result?.quality.score ?? 0, forecast30Revenue: result?.summary.forecast30Revenue ?? 0, status: control?.status ?? "draft", versionNumber: control?.versionNumber ?? 1, modelVersion: control?.modelVersion ?? "statistical-v1", notes: control?.notes ?? "", accuracy: metric ? { sampleDays: metric.sampleDays, mae: metric.mae, rmse: metric.rmse, mape: metric.mape, bias: metric.bias, accuracyScore: metric.accuracyScore, driftDetected: metric.driftDetected, evaluatedThrough: metric.evaluatedThrough } : null };
  });
  const latest = items[0];
  const completedLast7Days = await BusinessForecastRun.countDocuments({ status: "completed", createdAt: { $gte: new Date(Date.now() - 7 * DAY_MS) } });
  const published = items.filter((row) => row.status === "published").length;
  const measured = items.filter((row) => row.accuracy);
  const averageAccuracy = measured.length ? round(measured.reduce((sum, row) => sum + (row.accuracy?.accuracyScore ?? 0), 0) / measured.length, 1) : 0;
  const stale = !latest?.completedAt || Date.now() - new Date(latest.completedAt).getTime() > 24 * 60 * 60 * 1000;
  const reliabilityScore = Math.max(0, Math.round(100 - failedRuns * 12 - (stale ? 20 : 0) - items.filter((row) => row.accuracy?.driftDetected).length * 5));
  return { generatedAt: new Date().toISOString(), summary: { totalRuns: items.length, published, completedLast7Days, failedLast7Days: failedRuns, averageAccuracy, reliabilityScore, stale, latestCompletedAt: latest?.completedAt ?? null }, runs: items, audits };
}

export async function performForecastGovernanceAction(input: { runId: string; action: GovernanceAction; notes: string; actorId: string }) {
  if (!Types.ObjectId.isValid(input.runId)) throw new Error("Invalid forecast run ID.");
  const run = await BusinessForecastRun.findOne({ _id: input.runId, status: "completed" }).select("_id").lean();
  if (!run) throw new Error("Completed forecast run not found.");
  if (input.action === "recalculate_accuracy") {
    const accuracy = await calculateForecastAccuracy(input.runId);
    await ForecastAudit.create({ runId: input.runId, action: "accuracy_recalculated", actorId: input.actorId, notes: input.notes, metadata: { accuracyScore: accuracy.accuracyScore, sampleDays: accuracy.sampleDays } });
    return { message: "Forecast accuracy recalculated." };
  }
  const governance = await ForecastGovernance.findOneAndUpdate({ runId: input.runId }, { $setOnInsert: { runId: input.runId, versionNumber: 1, modelVersion: "statistical-v1" } }, { new: true, upsert: true });
  const now = new Date();
  if (input.action === "approve") { governance.status = "approved"; governance.approvedBy = new Types.ObjectId(input.actorId); governance.approvedAt = now; }
  if (input.action === "publish") { if (!governance.approvedAt) throw new Error("Forecast must be approved before publishing."); governance.status = "published"; governance.publishedBy = new Types.ObjectId(input.actorId); governance.publishedAt = now; }
  if (input.action === "unpublish") { governance.status = "approved"; governance.publishedBy = null; governance.publishedAt = null; }
  if (input.action === "archive") { governance.status = "archived"; governance.archivedBy = new Types.ObjectId(input.actorId); governance.archivedAt = now; }
  if (input.action === "restore") { governance.status = governance.approvedAt ? "approved" : "draft"; governance.archivedBy = null; governance.archivedAt = null; }
  if (input.action === "update_notes") governance.notes = input.notes;
  if (input.notes && input.action !== "update_notes") governance.notes = input.notes;
  await governance.save();
  const auditAction = ({ approve: "approved", publish: "published", unpublish: "unpublished", archive: "archived", restore: "restored", update_notes: "notes_updated" } as const)[input.action];
  await ForecastAudit.create({ runId: input.runId, action: auditAction, actorId: input.actorId, notes: input.notes, metadata: { status: governance.status, versionNumber: governance.versionNumber } });
  return { message: `Forecast ${auditAction.replaceAll("_", " ")}.` };
}
