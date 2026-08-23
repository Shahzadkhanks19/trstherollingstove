import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongoose";
import type { HealthStatus } from "@/types/observability";

function memoryUsageMegabytes() {
  const usage = process.memoryUsage();

  return {
    rss: Number((usage.rss / 1024 / 1024).toFixed(2)),
    heapTotal: Number((usage.heapTotal / 1024 / 1024).toFixed(2)),
    heapUsed: Number((usage.heapUsed / 1024 / 1024).toFixed(2)),
    external: Number((usage.external / 1024 / 1024).toFixed(2)),
  };
}

export function getLiveness() {
  return {
    status: "healthy" as HealthStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  };
}

export async function getReadiness() {
  const startedAt = performance.now();

  try {
    await connectToDatabase();
    const database = mongoose.connection.db;

    if (!database) {
      throw new Error("Database handle is unavailable.");
    }

    await database.command({ ping: 1 });

    return {
      status: "healthy" as HealthStatus,
      database: "connected",
      databaseLatencyMs: Number((performance.now() - startedAt).toFixed(2)),
      timestamp: new Date().toISOString(),
    };
  } catch {
    return {
      status: "unhealthy" as HealthStatus,
      database: "disconnected",
      databaseLatencyMs: Number((performance.now() - startedAt).toFixed(2)),
      timestamp: new Date().toISOString(),
    };
  }
}

export function getRuntimeMetrics() {
  return {
    application: process.env.APP_NAME ?? "The Rolling Stove",
    nodeVersion: process.version,
    environment: process.env.NODE_ENV ?? "development",
    uptimeSeconds: Math.floor(process.uptime()),
    memoryMegabytes: memoryUsageMegabytes(),
    timestamp: new Date().toISOString(),
  };
}
