import { InventoryForecastRun } from "@/models/InventoryForecastRun";
import { InventoryForecastSnapshot } from "@/models/InventoryForecastSnapshot";
import { InventoryItem } from "@/models/InventoryItem";
import { InventoryMovement } from "@/models/InventoryMovement";
import {
  publishInventoryEnterpriseEvent,
  recordInventoryAudit,
} from "@/services/inventory-enterprise-events.service";

const OUTBOUND_TYPES = [
  "sale",
  "adjustment_out",
  "wastage",
  "return_out",
  "transfer_out",
];

type ForecastOptions = {
  lookbackDays: number;
  horizonDays: number;
  leadTimeDays: number;
  serviceLevelFactor: number;
  source: "manual" | "scheduled" | "api";
  requestedBy?: string | null;
};

type DailyDemandRow = {
  inventoryItemId: string;
  date: string;
  quantity: number;
};

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0;
  const average = mean(values);
  const variance =
    values.reduce(
      (sum, value) => sum + (value - average) ** 2,
      0,
    ) / values.length;
  return Math.sqrt(variance);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function riskLevel(input: {
  currentStock: number;
  reorderPoint: number;
  daysUntilStockout: number | null;
  leadTimeDays: number;
}) {
  if (
    input.currentStock <= 0 ||
    (input.daysUntilStockout !== null &&
      input.daysUntilStockout <= input.leadTimeDays)
  ) {
    return "critical" as const;
  }

  if (
    input.currentStock <= input.reorderPoint ||
    (input.daysUntilStockout !== null &&
      input.daysUntilStockout <= input.leadTimeDays * 1.5)
  ) {
    return "high" as const;
  }

  if (
    input.daysUntilStockout !== null &&
    input.daysUntilStockout <= input.leadTimeDays * 3
  ) {
    return "medium" as const;
  }

  return "low" as const;
}

function velocityClass(
  forecastDailyDemand: number,
  activeDemandDays: number,
) {
  if (activeDemandDays === 0 || forecastDailyDemand <= 0) {
    return "inactive" as const;
  }
  if (forecastDailyDemand >= 5) return "fast" as const;
  if (forecastDailyDemand >= 1) return "medium" as const;
  return "slow" as const;
}

export async function generateInventoryForecast(
  options: ForecastOptions,
) {
  const startedAt = Date.now();
  const run = await InventoryForecastRun.create({
    status: "running",
    source: options.source,
    lookbackDays: options.lookbackDays,
    horizonDays: options.horizonDays,
    requestedBy: options.requestedBy ?? null,
    startedAt: new Date(),
  });

  try {
    const from = new Date();
    from.setUTCHours(0, 0, 0, 0);
    from.setUTCDate(from.getUTCDate() - options.lookbackDays + 1);

    const [items, movementRows] = await Promise.all([
      InventoryItem.find({ isActive: true })
        .select(
          "name sku category unit currentStock reorderLevel idealStockLevel averageUnitCost",
        )
        .sort({ name: 1 })
        .lean(),
      InventoryMovement.aggregate<DailyDemandRow>([
        {
          $match: {
            type: { $in: OUTBOUND_TYPES },
            createdAt: { $gte: from },
          },
        },
        {
          $group: {
            _id: {
              inventoryItemId: "$inventoryItemId",
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                  timezone: "UTC",
                },
              },
            },
            quantity: { $sum: "$quantity" },
          },
        },
        {
          $project: {
            _id: 0,
            inventoryItemId: {
              $toString: "$_id.inventoryItemId",
            },
            date: "$_id.date",
            quantity: 1,
          },
        },
      ]),
    ]);

    const demandByItem = new Map<string, Map<string, number>>();

    for (const row of movementRows) {
      const itemDemand =
        demandByItem.get(row.inventoryItemId) ??
        new Map<string, number>();
      itemDemand.set(row.date, row.quantity);
      demandByItem.set(row.inventoryItemId, itemDemand);
    }

    const dates = Array.from(
      { length: options.lookbackDays },
      (_, index) => {
        const date = new Date(from);
        date.setUTCDate(date.getUTCDate() + index);
        return date.toISOString().slice(0, 10);
      },
    );

    const generatedAt = new Date();
    const snapshots = items.map((item) => {
      const itemId = String(item._id);
      const demandMap =
        demandByItem.get(itemId) ?? new Map<string, number>();
      const daily = dates.map(
        (date) => demandMap.get(date) ?? 0,
      );

      const recent7 = daily.slice(-7);
      const previous7 = daily.slice(-14, -7);
      const recent30 = daily.slice(-30);
      const averageDailyDemand = mean(daily);
      const recentAverage = mean(recent7);
      const previousAverage = mean(previous7);
      const thirtyDayAverage = mean(recent30);

      const weightedDemand =
        recentAverage * 0.5 +
        thirtyDayAverage * 0.3 +
        averageDailyDemand * 0.2;

      const trendPercent =
        previousAverage > 0
          ? ((recentAverage - previousAverage) /
              previousAverage) *
            100
          : recentAverage > 0
            ? 100
            : 0;

      const trendMultiplier = clamp(
        1 + trendPercent / 200,
        0.6,
        1.6,
      );
      const forecastDailyDemand = Math.max(
        0,
        weightedDemand * trendMultiplier,
      );
      const demandStdDev = standardDeviation(daily);
      const safetyStock =
        options.serviceLevelFactor *
        demandStdDev *
        Math.sqrt(options.leadTimeDays);
      const reorderPoint =
        forecastDailyDemand * options.leadTimeDays +
        safetyStock;

      const horizonDemand =
        forecastDailyDemand * options.horizonDays;
      const idealTarget = Math.max(
        Number(item.idealStockLevel ?? 0),
        horizonDemand + safetyStock,
      );
      const recommendedOrderQuantity = Math.max(
        0,
        idealTarget - Number(item.currentStock ?? 0),
      );
      const daysUntilStockout =
        forecastDailyDemand > 0
          ? Number(item.currentStock ?? 0) /
            forecastDailyDemand
          : null;
      const expectedStockoutDate =
        daysUntilStockout !== null &&
        Number.isFinite(daysUntilStockout)
          ? new Date(
              generatedAt.getTime() +
                daysUntilStockout * 86_400_000,
            )
          : null;

      const activeDemandDays = daily.filter(
        (value) => value > 0,
      ).length;
      const coverageRatio =
        options.lookbackDays > 0
          ? activeDemandDays / options.lookbackDays
          : 0;
      const coefficientOfVariation =
        averageDailyDemand > 0
          ? demandStdDev / averageDailyDemand
          : 1;
      const confidenceScore = clamp(
        35 +
          Math.min(options.lookbackDays, 180) / 3 +
          coverageRatio * 25 -
          coefficientOfVariation * 12,
        10,
        98,
      );

      return {
        runId: run._id,
        inventoryItemId: item._id,
        itemName: item.name,
        sku: item.sku,
        unit: item.unit,
        category: item.category,
        currentStock: round(Number(item.currentStock ?? 0), 4),
        averageDailyDemand: round(averageDailyDemand, 4),
        forecastDailyDemand: round(forecastDailyDemand, 4),
        forecastWeeklyDemand: round(
          forecastDailyDemand * 7,
          4,
        ),
        forecastMonthlyDemand: round(
          forecastDailyDemand * 30,
          4,
        ),
        demandStdDev: round(demandStdDev, 4),
        trendPercent: round(trendPercent, 2),
        safetyStock: round(safetyStock, 4),
        reorderPoint: round(reorderPoint, 4),
        recommendedOrderQuantity: round(
          recommendedOrderQuantity,
          4,
        ),
        recommendedOrderValue: round(
          recommendedOrderQuantity *
            Number(item.averageUnitCost ?? 0),
          2,
        ),
        daysUntilStockout:
          daysUntilStockout === null
            ? null
            : round(daysUntilStockout, 1),
        expectedStockoutDate,
        confidenceScore: round(confidenceScore, 1),
        riskLevel: riskLevel({
          currentStock: Number(item.currentStock ?? 0),
          reorderPoint,
          daysUntilStockout,
          leadTimeDays: options.leadTimeDays,
        }),
        velocityClass: velocityClass(
          forecastDailyDemand,
          activeDemandDays,
        ),
        historyDays: options.lookbackDays,
        activeDemandDays,
        generatedAt,
      };
    });

    if (snapshots.length) {
      await InventoryForecastSnapshot.insertMany(
        snapshots,
        { ordered: false },
      );
    }

    const highRiskCount = snapshots.filter(
      (snapshot) =>
        snapshot.riskLevel === "critical" ||
        snapshot.riskLevel === "high",
    ).length;
    const recommendedOrderValue = snapshots.reduce(
      (sum, snapshot) =>
        sum + snapshot.recommendedOrderValue,
      0,
    );

    run.status = "completed";
    run.itemCount = snapshots.length;
    run.highRiskCount = highRiskCount;
    run.recommendedOrderValue = round(
      recommendedOrderValue,
      2,
    );
    run.durationMs = Date.now() - startedAt;
    run.completedAt = new Date();
    await run.save();

    await recordInventoryAudit({
      actorUserId: options.requestedBy ?? null,
      action: "inventory.forecast_generated",
      entityType: "InventoryForecastRun",
      entityId: String(run._id),
      description: `Inventory forecast generated for ${snapshots.length} items.`,
      metadata: {
        lookbackDays: options.lookbackDays,
        horizonDays: options.horizonDays,
        highRiskCount,
        recommendedOrderValue,
      },
    });

    publishInventoryEnterpriseEvent({
      event: "inventory.report_completed",
      entityId: String(run._id),
      data: {
        reportType: "inventory_forecast",
        itemCount: snapshots.length,
        highRiskCount,
        recommendedOrderValue,
      },
    });

    return {
      runId: String(run._id),
      status: run.status,
      itemCount: snapshots.length,
      highRiskCount,
      recommendedOrderValue: round(
        recommendedOrderValue,
        2,
      ),
      durationMs: run.durationMs,
      generatedAt,
    };
  } catch (error) {
    run.status = "failed";
    run.errorMessage =
      error instanceof Error ? error.message : "Unknown forecast error.";
    run.durationMs = Date.now() - startedAt;
    run.completedAt = new Date();
    await run.save();
    throw error;
  }
}

export async function getLatestForecastRun() {
  return InventoryForecastRun.findOne({
    status: "completed",
  })
    .sort({ completedAt: -1 })
    .lean();
}

export async function getForecastSummary(runId?: string) {
  const run = runId
    ? await InventoryForecastRun.findById(runId).lean()
    : await getLatestForecastRun();

  if (!run) {
    return {
      run: null,
      summary: {
        itemCount: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        recommendedOrderQuantity: 0,
        recommendedOrderValue: 0,
        averageConfidence: 0,
        stockoutWithin7Days: 0,
        fastMoving: 0,
      },
      categories: [],
      riskDistribution: [],
    };
  }

  const [summaryRows, categories, riskDistribution] =
    await Promise.all([
      InventoryForecastSnapshot.aggregate([
        { $match: { runId: run._id } },
        {
          $group: {
            _id: null,
            itemCount: { $sum: 1 },
            critical: {
              $sum: {
                $cond: [
                  { $eq: ["$riskLevel", "critical"] },
                  1,
                  0,
                ],
              },
            },
            high: {
              $sum: {
                $cond: [
                  { $eq: ["$riskLevel", "high"] },
                  1,
                  0,
                ],
              },
            },
            medium: {
              $sum: {
                $cond: [
                  { $eq: ["$riskLevel", "medium"] },
                  1,
                  0,
                ],
              },
            },
            low: {
              $sum: {
                $cond: [
                  { $eq: ["$riskLevel", "low"] },
                  1,
                  0,
                ],
              },
            },
            recommendedOrderQuantity: {
              $sum: "$recommendedOrderQuantity",
            },
            recommendedOrderValue: {
              $sum: "$recommendedOrderValue",
            },
            averageConfidence: {
              $avg: "$confidenceScore",
            },
            stockoutWithin7Days: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$daysUntilStockout", null] },
                      { $lte: ["$daysUntilStockout", 7] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            fastMoving: {
              $sum: {
                $cond: [
                  { $eq: ["$velocityClass", "fast"] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      InventoryForecastSnapshot.aggregate([
        { $match: { runId: run._id } },
        {
          $group: {
            _id: "$category",
            items: { $sum: 1 },
            recommendedOrderValue: {
              $sum: "$recommendedOrderValue",
            },
            forecastMonthlyDemand: {
              $sum: "$forecastMonthlyDemand",
            },
          },
        },
        { $sort: { recommendedOrderValue: -1 } },
      ]),
      InventoryForecastSnapshot.aggregate([
        { $match: { runId: run._id } },
        {
          $group: {
            _id: "$riskLevel",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

  return {
    run: {
      id: String(run._id),
      status: run.status,
      source: run.source,
      lookbackDays: run.lookbackDays,
      horizonDays: run.horizonDays,
      itemCount: run.itemCount,
      highRiskCount: run.highRiskCount,
      recommendedOrderValue:
        run.recommendedOrderValue,
      durationMs: run.durationMs,
      completedAt: run.completedAt,
    },
    summary: summaryRows[0] ?? {
      itemCount: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      recommendedOrderQuantity: 0,
      recommendedOrderValue: 0,
      averageConfidence: 0,
      stockoutWithin7Days: 0,
      fastMoving: 0,
    },
    categories,
    riskDistribution,
  };
}
