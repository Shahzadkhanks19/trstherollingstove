import mongoose from "mongoose";

import {
  inspectProductionEnvironment,
} from "@/config/productionReadiness";
import {
  BackgroundJob,
} from "@/models/BackgroundJob";
import {
  SystemSetting,
} from "@/models/SystemSetting";
import type {
  ProductionReadinessReport,
  ReadinessCheck,
} from "@/types/readiness";

async function timedCheck(
  name: string,
  operation: () => Promise<
    Omit<ReadinessCheck, "name">
  >,
): Promise<ReadinessCheck> {
  const startedAt =
    performance.now();

  try {
    const result =
      await operation();

    return {
      name,
      ...result,
      durationMs: Number(
        (
          performance.now() -
          startedAt
        ).toFixed(2),
      ),
    };
  } catch (error) {
    return {
      name,
      status: "fail",
      message:
        error instanceof Error
          ? error.message
          : "Unknown readiness failure.",
      durationMs: Number(
        (
          performance.now() -
          startedAt
        ).toFixed(2),
      ),
    };
  }
}

async function checkDatabase():
Promise<Omit<ReadinessCheck, "name">> {
  const database =
    mongoose.connection.db;

  if (!database) {
    return {
      status: "fail",
      message:
        "MongoDB connection is unavailable.",
    };
  }

  await database.command({
    ping: 1,
  });

  return {
    status: "pass",
    message:
      "MongoDB responded successfully.",
    details: {
      database:
        database.databaseName,
      readyState:
        mongoose.connection.readyState,
    },
  };
}

async function checkSettings():
Promise<Omit<ReadinessCheck, "name">> {
  const count =
    await SystemSetting.countDocuments();

  return {
    status:
      count > 0 ? "pass" : "warn",
    message:
      count > 0
        ? `${count} settings document(s) found.`
        : "No system settings documents found.",
    details: {
      count,
    },
  };
}

async function checkScheduler():
Promise<Omit<ReadinessCheck, "name">> {
  const now = new Date();

  const [
    pending,
    processing,
    failed,
  ] = await Promise.all([
    BackgroundJob.countDocuments({
      status: "queued",
    }),
    BackgroundJob.countDocuments({
      status: "processing",
    }),
    BackgroundJob.countDocuments({
      status: "failed",
      updatedAt: {
        $gte: new Date(
          now.getTime() -
            24 * 60 * 60 * 1000,
        ),
      },
    }),
  ]);

  return {
    status:
      failed > 0 ? "warn" : "pass",
    message:
      failed > 0
        ? `${failed} background job(s) failed in the last 24 hours.`
        : "No recent failed background jobs.",
    details: {
      pending,
      processing,
      failedLast24Hours: failed,
    },
  };
}

function checkEnvironment():
Omit<ReadinessCheck, "name"> {
  const result =
    inspectProductionEnvironment();

  const errors =
    result.issues.filter(
      (issue) =>
        issue.severity === "error",
    );

  const warnings =
    result.issues.filter(
      (issue) =>
        issue.severity === "warning",
    );

  return {
    status:
      errors.length > 0
        ? "fail"
        : warnings.length > 0
          ? "warn"
          : "pass",
    message:
      result.issues.length === 0
        ? "Environment configuration passed."
        : `${errors.length} error(s) and ${warnings.length} warning(s) detected.`,
    details: {
      issues: result.issues,
    },
  };
}

export async function createProductionReadinessReport():
Promise<ProductionReadinessReport> {
  const checks =
    await Promise.all([
      Promise.resolve({
        name: "environment",
        ...checkEnvironment(),
      }),
      timedCheck(
        "database",
        checkDatabase,
      ),
      timedCheck(
        "system-settings",
        checkSettings,
      ),
      timedCheck(
        "background-jobs",
        checkScheduler,
      ),
    ]);

  const summary = {
    passed: checks.filter(
      (check) =>
        check.status === "pass",
    ).length,
    warnings: checks.filter(
      (check) =>
        check.status === "warn",
    ).length,
    failed: checks.filter(
      (check) =>
        check.status === "fail",
    ).length,
  };

  return {
    ready: summary.failed === 0,
    checkedAt:
      new Date().toISOString(),
    checks,
    summary,
  };
}
