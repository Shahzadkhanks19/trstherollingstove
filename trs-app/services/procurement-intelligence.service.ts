import { InventoryForecastRun } from "@/models/InventoryForecastRun";
import { InventoryForecastSnapshot } from "@/models/InventoryForecastSnapshot";
import { InventoryMovement } from "@/models/InventoryMovement";
import { ProcurementIntelligenceRun } from "@/models/ProcurementIntelligenceRun";
import { PurchaseOrder } from "@/models/PurchaseOrder";
import { Supplier } from "@/models/Supplier";
import { generateInventoryForecast } from "@/services/inventory-forecast.service";

const DAY_MS = 86_400_000;
const CACHE_MS = 30 * 60 * 1000;
const round = (value: number, digits = 2) =>
  Math.round((value + Number.EPSILON) * 10 ** digits) / 10 ** digits;

export type ProcurementPriority = "critical" | "high" | "medium" | "low";

type SnapshotRow = {
  inventoryItemId: unknown;
  itemName: string;
  sku: string;
  category: string;
  unit: string;
  currentStock: number;
  forecastDailyDemand: number;
  forecastWeeklyDemand: number;
  forecastMonthlyDemand: number;
  trendPercent: number;
  safetyStock: number;
  reorderPoint: number;
  recommendedOrderQuantity: number;
  recommendedOrderValue: number;
  daysUntilStockout: number | null;
  expectedStockoutDate: Date | null;
  confidenceScore: number;
  riskLevel: ProcurementPriority;
  velocityClass: "fast" | "medium" | "slow" | "inactive";
};

type OpenPoRow = {
  inventoryItemId: string;
  openQuantity: number;
  openValue: number;
  earliestDelivery: Date | null;
};

type SupplierHistoryRow = {
  inventoryItemId: string;
  supplierId: string;
  unitCost: number;
  orderDate: Date;
};

type WastageRow = {
  inventoryItemId: string;
  wastageQuantity: number;
  wastageValue: number;
};

type ExpiryRow = {
  inventoryItemId: string;
  trackedQuantity: number;
  trackedValue: number;
  nearestExpiry: Date | null;
};

export type ProcurementRecommendation = {
  inventoryItemId: string;
  itemName: string;
  sku: string;
  category: string;
  unit: string;
  currentStock: number;
  forecastDailyDemand: number;
  forecast7Demand: number;
  forecast30Demand: number;
  forecast90Demand: number;
  daysRemaining: number | null;
  expectedStockoutDate: string | null;
  recommendedPurchaseDate: string;
  priority: ProcurementPriority;
  safetyStock: number;
  reorderPoint: number;
  grossRecommendedQuantity: number;
  openPurchaseOrderQuantity: number;
  netRecommendedQuantity: number;
  estimatedUnitCost: number;
  estimatedPurchaseValue: number;
  preferredSupplierId: string | null;
  preferredSupplierName: string;
  earliestOpenPoDelivery: string | null;
  velocityClass: SnapshotRow["velocityClass"];
  confidenceScore: number;
  trendPercent: number;
  wastage30Quantity: number;
  wastage30Value: number;
  nearExpiryTrackedQuantity: number;
  nearExpiryTrackedValue: number;
  flags: string[];
};

export type ProcurementIntelligenceResult = {
  generatedAt: string;
  parameters: { lookbackDays: number; horizonDays: number; leadTimeDays: number };
  forecastRunId: string;
  kpis: {
    inventoryItems: number;
    criticalItems: number;
    highRiskItems: number;
    stockoutWithin7Days: number;
    grossRecommendedValue: number;
    openPurchaseOrderValue: number;
    netRecommendedValue: number;
    nearExpiryTrackedValue: number;
    wastage30Value: number;
    deadStockItems: number;
    overstockItems: number;
    inventoryHealthScore: number;
  };
  recommendations: ProcurementRecommendation[];
  suppliers: Array<{
    supplierId: string | null;
    supplierName: string;
    items: number;
    quantity: number;
    estimatedValue: number;
    criticalItems: number;
  }>;
  categories: Array<{
    category: string;
    items: number;
    netRecommendedValue: number;
    criticalItems: number;
  }>;
  alerts: Array<{
    severity: ProcurementPriority;
    code: string;
    title: string;
    message: string;
    suggestedAction: string;
  }>;
};

function priorityRank(value: ProcurementPriority) {
  return { critical: 0, high: 1, medium: 2, low: 3 }[value];
}

function purchaseDate(daysUntilStockout: number | null, leadTimeDays: number) {
  const days = daysUntilStockout === null
    ? 0
    : Math.max(0, Math.floor(daysUntilStockout - leadTimeDays));
  return new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);
}

async function ensureForecast(input: {
  lookbackDays: number;
  horizonDays: number;
  leadTimeDays: number;
  requestedBy?: string | null;
  refresh: boolean;
}) {
  let run = input.refresh
    ? null
    : await InventoryForecastRun.findOne({
        status: "completed",
        lookbackDays: input.lookbackDays,
        horizonDays: input.horizonDays,
        completedAt: { $gte: new Date(Date.now() - CACHE_MS) },
      })
        .sort({ completedAt: -1 })
        .lean();

  if (!run) {
    const generated = await generateInventoryForecast({
      lookbackDays: input.lookbackDays,
      horizonDays: input.horizonDays,
      leadTimeDays: input.leadTimeDays,
      serviceLevelFactor: 1.65,
      source: "api",
      requestedBy: input.requestedBy,
    });
    run = await InventoryForecastRun.findById(generated.runId).lean();
  }

  if (!run) throw new Error("Unable to create inventory demand forecast.");
  return run;
}

export async function generateProcurementIntelligence(input: {
  lookbackDays: number;
  horizonDays: number;
  leadTimeDays: number;
  requestedBy?: string | null;
  refresh?: boolean;
}): Promise<ProcurementIntelligenceResult> {
  const startedAt = Date.now();
  const intelligenceRun = await ProcurementIntelligenceRun.create({
    status: "running",
    lookbackDays: input.lookbackDays,
    horizonDays: input.horizonDays,
    leadTimeDays: input.leadTimeDays,
    requestedBy: input.requestedBy ?? null,
    startedAt: new Date(),
  });

  try {
    const forecastRun = await ensureForecast({ ...input, refresh: input.refresh ?? false });
    const from30 = new Date(Date.now() - 30 * DAY_MS);
    const expiryCutoff = new Date(Date.now() + 14 * DAY_MS);

    const [snapshots, openPoRows, supplierHistory, wastageRows, expiryRows, suppliers] =
      await Promise.all([
        InventoryForecastSnapshot.find({ runId: forecastRun._id })
          .select("inventoryItemId itemName sku category unit currentStock forecastDailyDemand forecastWeeklyDemand forecastMonthlyDemand trendPercent safetyStock reorderPoint recommendedOrderQuantity recommendedOrderValue daysUntilStockout expectedStockoutDate confidenceScore riskLevel velocityClass")
          .lean<SnapshotRow[]>(),
        PurchaseOrder.aggregate<OpenPoRow>([
          { $match: { status: { $in: ["draft", "approved", "partially_received"] } } },
          { $unwind: "$items" },
          { $project: {
              inventoryItemId: { $toString: "$items.inventoryItemId" },
              remaining: { $max: [{ $subtract: ["$items.orderedQuantity", "$items.receivedQuantity"] }, 0] },
              unitCost: "$items.unitCost",
              expectedDeliveryDate: 1,
          } },
          { $group: {
              _id: "$inventoryItemId",
              openQuantity: { $sum: "$remaining" },
              openValue: { $sum: { $multiply: ["$remaining", "$unitCost"] } },
              earliestDelivery: { $min: "$expectedDeliveryDate" },
          } },
          { $project: { _id: 0, inventoryItemId: "$_id", openQuantity: 1, openValue: 1, earliestDelivery: 1 } },
        ]),
        PurchaseOrder.aggregate<SupplierHistoryRow>([
          { $match: { status: { $ne: "cancelled" } } },
          { $sort: { orderDate: -1 } },
          { $unwind: "$items" },
          { $group: {
              _id: { $toString: "$items.inventoryItemId" },
              supplierId: { $first: { $toString: "$supplierId" } },
              unitCost: { $first: "$items.unitCost" },
              orderDate: { $first: "$orderDate" },
          } },
          { $project: { _id: 0, inventoryItemId: "$_id", supplierId: 1, unitCost: 1, orderDate: 1 } },
        ]),
        InventoryMovement.aggregate<WastageRow>([
          { $match: { type: "wastage", createdAt: { $gte: from30 } } },
          { $group: { _id: { $toString: "$inventoryItemId" }, wastageQuantity: { $sum: "$quantity" }, wastageValue: { $sum: "$totalCost" } } },
          { $project: { _id: 0, inventoryItemId: "$_id", wastageQuantity: 1, wastageValue: 1 } },
        ]),
        InventoryMovement.aggregate<ExpiryRow>([
          { $match: { expiryDate: { $gte: new Date(), $lte: expiryCutoff }, type: { $in: ["opening", "purchase", "adjustment_in", "return_in"] } } },
          { $group: {
              _id: { $toString: "$inventoryItemId" },
              trackedQuantity: { $sum: "$quantity" },
              trackedValue: { $sum: "$totalCost" },
              nearestExpiry: { $min: "$expiryDate" },
          } },
          { $project: { _id: 0, inventoryItemId: "$_id", trackedQuantity: 1, trackedValue: 1, nearestExpiry: 1 } },
        ]),
        Supplier.find({ isActive: true }).select("name").lean(),
      ]);

    const openMap = new Map(openPoRows.map((row) => [row.inventoryItemId, row]));
    const historyMap = new Map(supplierHistory.map((row) => [row.inventoryItemId, row]));
    const wasteMap = new Map(wastageRows.map((row) => [row.inventoryItemId, row]));
    const expiryMap = new Map(expiryRows.map((row) => [row.inventoryItemId, row]));
    const supplierNameMap = new Map(suppliers.map((supplier) => [String(supplier._id), supplier.name]));

    const recommendations = snapshots.map<ProcurementRecommendation>((snapshot) => {
      const itemId = String(snapshot.inventoryItemId);
      const open = openMap.get(itemId);
      const history = historyMap.get(itemId);
      const waste = wasteMap.get(itemId);
      const expiry = expiryMap.get(itemId);
      const grossQuantity = Number(snapshot.recommendedOrderQuantity ?? 0);
      const openQuantity = Number(open?.openQuantity ?? 0);
      const netQuantity = Math.max(0, grossQuantity - openQuantity);
      const unitCost = history?.unitCost && history.unitCost > 0
        ? Number(history.unitCost)
        : grossQuantity > 0
          ? Number(snapshot.recommendedOrderValue ?? 0) / grossQuantity
          : 0;
      const flags: string[] = [];
      if (snapshot.velocityClass === "inactive" && snapshot.currentStock > 0) flags.push("dead_stock");
      if (snapshot.currentStock > Math.max(snapshot.reorderPoint * 2, snapshot.forecastMonthlyDemand * 2) && snapshot.forecastDailyDemand > 0) flags.push("overstock");
      if (Number(waste?.wastageQuantity ?? 0) > snapshot.forecastMonthlyDemand * 0.1 && Number(waste?.wastageQuantity ?? 0) > 0) flags.push("wastage_risk");
      if (Number(expiry?.trackedQuantity ?? 0) > 0) flags.push("near_expiry");
      if (openQuantity >= grossQuantity && grossQuantity > 0) flags.push("covered_by_open_po");
      if (!history?.supplierId && netQuantity > 0) flags.push("supplier_not_assigned");

      return {
        inventoryItemId: itemId,
        itemName: snapshot.itemName,
        sku: snapshot.sku,
        category: snapshot.category,
        unit: snapshot.unit,
        currentStock: round(snapshot.currentStock, 4),
        forecastDailyDemand: round(snapshot.forecastDailyDemand, 4),
        forecast7Demand: round(snapshot.forecastDailyDemand * 7, 4),
        forecast30Demand: round(snapshot.forecastDailyDemand * 30, 4),
        forecast90Demand: round(snapshot.forecastDailyDemand * 90, 4),
        daysRemaining: snapshot.daysUntilStockout === null ? null : round(snapshot.daysUntilStockout, 1),
        expectedStockoutDate: snapshot.expectedStockoutDate?.toISOString() ?? null,
        recommendedPurchaseDate: purchaseDate(snapshot.daysUntilStockout, input.leadTimeDays),
        priority: snapshot.riskLevel,
        safetyStock: round(snapshot.safetyStock, 4),
        reorderPoint: round(snapshot.reorderPoint, 4),
        grossRecommendedQuantity: round(grossQuantity, 4),
        openPurchaseOrderQuantity: round(openQuantity, 4),
        netRecommendedQuantity: round(netQuantity, 4),
        estimatedUnitCost: round(unitCost, 2),
        estimatedPurchaseValue: round(netQuantity * unitCost, 2),
        preferredSupplierId: history?.supplierId ?? null,
        preferredSupplierName: history?.supplierId
          ? supplierNameMap.get(history.supplierId) ?? "Unknown supplier"
          : "Not assigned",
        earliestOpenPoDelivery: open?.earliestDelivery?.toISOString() ?? null,
        velocityClass: snapshot.velocityClass,
        confidenceScore: round(snapshot.confidenceScore, 1),
        trendPercent: round(snapshot.trendPercent, 2),
        wastage30Quantity: round(Number(waste?.wastageQuantity ?? 0), 4),
        wastage30Value: round(Number(waste?.wastageValue ?? 0), 2),
        nearExpiryTrackedQuantity: round(Number(expiry?.trackedQuantity ?? 0), 4),
        nearExpiryTrackedValue: round(Number(expiry?.trackedValue ?? 0), 2),
        flags,
      };
    }).sort((left, right) =>
      priorityRank(left.priority) - priorityRank(right.priority) ||
      left.recommendedPurchaseDate.localeCompare(right.recommendedPurchaseDate) ||
      right.estimatedPurchaseValue - left.estimatedPurchaseValue,
    );

    const supplierBuckets = new Map<string, ProcurementIntelligenceResult["suppliers"][number]>();
    const categoryBuckets = new Map<string, ProcurementIntelligenceResult["categories"][number]>();
    for (const row of recommendations.filter((item) => item.netRecommendedQuantity > 0)) {
      const supplierKey = row.preferredSupplierId ?? "unassigned";
      const supplier = supplierBuckets.get(supplierKey) ?? {
        supplierId: row.preferredSupplierId,
        supplierName: row.preferredSupplierName,
        items: 0,
        quantity: 0,
        estimatedValue: 0,
        criticalItems: 0,
      };
      supplier.items += 1;
      supplier.quantity += row.netRecommendedQuantity;
      supplier.estimatedValue += row.estimatedPurchaseValue;
      if (row.priority === "critical") supplier.criticalItems += 1;
      supplierBuckets.set(supplierKey, supplier);

      const category = categoryBuckets.get(row.category) ?? {
        category: row.category,
        items: 0,
        netRecommendedValue: 0,
        criticalItems: 0,
      };
      category.items += 1;
      category.netRecommendedValue += row.estimatedPurchaseValue;
      if (row.priority === "critical") category.criticalItems += 1;
      categoryBuckets.set(row.category, category);
    }

    const grossRecommendedValue = round(recommendations.reduce((sum, row) => sum + row.grossRecommendedQuantity * row.estimatedUnitCost, 0), 2);
    const openPurchaseOrderValue = round(openPoRows.reduce((sum, row) => sum + Number(row.openValue ?? 0), 0), 2);
    const netRecommendedValue = round(recommendations.reduce((sum, row) => sum + row.estimatedPurchaseValue, 0), 2);
    const criticalItems = recommendations.filter((row) => row.priority === "critical").length;
    const highRiskItems = recommendations.filter((row) => row.priority === "critical" || row.priority === "high").length;
    const deadStockItems = recommendations.filter((row) => row.flags.includes("dead_stock")).length;
    const overstockItems = recommendations.filter((row) => row.flags.includes("overstock")).length;
    const stockoutWithin7Days = recommendations.filter((row) => row.daysRemaining !== null && row.daysRemaining <= 7).length;
    const nearExpiryTrackedValue = round(expiryRows.reduce((sum, row) => sum + Number(row.trackedValue ?? 0), 0), 2);
    const wastage30Value = round(wastageRows.reduce((sum, row) => sum + Number(row.wastageValue ?? 0), 0), 2);
    const inventoryHealthScore = Math.max(0, Math.round(100 - (highRiskItems / Math.max(recommendations.length, 1)) * 45 - (deadStockItems / Math.max(recommendations.length, 1)) * 20 - (overstockItems / Math.max(recommendations.length, 1)) * 15 - Math.min(wastage30Value / Math.max(grossRecommendedValue, 1), 1) * 20));

    const alerts: ProcurementIntelligenceResult["alerts"] = [];
    if (criticalItems > 0) alerts.push({ severity: "critical", code: "critical_stockout", title: `${criticalItems} critical stock items`, message: "These ingredients may run out before the configured procurement lead time.", suggestedAction: "Raise or expedite purchase orders today and verify physical stock." });
    const unassigned = recommendations.filter((row) => row.netRecommendedQuantity > 0 && !row.preferredSupplierId).length;
    if (unassigned > 0) alerts.push({ severity: "high", code: "supplier_unassigned", title: `${unassigned} purchase recommendations lack a supplier`, message: "Supplier assignment was not available from historical purchase orders.", suggestedAction: "Assign a preferred supplier before creating purchase orders." });
    if (nearExpiryTrackedValue > 0) alerts.push({ severity: "medium", code: "near_expiry", title: "Near-expiry exposure detected", message: `Tracked incoming batches worth approximately INR ${nearExpiryTrackedValue.toFixed(0)} expire within 14 days.`, suggestedAction: "Verify remaining batch quantities and prioritise consumption before replenishing." });
    if (deadStockItems > 0 || overstockItems > 0) alerts.push({ severity: "medium", code: "excess_inventory", title: "Slow or excess inventory detected", message: `${deadStockItems} inactive-demand and ${overstockItems} overstock item(s) require review.`, suggestedAction: "Pause replenishment, review recipes, and plan controlled utilisation." });
    if (wastage30Value > 0) alerts.push({ severity: wastage30Value > netRecommendedValue * 0.1 ? "high" : "low", code: "wastage_cost", title: "Recent inventory wastage", message: `The last 30 days contain INR ${wastage30Value.toFixed(0)} of recorded wastage.`, suggestedAction: "Review high-wastage ingredients before confirming reorder quantities." });

    const result: ProcurementIntelligenceResult = {
      generatedAt: new Date().toISOString(),
      parameters: { lookbackDays: input.lookbackDays, horizonDays: input.horizonDays, leadTimeDays: input.leadTimeDays },
      forecastRunId: String(forecastRun._id),
      kpis: {
        inventoryItems: recommendations.length,
        criticalItems,
        highRiskItems,
        stockoutWithin7Days,
        grossRecommendedValue,
        openPurchaseOrderValue,
        netRecommendedValue,
        nearExpiryTrackedValue,
        wastage30Value,
        deadStockItems,
        overstockItems,
        inventoryHealthScore,
      },
      recommendations,
      suppliers: Array.from(supplierBuckets.values()).map((row) => ({ ...row, quantity: round(row.quantity, 4), estimatedValue: round(row.estimatedValue, 2) })).sort((a, b) => b.estimatedValue - a.estimatedValue),
      categories: Array.from(categoryBuckets.values()).map((row) => ({ ...row, netRecommendedValue: round(row.netRecommendedValue, 2) })).sort((a, b) => b.netRecommendedValue - a.netRecommendedValue),
      alerts,
    };

    await ProcurementIntelligenceRun.updateOne(
      { _id: intelligenceRun._id },
      { $set: { status: "completed", completedAt: new Date(), durationMs: Date.now() - startedAt, itemCount: recommendations.length, criticalCount: criticalItems, netPurchaseValue: netRecommendedValue, result } },
    );
    return result;
  } catch (error) {
    await ProcurementIntelligenceRun.updateOne(
      { _id: intelligenceRun._id },
      { $set: { status: "failed", completedAt: new Date(), durationMs: Date.now() - startedAt, errorMessage: error instanceof Error ? error.message : "Procurement intelligence generation failed." } },
    );
    throw error;
  }
}

export async function getProcurementIntelligence(input: {
  lookbackDays: number;
  horizonDays: number;
  leadTimeDays: number;
  requestedBy?: string | null;
  refresh?: boolean;
}) {
  if (!input.refresh) {
    const cached = await ProcurementIntelligenceRun.findOne({
      status: "completed",
      lookbackDays: input.lookbackDays,
      horizonDays: input.horizonDays,
      leadTimeDays: input.leadTimeDays,
      createdAt: { $gte: new Date(Date.now() - CACHE_MS) },
    })
      .sort({ createdAt: -1 })
      .select("result")
      .lean();
    if (cached?.result) return cached.result as ProcurementIntelligenceResult;
  }
  return generateProcurementIntelligence(input);
}
