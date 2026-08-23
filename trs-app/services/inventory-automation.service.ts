import { InventoryAutomationJob } from "@/models/InventoryAutomationJob";
import { InventoryScheduledReport } from "@/models/InventoryScheduledReport";
import { evaluateInventoryAlerts } from "@/services/inventory-alert.service";
import {
  generateInventoryReport,
  type InventoryReportFilters,
  type InventoryReportType,
} from "@/services/inventory-report.service";
import { deliverInventoryReportByEmail } from "@/services/inventory-report-delivery.service";
import { publishRealtimeEventSafely } from "@/services/realtimePublisher.service";

type JobType =
  | "alert_scan"
  | "daily_summary"
  | "weekly_report"
  | "monthly_valuation"
  | "expiry_report"
  | "consumption_report"
  | "abc_analysis";

function reportTypeForJob(
  jobType: JobType,
): InventoryReportType | null {
  if (jobType === "monthly_valuation") return "valuation";
  if (jobType === "expiry_report") return "expiry";
  if (jobType === "consumption_report") return "consumption";
  if (jobType === "abc_analysis") return "abc_analysis";
  if (jobType === "weekly_report") return "stock_ledger";
  return null;
}

function nextRunDate(
  current: Date,
  frequency: "daily" | "weekly" | "monthly",
) {
  const next = new Date(current);

  if (frequency === "daily") {
    next.setDate(next.getDate() + 1);
  } else if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
  } else {
    next.setMonth(next.getMonth() + 1);
  }

  return next;
}

async function runJobPayload(
  jobType: JobType,
  payload: Record<string, unknown>,
) {
  if (jobType === "alert_scan") {
    const ruleIds = Array.isArray(payload.ruleIds)
      ? payload.ruleIds.map(String)
      : undefined;

    return evaluateInventoryAlerts(ruleIds);
  }

  if (jobType === "daily_summary") {
    const [valuation, expiry] = await Promise.all([
      generateInventoryReport("valuation", {}),
      generateInventoryReport("expiry", {
        days: 7,
      } as InventoryReportFilters),
    ]);

    return {
      valuationRows: valuation.length,
      expiryRows: expiry.length,
      generatedAt: new Date(),
    };
  }

  const reportType = reportTypeForJob(jobType);

  if (!reportType) {
    throw new Error(`Unsupported automation job: ${jobType}`);
  }

  const generatedAt = new Date();
  const rows = await generateInventoryReport(
    reportType,
    (payload.filters ?? {}) as InventoryReportFilters,
  );
  const recipients = Array.isArray(payload.recipients)
    ? payload.recipients.map(String)
    : [];
  const deliveries = await deliverInventoryReportByEmail({
    recipients,
    reportType,
    rows,
    generatedAt,
  });

  return {
    reportType,
    rowCount: rows.length,
    preview: rows.slice(0, 10),
    deliveries,
    generatedAt,
  };
}

export async function createAndRunInventoryJob(input: {
  jobType: JobType;
  payload?: Record<string, unknown>;
  source?: "manual" | "cron" | "system";
  createdBy?: string | null;
  scheduleKey?: string;
  maxAttempts?: number;
}) {
  const job = await InventoryAutomationJob.create({
    jobType: input.jobType,
    payload: input.payload ?? {},
    source: input.source ?? "system",
    createdBy: input.createdBy ?? null,
    scheduleKey: input.scheduleKey,
    maxAttempts: input.maxAttempts ?? 3,
    status: "queued",
  });

  return executeInventoryAutomationJob(String(job._id));
}

export async function executeInventoryAutomationJob(
  jobId: string,
) {
  const job = await InventoryAutomationJob.findOneAndUpdate(
    {
      _id: jobId,
      status: { $in: ["queued", "failed"] },
    },
    {
      $set: {
        status: "running",
        startedAt: new Date(),
        errorMessage: "",
      },
      $inc: {
        attempts: 1,
      },
    },
    {
      returnDocument: "after",
    },
  );

  if (!job) {
    return null;
  }

  const startedAt = Date.now();

  try {
    const result = await runJobPayload(
      job.jobType as JobType,
      (job.payload ?? {}) as Record<string, unknown>,
    );

    job.status = "completed";
    job.result = result;
    job.completedAt = new Date();
    job.durationMs = Date.now() - startedAt;
    job.nextRetryAt = null;
    await job.save();

    publishRealtimeEventSafely({
      event: "dashboard.metrics_updated",
      entityId: String(job._id),
      data: {
        source: "inventory_automation",
        jobType: job.jobType,
        status: job.status,
      },
      target: {
        roleKeys: ["super_admin", "admin", "manager"],
      },
    });

    return job;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Inventory automation job failed.";
    const shouldRetry = job.attempts < job.maxAttempts;

    job.status = "failed";
    job.errorMessage = message;
    job.failedAt = new Date();
    job.durationMs = Date.now() - startedAt;
    job.nextRetryAt = shouldRetry
      ? new Date(Date.now() + 5 * 60 * 1000)
      : null;
    await job.save();

    throw error;
  }
}

export async function runDueInventoryJobs(limit = 20) {
  const now = new Date();

  const retryJobs = await InventoryAutomationJob.find({
    status: "failed",
    nextRetryAt: { $lte: now },
    $expr: { $lt: ["$attempts", "$maxAttempts"] },
  })
    .sort({ nextRetryAt: 1 })
    .limit(limit)
    .select("_id")
    .lean();

  const results = [];

  for (const retry of retryJobs) {
    try {
      const result = await executeInventoryAutomationJob(
        String(retry._id),
      );
      results.push({
        jobId: String(retry._id),
        status: result?.status ?? "skipped",
      });
    } catch (error) {
      results.push({
        jobId: String(retry._id),
        status: "failed",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      });
    }
  }

  return {
    processed: results.length,
    results,
    processedAt: now,
  };
}

export async function runDueScheduledReports(limit = 20) {
  const now = new Date();

  const schedules = await InventoryScheduledReport.find({
    enabled: true,
    nextRunAt: { $lte: now },
  })
    .sort({ nextRunAt: 1 })
    .limit(limit);

  const results = [];

  for (const schedule of schedules) {
    const map: Record<
      "valuation" | "stock_ledger" | "consumption" | "expiry" | "abc_analysis",
      JobType
    > = {
      valuation: "monthly_valuation",
      stock_ledger: "weekly_report",
      consumption: "consumption_report",
      expiry: "expiry_report",
      abc_analysis: "abc_analysis",
    };

    try {
      const job = await createAndRunInventoryJob({
        jobType: map[schedule.reportType],
        payload: {
          filters: schedule.filters ?? {},
          recipients: schedule.recipients ?? [],
          format: schedule.format,
          scheduleId: String(schedule._id),
        },
        source: "cron",
        scheduleKey: `scheduled-report:${schedule._id}`,
      });

      schedule.lastRunAt = now;
      schedule.lastJobId = job?._id ?? null;
      schedule.nextRunAt = nextRunDate(
        schedule.nextRunAt,
        schedule.frequency,
      );
      await schedule.save();

      results.push({
        scheduleId: String(schedule._id),
        jobId: job ? String(job._id) : null,
        status: job?.status ?? "skipped",
      });
    } catch (error) {
      results.push({
        scheduleId: String(schedule._id),
        status: "failed",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      });
    }
  }

  return {
    processed: results.length,
    results,
    processedAt: now,
  };
}
