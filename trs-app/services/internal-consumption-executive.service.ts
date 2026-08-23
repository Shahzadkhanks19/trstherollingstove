import type { PipelineStage } from "mongoose";
import { Order } from "@/models/Order";
import {
  INTERNAL_SALE_TYPES,
  type InternalSaleType,
} from "@/services/internal-consumption-analytics.service";

type RawExecutiveResult = {
  summary?: Array<{
    orders: number;
    menuValue: number;
    inventoryCost: number;
    items: number;
    uniquePeople: string[];
    approvedOrders: number;
    approvalRequiredOrders: number;
    missingPersonOrders: number;
    missingReasonOrders: number;
    zeroCostOrders: number;
  }>;
  daily?: Array<{
    _id: string;
    orders: number;
    menuValue: number;
    inventoryCost: number;
    items: number;
  }>;
  hourly?: Array<{
    _id: number;
    orders: number;
    menuValue: number;
    inventoryCost: number;
  }>;
  weekdays?: Array<{
    _id: number;
    orders: number;
    menuValue: number;
    inventoryCost: number;
  }>;
  departments?: Array<{
    _id: string;
    orders: number;
    menuValue: number;
    inventoryCost: number;
  }>;
  designations?: Array<{
    _id: string;
    orders: number;
    menuValue: number;
    inventoryCost: number;
  }>;
  saleTypes?: Array<{
    _id: InternalSaleType;
    orders: number;
    menuValue: number;
    inventoryCost: number;
  }>;
  approvals?: Array<{ _id: string; orders: number; menuValue: number }>;
  topPeople?: Array<{
    _id: string;
    orders: number;
    menuValue: number;
    inventoryCost: number;
  }>;
  topReasons?: Array<{
    _id: string;
    orders: number;
    menuValue: number;
    inventoryCost: number;
  }>;
  topItems?: Array<{
    _id: string;
    quantity: number;
    orders: number;
    menuValue: number;
  }>;
};

export type InternalConsumptionExecutiveReport = {
  generatedAt: string;
  range: {
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
    saleType: "all" | InternalSaleType;
  };
  summary: {
    orders: number;
    menuValue: number;
    inventoryCost: number;
    items: number;
    uniquePeople: number;
    averageMenuValue: number;
    averageInventoryCost: number;
    averageItemsPerOrder: number;
    costCoveragePercent: number;
    approvedOrders: number;
    approvalRequiredOrders: number;
    approvalRatePercent: number;
  };
  comparison: {
    previousOrders: number;
    previousMenuValue: number;
    previousInventoryCost: number;
    ordersChangePercent: number;
    menuValueChangePercent: number;
    inventoryCostChangePercent: number;
  };
  dataQuality: {
    missingPersonOrders: number;
    missingReasonOrders: number;
    zeroCostOrders: number;
    completenessPercent: number;
  };
  daily: Array<{
    date: string;
    orders: number;
    menuValue: number;
    inventoryCost: number;
    items: number;
  }>;
  hourly: Array<{
    hour: number;
    label: string;
    orders: number;
    menuValue: number;
    inventoryCost: number;
  }>;
  weekdays: Array<{
    weekday: number;
    label: string;
    orders: number;
    menuValue: number;
    inventoryCost: number;
  }>;
  departments: Array<{
    department: string;
    orders: number;
    menuValue: number;
    inventoryCost: number;
  }>;
  designations: Array<{
    designation: string;
    orders: number;
    menuValue: number;
    inventoryCost: number;
  }>;
  saleTypes: Array<{
    saleType: InternalSaleType;
    orders: number;
    menuValue: number;
    inventoryCost: number;
  }>;
  approvals: Array<{ status: string; orders: number; menuValue: number }>;
  topPeople: Array<{
    personName: string;
    orders: number;
    menuValue: number;
    inventoryCost: number;
  }>;
  topReasons: Array<{
    reason: string;
    orders: number;
    menuValue: number;
    inventoryCost: number;
  }>;
  topItems: Array<{
    itemName: string;
    quantity: number;
    orders: number;
    menuValue: number;
  }>;
  alerts: Array<{
    severity: "info" | "warning" | "critical";
    code: string;
    title: string;
    description: string;
  }>;
};

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function money(value: number): number {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function changePercent(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return money(((current - previous) / Math.abs(previous)) * 100);
}

function buildMatch(
  from: Date,
  to: Date,
  saleType: "all" | InternalSaleType,
): Record<string, unknown> {
  return {
    createdAt: { $gte: from, $lte: to },
    saleType:
      saleType === "all" ? { $in: INTERNAL_SALE_TYPES } : saleType,
    status: { $nin: ["cancelled", "rejected"] },
  };
}

async function aggregatePeriod(
  from: Date,
  to: Date,
  saleType: "all" | InternalSaleType,
): Promise<RawExecutiveResult> {
  const pipeline: PipelineStage[] = [
    { $match: buildMatch(from, to, saleType) },
    {
      $lookup: {
        from: "inventorymovements",
        let: { orderId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$referenceId", "$$orderId"] },
                  { $eq: ["$referenceType", "order"] },
                  { $eq: ["$type", "sale"] },
                ],
              },
            },
          },
          { $project: { totalCost: 1 } },
        ],
        as: "inventoryCostMovements",
      },
    },
    {
      $lookup: {
        from: "staffprofiles",
        localField: "internalConsumption.referenceId",
        foreignField: "userId",
        as: "staffProfile",
      },
    },
    {
      $set: {
        executiveInventoryCost: { $sum: "$inventoryCostMovements.totalCost" },
        executiveMenuValue: {
          $ifNull: ["$internalConsumption.menuValue", "$subtotal"],
        },
        executivePersonName: {
          $ifNull: ["$internalConsumption.personName", ""],
        },
        executiveReason: { $ifNull: ["$internalConsumption.reason", ""] },
        executiveDepartment: {
          $ifNull: [{ $first: "$staffProfile.department" }, "unassigned"],
        },
        executiveDesignation: {
          $ifNull: [{ $first: "$staffProfile.designation" }, "Unassigned"],
        },
        executiveApprovalStatus: {
          $ifNull: ["$internalConsumption.approvalStatus", "not_required"],
        },
      },
    },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              orders: { $sum: 1 },
              menuValue: { $sum: "$executiveMenuValue" },
              inventoryCost: { $sum: "$executiveInventoryCost" },
              items: { $sum: "$itemCount" },
              uniquePeople: { $addToSet: "$executivePersonName" },
              approvedOrders: {
                $sum: {
                  $cond: [
                    { $eq: ["$executiveApprovalStatus", "approved"] },
                    1,
                    0,
                  ],
                },
              },
              approvalRequiredOrders: {
                $sum: {
                  $cond: [
                    {
                      $in: [
                        "$executiveApprovalStatus",
                        ["required", "approved"],
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              missingPersonOrders: {
                $sum: {
                  $cond: [{ $eq: ["$executivePersonName", ""] }, 1, 0],
                },
              },
              missingReasonOrders: {
                $sum: {
                  $cond: [{ $eq: ["$executiveReason", ""] }, 1, 0],
                },
              },
              zeroCostOrders: {
                $sum: {
                  $cond: [{ $lte: ["$executiveInventoryCost", 0] }, 1, 0],
                },
              },
            },
          },
        ],
        daily: [
          {
            $group: {
              _id: {
                $dateToString: {
                  date: "$createdAt",
                  format: "%Y-%m-%d",
                  timezone: "Asia/Kolkata",
                },
              },
              orders: { $sum: 1 },
              menuValue: { $sum: "$executiveMenuValue" },
              inventoryCost: { $sum: "$executiveInventoryCost" },
              items: { $sum: "$itemCount" },
            },
          },
          { $sort: { _id: 1 } },
        ],
        hourly: [
          {
            $group: {
              _id: {
                $hour: { date: "$createdAt", timezone: "Asia/Kolkata" },
              },
              orders: { $sum: 1 },
              menuValue: { $sum: "$executiveMenuValue" },
              inventoryCost: { $sum: "$executiveInventoryCost" },
            },
          },
          { $sort: { _id: 1 } },
        ],
        weekdays: [
          {
            $group: {
              _id: {
                $dayOfWeek: {
                  date: "$createdAt",
                  timezone: "Asia/Kolkata",
                },
              },
              orders: { $sum: 1 },
              menuValue: { $sum: "$executiveMenuValue" },
              inventoryCost: { $sum: "$executiveInventoryCost" },
            },
          },
          { $sort: { _id: 1 } },
        ],
        departments: [
          {
            $group: {
              _id: "$executiveDepartment",
              orders: { $sum: 1 },
              menuValue: { $sum: "$executiveMenuValue" },
              inventoryCost: { $sum: "$executiveInventoryCost" },
            },
          },
          { $sort: { menuValue: -1 } },
          { $limit: 12 },
        ],
        designations: [
          {
            $group: {
              _id: "$executiveDesignation",
              orders: { $sum: 1 },
              menuValue: { $sum: "$executiveMenuValue" },
              inventoryCost: { $sum: "$executiveInventoryCost" },
            },
          },
          { $sort: { menuValue: -1 } },
          { $limit: 12 },
        ],
        saleTypes: [
          {
            $group: {
              _id: "$saleType",
              orders: { $sum: 1 },
              menuValue: { $sum: "$executiveMenuValue" },
              inventoryCost: { $sum: "$executiveInventoryCost" },
            },
          },
          { $sort: { menuValue: -1 } },
        ],
        approvals: [
          {
            $group: {
              _id: "$executiveApprovalStatus",
              orders: { $sum: 1 },
              menuValue: { $sum: "$executiveMenuValue" },
            },
          },
          { $sort: { orders: -1 } },
        ],
        topPeople: [
          { $match: { executivePersonName: { $ne: "" } } },
          {
            $group: {
              _id: "$executivePersonName",
              orders: { $sum: 1 },
              menuValue: { $sum: "$executiveMenuValue" },
              inventoryCost: { $sum: "$executiveInventoryCost" },
            },
          },
          { $sort: { menuValue: -1 } },
          { $limit: 10 },
        ],
        topReasons: [
          { $match: { executiveReason: { $ne: "" } } },
          {
            $group: {
              _id: "$executiveReason",
              orders: { $sum: 1 },
              menuValue: { $sum: "$executiveMenuValue" },
              inventoryCost: { $sum: "$executiveInventoryCost" },
            },
          },
          { $sort: { menuValue: -1 } },
          { $limit: 10 },
        ],
        topItems: [
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.name",
              quantity: { $sum: "$items.quantity" },
              orders: { $addToSet: "$_id" },
              menuValue: { $sum: "$items.lineTotal" },
            },
          },
          {
            $project: {
              quantity: 1,
              orders: { $size: "$orders" },
              menuValue: 1,
            },
          },
          { $sort: { quantity: -1, menuValue: -1 } },
          { $limit: 10 },
        ],
      },
    },
  ];

  const [result] = await Order.aggregate<RawExecutiveResult>(pipeline)
    .allowDiskUse(true)
    .exec();
  return result ?? {};
}

export async function getInternalConsumptionExecutiveReport(input: {
  from: Date;
  to: Date;
  saleType: "all" | InternalSaleType;
}): Promise<InternalConsumptionExecutiveReport> {
  const durationMs = Math.max(1, input.to.getTime() - input.from.getTime() + 1);
  const previousTo = new Date(input.from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - durationMs + 1);

  const [current, previous] = await Promise.all([
    aggregatePeriod(input.from, input.to, input.saleType),
    aggregatePeriod(previousFrom, previousTo, input.saleType),
  ]);

  const summaryRaw = current.summary?.[0];
  const previousRaw = previous.summary?.[0];
  const orders = summaryRaw?.orders ?? 0;
  const menuValue = money(summaryRaw?.menuValue ?? 0);
  const inventoryCost = money(summaryRaw?.inventoryCost ?? 0);
  const items = summaryRaw?.items ?? 0;
  const previousOrders = previousRaw?.orders ?? 0;
  const previousMenuValue = money(previousRaw?.menuValue ?? 0);
  const previousInventoryCost = money(previousRaw?.inventoryCost ?? 0);
  const approvalRequiredOrders = summaryRaw?.approvalRequiredOrders ?? 0;
  const approvedOrders = summaryRaw?.approvedOrders ?? 0;
  const missingPersonOrders = summaryRaw?.missingPersonOrders ?? 0;
  const missingReasonOrders = summaryRaw?.missingReasonOrders ?? 0;
  const zeroCostOrders = summaryRaw?.zeroCostOrders ?? 0;

  const alerts: InternalConsumptionExecutiveReport["alerts"] = [];
  const costCoverage = menuValue > 0 ? money((inventoryCost / menuValue) * 100) : 0;
  const wastage = current.saleTypes?.find((row) => row._id === "food_wastage");
  const complimentary = current.saleTypes?.find(
    (row) => row._id === "complimentary",
  );
  const menuValueGrowth = changePercent(menuValue, previousMenuValue);
  const totalRequiredFields = orders * 3;
  const dataIssueCount =
    missingPersonOrders + missingReasonOrders + zeroCostOrders;
  const completenessPercent =
    totalRequiredFields > 0
      ? money(
          ((totalRequiredFields - Math.min(totalRequiredFields, dataIssueCount)) /
            totalRequiredFields) *
            100,
        )
      : 100;

  if (costCoverage >= 60) {
    alerts.push({
      severity: "critical",
      code: "HIGH_COST_COVERAGE",
      title: "High inventory cost coverage",
      description: `Inventory cost is ${costCoverage}% of recorded menu value for internal consumption.`,
    });
  } else if (costCoverage >= 45) {
    alerts.push({
      severity: "warning",
      code: "ELEVATED_COST_COVERAGE",
      title: "Elevated inventory cost coverage",
      description: `Inventory cost coverage has reached ${costCoverage}%.`,
    });
  }

  if ((wastage?.menuValue ?? 0) > menuValue * 0.2 && menuValue > 0) {
    alerts.push({
      severity: "critical",
      code: "WASTAGE_SPIKE",
      title: "Wastage requires attention",
      description: `Food wastage represents ${money((((wastage?.menuValue ?? 0) / menuValue) * 100))}% of internal consumption value.`,
    });
  }

  if (
    (complimentary?.menuValue ?? 0) > menuValue * 0.35 &&
    menuValue > 0
  ) {
    alerts.push({
      severity: "warning",
      code: "COMPLIMENTARY_SPIKE",
      title: "Complimentary usage is high",
      description: `Complimentary orders represent ${money((((complimentary?.menuValue ?? 0) / menuValue) * 100))}% of internal consumption value.`,
    });
  }

  if (approvalRequiredOrders > 0 && approvedOrders < approvalRequiredOrders) {
    alerts.push({
      severity: "warning",
      code: "PENDING_APPROVALS",
      title: "Approval gap detected",
      description: `${approvalRequiredOrders - approvedOrders} approval-required order(s) are not recorded as approved.`,
    });
  }

  if (menuValueGrowth >= 25) {
    alerts.push({
      severity: "warning",
      code: "PERIOD_GROWTH",
      title: "Internal consumption increased",
      description: `Recorded menu value increased ${menuValueGrowth}% versus the previous comparable period.`,
    });
  }

  if (completenessPercent < 90) {
    alerts.push({
      severity: "warning",
      code: "DATA_QUALITY",
      title: "Reporting data needs attention",
      description: `Executive reporting completeness is ${completenessPercent}%. Review missing people, reasons and inventory costs.`,
    });
  }

  if (!alerts.length) {
    alerts.push({
      severity: "info",
      code: "HEALTHY",
      title: "No material exceptions",
      description: "The selected period is within the configured executive thresholds.",
    });
  }

  const hourlyMap = new Map((current.hourly ?? []).map((row) => [row._id, row]));
  const weekdayMap = new Map(
    (current.weekdays ?? []).map((row) => [row._id, row]),
  );

  return {
    generatedAt: new Date().toISOString(),
    range: {
      from: input.from.toISOString(),
      to: input.to.toISOString(),
      previousFrom: previousFrom.toISOString(),
      previousTo: previousTo.toISOString(),
      saleType: input.saleType,
    },
    summary: {
      orders,
      menuValue,
      inventoryCost,
      items,
      uniquePeople:
        summaryRaw?.uniquePeople?.filter((person) => person.trim().length > 0)
          .length ?? 0,
      averageMenuValue: orders > 0 ? money(menuValue / orders) : 0,
      averageInventoryCost: orders > 0 ? money(inventoryCost / orders) : 0,
      averageItemsPerOrder: orders > 0 ? money(items / orders) : 0,
      costCoveragePercent: costCoverage,
      approvedOrders,
      approvalRequiredOrders,
      approvalRatePercent:
        approvalRequiredOrders > 0
          ? money((approvedOrders / approvalRequiredOrders) * 100)
          : 100,
    },
    comparison: {
      previousOrders,
      previousMenuValue,
      previousInventoryCost,
      ordersChangePercent: changePercent(orders, previousOrders),
      menuValueChangePercent: changePercent(menuValue, previousMenuValue),
      inventoryCostChangePercent: changePercent(
        inventoryCost,
        previousInventoryCost,
      ),
    },
    dataQuality: {
      missingPersonOrders,
      missingReasonOrders,
      zeroCostOrders,
      completenessPercent,
    },
    daily: (current.daily ?? []).map((row) => ({
      date: row._id,
      orders: row.orders,
      menuValue: money(row.menuValue),
      inventoryCost: money(row.inventoryCost),
      items: row.items,
    })),
    hourly: Array.from({ length: 24 }, (_, hour) => {
      const row = hourlyMap.get(hour);
      return {
        hour,
        label: `${String(hour).padStart(2, "0")}:00`,
        orders: row?.orders ?? 0,
        menuValue: money(row?.menuValue ?? 0),
        inventoryCost: money(row?.inventoryCost ?? 0),
      };
    }),
    weekdays: Array.from({ length: 7 }, (_, index) => {
      const mongoDay = index + 1;
      const row = weekdayMap.get(mongoDay);
      return {
        weekday: index,
        label: WEEKDAY_LABELS[index] ?? "Unknown",
        orders: row?.orders ?? 0,
        menuValue: money(row?.menuValue ?? 0),
        inventoryCost: money(row?.inventoryCost ?? 0),
      };
    }),
    departments: (current.departments ?? []).map((row) => ({
      department: row._id || "unassigned",
      orders: row.orders,
      menuValue: money(row.menuValue),
      inventoryCost: money(row.inventoryCost),
    })),
    designations: (current.designations ?? []).map((row) => ({
      designation: row._id || "Unassigned",
      orders: row.orders,
      menuValue: money(row.menuValue),
      inventoryCost: money(row.inventoryCost),
    })),
    saleTypes: (current.saleTypes ?? []).map((row) => ({
      saleType: row._id,
      orders: row.orders,
      menuValue: money(row.menuValue),
      inventoryCost: money(row.inventoryCost),
    })),
    approvals: (current.approvals ?? []).map((row) => ({
      status: row._id || "not_required",
      orders: row.orders,
      menuValue: money(row.menuValue),
    })),
    topPeople: (current.topPeople ?? []).map((row) => ({
      personName: row._id,
      orders: row.orders,
      menuValue: money(row.menuValue),
      inventoryCost: money(row.inventoryCost),
    })),
    topReasons: (current.topReasons ?? []).map((row) => ({
      reason: row._id,
      orders: row.orders,
      menuValue: money(row.menuValue),
      inventoryCost: money(row.inventoryCost),
    })),
    topItems: (current.topItems ?? []).map((row) => ({
      itemName: row._id || "Unnamed item",
      quantity: row.quantity,
      orders: row.orders,
      menuValue: money(row.menuValue),
    })),
    alerts,
  };
}
