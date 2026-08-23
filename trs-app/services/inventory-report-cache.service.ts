import { createHash } from "node:crypto";
import { InventoryReportCache } from "@/models/InventoryReportCache";
import {
  generateInventoryReport,
  type InventoryReportFilters,
  type InventoryReportType,
} from "@/services/inventory-report.service";

const DEFAULT_TTL_SECONDS = 15 * 60;

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);

  if (
    value &&
    typeof value === "object" &&
    !(value instanceof Date)
  ) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }

  return value instanceof Date ? value.toISOString() : value;
}

export function createInventoryReportCacheKey(
  reportType: InventoryReportType,
  filters: InventoryReportFilters,
) {
  const payload = JSON.stringify({
    reportType,
    filters: stable(filters),
  });

  return createHash("sha256").update(payload).digest("hex");
}

export async function getCachedInventoryReport(
  reportType: InventoryReportType,
  filters: InventoryReportFilters,
) {
  const cacheKey = createInventoryReportCacheKey(
    reportType,
    filters,
  );

  const cache = await InventoryReportCache.findOneAndUpdate(
    {
      cacheKey,
      expiresAt: { $gt: new Date() },
    },
    {
      $inc: { hitCount: 1 },
      $set: { lastHitAt: new Date() },
    },
    {
      returnDocument: "after",
    },
  ).lean();

  return cache
    ? {
        cacheKey,
        cached: true as const,
        rows: cache.rows as Array<Record<string, unknown>>,
        generatedAt: cache.generatedAt,
        expiresAt: cache.expiresAt,
        generationMs: cache.generationMs,
      }
    : null;
}

export async function generateCachedInventoryReport(input: {
  reportType: InventoryReportType;
  filters: InventoryReportFilters;
  generatedBy?: string | null;
  force?: boolean;
  ttlSeconds?: number;
}) {
  if (!input.force) {
    const existing = await getCachedInventoryReport(
      input.reportType,
      input.filters,
    );

    if (existing) return existing;
  }

  const startedAt = Date.now();
  const rows = await generateInventoryReport(
    input.reportType,
    input.filters,
  );
  const generatedAt = new Date();
  const ttlSeconds = Math.max(
    60,
    Math.min(
      input.ttlSeconds ??
        Number(
          process.env.INVENTORY_REPORT_CACHE_TTL_SECONDS ??
            DEFAULT_TTL_SECONDS,
        ),
      86_400,
    ),
  );
  const expiresAt = new Date(
    generatedAt.getTime() + ttlSeconds * 1000,
  );
  const cacheKey = createInventoryReportCacheKey(
    input.reportType,
    input.filters,
  );
  const generationMs = Date.now() - startedAt;

  await InventoryReportCache.findOneAndUpdate(
    { cacheKey },
    {
      $set: {
        reportType: input.reportType,
        filters: input.filters,
        rows,
        rowCount: rows.length,
        generatedAt,
        expiresAt,
        generatedBy: input.generatedBy ?? null,
        generationMs,
      },
      $setOnInsert: {
        hitCount: 0,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
    },
  );

  return {
    cacheKey,
    cached: false as const,
    rows,
    generatedAt,
    expiresAt,
    generationMs,
  };
}

export async function invalidateInventoryReportCache(
  reportType?: InventoryReportType,
) {
  const result = await InventoryReportCache.deleteMany(
    reportType ? { reportType } : {},
  );

  return {
    deletedCount: result.deletedCount,
    reportType: reportType ?? "all",
  };
}

export async function getInventoryReportCacheStatistics() {
  const [summary, byType] = await Promise.all([
    InventoryReportCache.aggregate([
      {
        $group: {
          _id: null,
          entries: { $sum: 1 },
          rows: { $sum: "$rowCount" },
          hits: { $sum: "$hitCount" },
          averageGenerationMs: {
            $avg: "$generationMs",
          },
          oldestGeneratedAt: {
            $min: "$generatedAt",
          },
          newestGeneratedAt: {
            $max: "$generatedAt",
          },
        },
      },
    ]),
    InventoryReportCache.aggregate([
      {
        $group: {
          _id: "$reportType",
          entries: { $sum: 1 },
          rows: { $sum: "$rowCount" },
          hits: { $sum: "$hitCount" },
        },
      },
      { $sort: { entries: -1 } },
    ]),
  ]);

  return {
    ...(summary[0] ?? {
      entries: 0,
      rows: 0,
      hits: 0,
      averageGenerationMs: 0,
      oldestGeneratedAt: null,
      newestGeneratedAt: null,
    }),
    byType,
  };
}
