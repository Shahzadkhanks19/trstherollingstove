import type { PipelineStage } from "mongoose";
import { Order } from "@/models/Order";

export const INTERNAL_SALE_TYPES = [
  "staff_meal",
  "family_meal",
  "complimentary",
  "food_wastage",
  "kitchen_test",
] as const;

export type InternalSaleType = (typeof INTERNAL_SALE_TYPES)[number];

export type InternalConsumptionAnalytics = {
  range: { from: string; to: string; saleType: "all" | InternalSaleType };
  totals: {
    orders: number;
    menuValue: number;
    items: number;
    averageOrderValue: number;
    uniquePeople: number;
    inventoryCost: number;
    costCoveragePercent: number;
  };
  byType: Array<{ saleType: InternalSaleType; orders: number; menuValue: number; inventoryCost: number; items: number }>;
  dailyTrend: Array<{ date: string; orders: number; menuValue: number; inventoryCost: number; items: number }>;
  topPeople: Array<{ name: string; saleType: InternalSaleType; orders: number; menuValue: number; inventoryCost: number }>;
  topItems: Array<{ name: string; variantName: string; quantity: number; menuValue: number }>;
  topReasons: Array<{ reason: string; saleType: InternalSaleType; orders: number; menuValue: number }>;
};

type AnalyticsFacetResult = {
  totals?: Array<{ orders: number; menuValue: number; inventoryCost: number; items: number; uniquePeople: string[] }>;
  byType?: Array<{ _id: InternalSaleType; orders: number; menuValue: number; inventoryCost: number; items: number }>;
  dailyTrend?: Array<{ _id: string; orders: number; menuValue: number; inventoryCost: number; items: number }>;
  topPeople?: Array<{ _id: { name: string; saleType: InternalSaleType }; orders: number; menuValue: number; inventoryCost: number }>;
  topItems?: Array<{ _id: { name: string; variantName: string }; quantity: number; menuValue: number }>;
  topReasons?: Array<{ _id: { reason: string; saleType: InternalSaleType }; orders: number; menuValue: number }>;
};

function money(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export async function getInternalConsumptionAnalytics(input: {
  from: Date;
  to: Date;
  saleType: "all" | InternalSaleType;
}): Promise<InternalConsumptionAnalytics> {
  const match: Record<string, unknown> = {
    createdAt: { $gte: input.from, $lte: input.to },
    saleType: input.saleType === "all" ? { $in: INTERNAL_SALE_TYPES } : input.saleType,
    status: { $nin: ["cancelled", "rejected"] },
  };

  const pipeline: PipelineStage[] = [
    { $match: match },
    { $lookup: { from: "inventorymovements", localField: "_id", foreignField: "referenceId", as: "inventoryCostMovements", pipeline: [{ $match: { referenceType: "order", type: "sale" } }, { $project: { totalCost: 1 } }] } },
    {
      $set: {
        analyticsInventoryCost: { $sum: "$inventoryCostMovements.totalCost" },
        analyticsMenuValue: { $ifNull: ["$internalConsumption.menuValue", "$subtotal"] },
        analyticsPersonName: {
          $cond: [
            { $gt: [{ $strLenCP: { $ifNull: ["$internalConsumption.personName", ""] } }, 0] },
            "$internalConsumption.personName",
            "Unspecified",
          ],
        },
        analyticsReason: {
          $cond: [
            { $gt: [{ $strLenCP: { $ifNull: ["$internalConsumption.reason", ""] } }, 0] },
            "$internalConsumption.reason",
            "Unspecified",
          ],
        },
      },
    },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              orders: { $sum: 1 },
              menuValue: { $sum: "$analyticsMenuValue" },
              inventoryCost: { $sum: "$analyticsInventoryCost" },
              items: { $sum: "$itemCount" },
              uniquePeople: { $addToSet: "$analyticsPersonName" },
            },
          },
        ],
        byType: [
          {
            $group: {
              _id: "$saleType",
              orders: { $sum: 1 },
              menuValue: { $sum: "$analyticsMenuValue" },
              inventoryCost: { $sum: "$analyticsInventoryCost" },
              items: { $sum: "$itemCount" },
            },
          },
          { $sort: { menuValue: -1 } },
        ],
        dailyTrend: [
          {
            $group: {
              _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d", timezone: "Asia/Kolkata" } },
              orders: { $sum: 1 },
              menuValue: { $sum: "$analyticsMenuValue" },
              inventoryCost: { $sum: "$analyticsInventoryCost" },
              items: { $sum: "$itemCount" },
            },
          },
          { $sort: { _id: 1 } },
        ],
        topPeople: [
          {
            $group: {
              _id: { name: "$analyticsPersonName", saleType: "$saleType" },
              orders: { $sum: 1 },
              menuValue: { $sum: "$analyticsMenuValue" },
              inventoryCost: { $sum: "$analyticsInventoryCost" },
            },
          },
          { $sort: { menuValue: -1, orders: -1 } },
          { $limit: 10 },
        ],
        topItems: [
          { $unwind: "$items" },
          {
            $group: {
              _id: { name: "$items.name", variantName: "$items.variantName" },
              quantity: { $sum: "$items.quantity" },
              menuValue: { $sum: "$items.lineTotal" },
            },
          },
          { $sort: { quantity: -1, menuValue: -1 } },
          { $limit: 10 },
        ],
        topReasons: [
          {
            $group: {
              _id: { reason: "$analyticsReason", saleType: "$saleType" },
              orders: { $sum: 1 },
              menuValue: { $sum: "$analyticsMenuValue" },
              inventoryCost: { $sum: "$analyticsInventoryCost" },
            },
          },
          { $sort: { menuValue: -1, orders: -1 } },
          { $limit: 10 },
        ],
      },
    },
  ];

  const [result] = await Order.aggregate<AnalyticsFacetResult>(pipeline).allowDiskUse(true);
  const total = result?.totals?.[0];
  const orders = total?.orders ?? 0;
  const menuValue = money(total?.menuValue ?? 0);
  const inventoryCost = money(total?.inventoryCost ?? 0);

  return {
    range: {
      from: input.from.toISOString(),
      to: input.to.toISOString(),
      saleType: input.saleType,
    },
    totals: {
      orders,
      menuValue,
      items: total?.items ?? 0,
      averageOrderValue: orders > 0 ? money(menuValue / orders) : 0,
      uniquePeople: total?.uniquePeople?.filter((name) => name !== "Unspecified").length ?? 0,
      inventoryCost,
      costCoveragePercent: menuValue > 0 ? money(inventoryCost / menuValue * 100) : 0,
    },
    byType: (result?.byType ?? []).map((row) => ({
      saleType: row._id,
      orders: row.orders,
      menuValue: money(row.menuValue),
      inventoryCost: money(row.inventoryCost ?? 0),
      items: row.items,
    })),
    dailyTrend: (result?.dailyTrend ?? []).map((row) => ({
      date: row._id,
      orders: row.orders,
      menuValue: money(row.menuValue),
      inventoryCost: money(row.inventoryCost ?? 0),
      items: row.items,
    })),
    topPeople: (result?.topPeople ?? []).map((row) => ({
      name: row._id.name,
      saleType: row._id.saleType,
      orders: row.orders,
      menuValue: money(row.menuValue),
      inventoryCost: money(row.inventoryCost ?? 0),
    })),
    topItems: (result?.topItems ?? []).map((row) => ({
      name: row._id.name,
      variantName: row._id.variantName ?? "",
      quantity: row.quantity,
      menuValue: money(row.menuValue),
    })),
    topReasons: (result?.topReasons ?? []).map((row) => ({
      reason: row._id.reason,
      saleType: row._id.saleType,
      orders: row.orders,
      menuValue: money(row.menuValue),
    })),
  };
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function internalConsumptionAnalyticsToCsv(report: InternalConsumptionAnalytics): string {
  const rows: Array<Array<string | number>> = [
    ["TRS Internal Consumption Analytics"],
    ["From", report.range.from],
    ["To", report.range.to],
    ["Filter", report.range.saleType],
    [],
    ["Summary"],
    ["Orders", report.totals.orders],
    ["Menu Value", report.totals.menuValue],
    ["Items", report.totals.items],
    ["Average Order Value", report.totals.averageOrderValue],
    ["Unique People", report.totals.uniquePeople],
    ["Inventory Cost", report.totals.inventoryCost],
    ["Cost Coverage %", report.totals.costCoveragePercent],
    [],
    ["By Type"],
    ["Type", "Orders", "Items", "Menu Value", "Inventory Cost"],
    ...report.byType.map((row) => [row.saleType, row.orders, row.items, row.menuValue, row.inventoryCost]),
    [],
    ["Daily Trend"],
    ["Date", "Orders", "Items", "Menu Value"],
    ...report.dailyTrend.map((row) => [row.date, row.orders, row.items, row.menuValue]),
    [],
    ["Top People"],
    ["Name", "Type", "Orders", "Menu Value"],
    ...report.topPeople.map((row) => [row.name, row.saleType, row.orders, row.menuValue]),
    [],
    ["Top Items"],
    ["Item", "Variant", "Quantity", "Menu Value"],
    ...report.topItems.map((row) => [row.name, row.variantName, row.quantity, row.menuValue]),
    [],
    ["Top Reasons"],
    ["Reason", "Type", "Orders", "Menu Value"],
    ...report.topReasons.map((row) => [row.reason, row.saleType, row.orders, row.menuValue]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`;
}
