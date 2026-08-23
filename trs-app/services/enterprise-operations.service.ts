import mongoose from "mongoose";
import { BackgroundJob } from "@/models/BackgroundJob";
import { EnterpriseHealthSnapshot } from "@/models/EnterpriseHealthSnapshot";
import { InventoryAlertEvent } from "@/models/InventoryAlertEvent";
import { InventoryAutomationJob } from "@/models/InventoryAutomationJob";
import { InventoryReportCache } from "@/models/InventoryReportCache";
import { ExecutiveBIReportRun } from "@/models/ExecutiveBIReportRun";
import { InventoryForecastRun } from "@/models/InventoryForecastRun";
import { SupplierIntelligenceRun } from "@/models/SupplierIntelligenceRun";
import { createProductionReadinessReport } from "@/services/productionReadiness.service";

export type EnterpriseCheck = { name: string; status: "pass" | "warn" | "fail"; message: string; value?: number | string | boolean };

function ageHours(value?: Date | null) {
  return value ? Math.max(0, (Date.now() - value.getTime()) / 3_600_000) : null;
}

export async function buildEnterpriseHealthSnapshot(source: "manual" | "scheduled" | "api" = "manual", generatedBy?: string | null) {
  const started = performance.now();
  const now = new Date();
  const since24h = new Date(now.getTime() - 86_400_000);
  const staleJobBefore = new Date(now.getTime() - 60 * 60 * 1000);
  const readiness = await createProductionReadinessReport();
  const database = mongoose.connection.db;
  const [openAlerts, criticalAlerts, failedAutomationJobs, queuedAutomationJobs, failedBackgroundJobs, staleBackgroundJobs, expiredCacheEntries, activeCacheEntries, latestForecast, latestSupplier, latestExecutive] = await Promise.all([
    InventoryAlertEvent.countDocuments({ status: "open" }),
    InventoryAlertEvent.countDocuments({ status: "open", severity: "critical" }),
    InventoryAutomationJob.countDocuments({ status: "failed", updatedAt: { $gte: since24h } }),
    InventoryAutomationJob.countDocuments({ status: { $in: ["queued", "running"] } }),
    BackgroundJob.countDocuments({ status: "failed", updatedAt: { $gte: since24h } }),
    BackgroundJob.countDocuments({ status: "processing" as const, lockedAt: { $lte: staleJobBefore } }),
    InventoryReportCache.countDocuments({ expiresAt: { $lte: now } }),
    InventoryReportCache.countDocuments({ expiresAt: { $gt: now } }),
    InventoryForecastRun.findOne({ status: "completed" }).sort({ completedAt: -1, createdAt: -1 }).lean(),
    SupplierIntelligenceRun.findOne({ status: "completed" }).sort({ completedAt: -1, createdAt: -1 }).lean(),
    ExecutiveBIReportRun.findOne({ status: "completed" }).sort({ completedAt: -1, createdAt: -1 }).lean(),
  ]);

  let databaseStats: Record<string, number> = {};
  if (database) {
    const stats = await database.stats();
    databaseStats = { collections: stats.collections, objects: stats.objects, dataSize: stats.dataSize, storageSize: stats.storageSize, indexes: stats.indexes, indexSize: stats.indexSize };
  }

  const checks: EnterpriseCheck[] = readiness.checks.map((check) => ({ name: check.name, status: check.status, message: check.message }));
  checks.push(
    { name: "critical-alerts", status: criticalAlerts > 0 ? "fail" : openAlerts > 10 ? "warn" : "pass", message: criticalAlerts > 0 ? `${criticalAlerts} critical inventory alert(s) require action.` : `${openAlerts} open inventory alert(s).`, value: criticalAlerts },
    { name: "automation-jobs", status: failedAutomationJobs > 0 ? "fail" : queuedAutomationJobs > 20 ? "warn" : "pass", message: `${failedAutomationJobs} failed and ${queuedAutomationJobs} queued/running inventory automation job(s).`, value: failedAutomationJobs },
    { name: "background-jobs", status: staleBackgroundJobs > 0 ? "fail" : failedBackgroundJobs > 0 ? "warn" : "pass", message: `${failedBackgroundJobs} failed in 24h; ${staleBackgroundJobs} stale processing job(s).`, value: staleBackgroundJobs },
    { name: "report-cache", status: expiredCacheEntries > 100 ? "warn" : "pass", message: `${activeCacheEntries} active and ${expiredCacheEntries} expired cache entries.`, value: expiredCacheEntries },
    { name: "forecast-freshness", status: ageHours(latestForecast?.completedAt) === null ? "warn" : ageHours(latestForecast?.completedAt)! > 48 ? "warn" : "pass", message: latestForecast ? `Latest forecast is ${ageHours(latestForecast.completedAt)?.toFixed(1)} hours old.` : "No completed inventory forecast found." },
    { name: "supplier-intelligence-freshness", status: ageHours(latestSupplier?.completedAt) === null ? "warn" : ageHours(latestSupplier?.completedAt)! > 168 ? "warn" : "pass", message: latestSupplier ? `Latest supplier intelligence is ${ageHours(latestSupplier.completedAt)?.toFixed(1)} hours old.` : "No completed supplier intelligence run found." },
    { name: "executive-bi-freshness", status: ageHours(latestExecutive?.completedAt) === null ? "warn" : ageHours(latestExecutive?.completedAt)! > 48 ? "warn" : "pass", message: latestExecutive ? `Latest Executive BI report is ${ageHours(latestExecutive.completedAt)?.toFixed(1)} hours old.` : "No completed Executive BI report found." },
    { name: "realtime", status: process.env.REALTIME_SERVER_URL && process.env.REALTIME_INTERNAL_SECRET ? "pass" : "warn", message: process.env.REALTIME_SERVER_URL && process.env.REALTIME_INTERNAL_SECRET ? "Realtime integration is configured." : "Realtime server configuration is incomplete." },
    { name: "scheduler", status: process.env.CRON_SECRET ? "pass" : "warn", message: process.env.CRON_SECRET ? "Scheduler secret is configured." : "CRON_SECRET is not configured." },
  );

  const weights = { pass: 1, warn: 0.55, fail: 0 } as const;
  const score = Number((checks.reduce((sum, check) => sum + weights[check.status], 0) / Math.max(1, checks.length) * 100).toFixed(1));
  const failures = checks.filter((check) => check.status === "fail").length;
  const status = failures > 0 || score < 60 ? "critical" : score < 85 ? "degraded" : "healthy";
  const recommendations = checks.filter((check) => check.status !== "pass").map((check) => {
    const mapping: Record<string, string> = {
      "critical-alerts": "Resolve critical inventory alerts and assign owners.",
      "automation-jobs": "Retry or investigate failed inventory automation jobs.",
      "background-jobs": "Release stale job locks and inspect recent failures.",
      "report-cache": "Run expired report-cache cleanup.",
      "forecast-freshness": "Generate a fresh inventory forecast.",
      "supplier-intelligence-freshness": "Generate a fresh supplier intelligence report.",
      "executive-bi-freshness": "Generate a fresh Executive BI report.",
      realtime: "Configure REALTIME_SERVER_URL and REALTIME_INTERNAL_SECRET.",
      scheduler: "Configure CRON_SECRET and production schedules.",
    };
    return mapping[check.name] ?? `Review the ${check.name} readiness check.`;
  });

  const metrics = { openAlerts, criticalAlerts, failedAutomationJobs, queuedAutomationJobs, failedBackgroundJobs, staleBackgroundJobs, expiredCacheEntries, activeCacheEntries, database: databaseStats, latestRuns: { forecastAt: latestForecast?.completedAt ?? null, supplierAt: latestSupplier?.completedAt ?? null, executiveAt: latestExecutive?.completedAt ?? null } };
  const durationMs = Number((performance.now() - started).toFixed(2));
  const snapshot = await EnterpriseHealthSnapshot.create({ status, score, checks, metrics, recommendations, source, durationMs, generatedBy: generatedBy || null, generatedAt: now });
  return snapshot.toObject();
}

export async function getEnterpriseOperationsSummary() {
  const latest = await EnterpriseHealthSnapshot.findOne().sort({ generatedAt: -1 }).lean();
  const history = await EnterpriseHealthSnapshot.find().sort({ generatedAt: -1 }).limit(12).select("status score generatedAt source durationMs").lean();
  return { latest, history };
}

export async function runEnterpriseMaintenance(input: { action: "cleanup-expired-cache" | "release-stale-jobs"; dryRun: boolean; staleMinutes: number }) {
  const now = new Date();
  if (input.action === "cleanup-expired-cache") {
    const filter = { expiresAt: { $lte: now } };
    const matched = await InventoryReportCache.countDocuments(filter);
    if (!input.dryRun) await InventoryReportCache.deleteMany(filter);
    return { action: input.action, dryRun: input.dryRun, matched, affected: input.dryRun ? 0 : matched };
  }
  const threshold = new Date(now.getTime() - input.staleMinutes * 60_000);
  const filter = { status: "processing" as const, lockedAt: { $lte: threshold } };
  const matched = await BackgroundJob.countDocuments(filter);
  if (!input.dryRun) await BackgroundJob.updateMany(filter, { $set: { status: "queued", lockedAt: null, lockedBy: "", runAt: now }, $inc: { attempts: 1 } });
  return { action: input.action, dryRun: input.dryRun, matched, affected: input.dryRun ? 0 : matched };
}
