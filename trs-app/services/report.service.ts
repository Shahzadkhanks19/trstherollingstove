import type { Document, } from "mongoose";

import { REPORT_COLLECTIONS } from "@/config/reportCollections";
import { getReportCollection } from "@/lib/reports/database";
import {
  getPreviousRange,
  percentageChange,
  type ReportRange,
} from "@/lib/reports/query";

type OrderDocument = Document & {
  orderNumber?: string;
  source?: string;
  fulfilmentType?: string;
  orderMode?: string;
  status?: string;
  paymentStatus?: string;
  grandTotal?: number;
  total?: number;
  customerId?: unknown;
  customerName?: string;
  customerSnapshot?: { name?: string };
  createdAt?: Date;
  orderTakerName?: string;
  tipAmount?: number;
  tipMethod?: "none" | "cash" | "upi";
  tipCollection?: "none" | "waiter_direct" | "restaurant";
  waivedAmount?: number;
  paymentBreakdown?: Array<{ method?: string; amount?: number; reference?: string }>;
  items?: Array<{
    menuItemId?: unknown;
    name?: string;
    quantity?: number;
    lineTotal?: number;
    total?: number;
  }>;
};

type PaymentDocument = Document & {
  amount?: number;
  status?: string;
  method?: string;
  createdAt?: Date;
};

function orderTotalExpression() {
  return {
    $ifNull: ["$grandTotal", { $ifNull: ["$total", 0] }],
  };
}

function paidOrderMatch(range: ReportRange) {
  return {
    createdAt: {
      $gte: range.from,
      $lte: range.to,
    },
    status: {
      $nin: ["cancelled", "failed"],
    },
    paymentStatus: {
      $in: ["paid", "captured", "completed"],
    },
  };
}

async function getSalesTotals(range: ReportRange) {
  const orders =
    getReportCollection<OrderDocument>(
      REPORT_COLLECTIONS.orders,
    );

  const [result] = await orders
    .aggregate<{
      revenue: number;
      orderCount: number;
      averageOrderValue: number;
    }>([
      {
        $match: paidOrderMatch(range),
      },
      {
        $group: {
          _id: null,
          revenue: {
            $sum: orderTotalExpression(),
          },
          orderCount: {
            $sum: 1,
          },
          averageOrderValue: {
            $avg: orderTotalExpression(),
          },
        },
      },
      {
        $project: {
          _id: 0,
          revenue: {
            $round: ["$revenue", 2],
          },
          orderCount: 1,
          averageOrderValue: {
            $round: ["$averageOrderValue", 2],
          },
        },
      },
    ])
    .toArray();

  return (
    result ?? {
      revenue: 0,
      orderCount: 0,
      averageOrderValue: 0,
    }
  );
}

export async function getExecutiveDashboard(
  range: ReportRange,
) {
  const previousRange = getPreviousRange(range);

  const [
    currentSales,
    previousSales,
    lowStock,
    purchaseOutstanding,
  ] = await Promise.all([
    getSalesTotals(range),
    getSalesTotals(previousRange),
    getReportCollection(
      REPORT_COLLECTIONS.inventoryItems,
    ).countDocuments({
      isActive: true,
      $expr: {
        $lte: ["$currentStock", "$reorderLevel"],
      },
    }),
    getReportCollection(
      REPORT_COLLECTIONS.purchaseOrders,
    )
      .aggregate<{ outstanding: number }>([
        {
          $match: {
            status: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: null,
            outstanding: {
              $sum: {
                $ifNull: ["$balanceAmount", 0],
              },
            },
          },
        },
      ])
      .toArray(),
  ]);

  return {
    range,
    revenue: {
      value: currentSales.revenue,
      previousValue: previousSales.revenue,
      percentageChange: percentageChange(
        currentSales.revenue,
        previousSales.revenue,
      ),
    },
    orders: {
      value: currentSales.orderCount,
      previousValue: previousSales.orderCount,
      percentageChange: percentageChange(
        currentSales.orderCount,
        previousSales.orderCount,
      ),
    },
    averageOrderValue: {
      value: currentSales.averageOrderValue,
      previousValue:
        previousSales.averageOrderValue,
      percentageChange: percentageChange(
        currentSales.averageOrderValue,
        previousSales.averageOrderValue,
      ),
    },
    lowStockItems: lowStock,
    supplierOutstanding:
      purchaseOutstanding[0]?.outstanding ?? 0,
  };
}

export async function getSalesReport(
  range: ReportRange,
) {
  const orders =
    getReportCollection<OrderDocument>(
      REPORT_COLLECTIONS.orders,
    );

  const [summary, daily, bySource, byFulfilment] =
    await Promise.all([
      getSalesTotals(range),
      orders
        .aggregate([
          {
            $match: paidOrderMatch(range),
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  date: "$createdAt",
                  format: "%Y-%m-%d",
                  timezone: "Asia/Kolkata",
                },
              },
              revenue: {
                $sum: orderTotalExpression(),
              },
              orders: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              date: "$_id",
              revenue: { $round: ["$revenue", 2] },
              orders: 1,
            },
          },
          { $sort: { date: 1 } },
        ])
        .toArray(),
      orders
        .aggregate([
          {
            $match: paidOrderMatch(range),
          },
          {
            $group: {
              _id: {
                $ifNull: ["$source", "website"],
              },
              revenue: {
                $sum: orderTotalExpression(),
              },
              orders: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              source: "$_id",
              revenue: { $round: ["$revenue", 2] },
              orders: 1,
            },
          },
          { $sort: { revenue: -1 } },
        ])
        .toArray(),
      orders
        .aggregate([
          {
            $match: paidOrderMatch(range),
          },
          {
            $group: {
              _id: {
                $ifNull: [
                  "$orderMode",
                  { $ifNull: ["$fulfilmentType", "unknown"] },
                ],
              },
              revenue: {
                $sum: orderTotalExpression(),
              },
              orders: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              fulfilmentType: "$_id",
              revenue: { $round: ["$revenue", 2] },
              orders: 1,
            },
          },
          { $sort: { revenue: -1 } },
        ])
        .toArray(),
    ]);

  return {
    range,
    summary,
    daily,
    bySource,
    byFulfilment,
  };
}

export async function getOrdersReport(
  range: ReportRange,
) {
  const orders =
    getReportCollection<OrderDocument>(
      REPORT_COLLECTIONS.orders,
    );

  const [byStatus, byHour, recent] =
    await Promise.all([
      orders
        .aggregate([
          {
            $match: {
              createdAt: {
                $gte: range.from,
                $lte: range.to,
              },
            },
          },
          {
            $group: {
              _id: {
                $ifNull: ["$status", "unknown"],
              },
              count: { $sum: 1 },
              value: {
                $sum: orderTotalExpression(),
              },
            },
          },
          {
            $project: {
              _id: 0,
              status: "$_id",
              count: 1,
              value: { $round: ["$value", 2] },
            },
          },
          { $sort: { count: -1 } },
        ])
        .toArray(),
      orders
        .aggregate([
          {
            $match: {
              createdAt: {
                $gte: range.from,
                $lte: range.to,
              },
            },
          },
          {
            $group: {
              _id: {
                $hour: {
                  date: "$createdAt",
                  timezone: "Asia/Kolkata",
                },
              },
              count: { $sum: 1 },
              revenue: {
                $sum: orderTotalExpression(),
              },
            },
          },
          {
            $project: {
              _id: 0,
              hour: "$_id",
              count: 1,
              revenue: {
                $round: ["$revenue", 2],
              },
            },
          },
          { $sort: { hour: 1 } },
        ])
        .toArray(),
      orders
        .find(
          {
            createdAt: {
              $gte: range.from,
              $lte: range.to,
            },
          },
          {
            projection: {
              orderNumber: 1,
              source: 1,
              fulfilmentType: 1,
              orderMode: 1,
              status: 1,
              paymentStatus: 1,
              grandTotal: 1,
              total: 1,
              customerName: 1,
              customerSnapshot: 1,
              createdAt: 1,
            },
          },
        )
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray(),
    ]);

  return {
    range,
    byStatus,
    byHour,
    recent,
  };
}

export async function getMenuPerformanceReport(
  range: ReportRange,
) {
  const orders =
    getReportCollection<OrderDocument>(
      REPORT_COLLECTIONS.orders,
    );

  return orders
    .aggregate([
      {
        $match: paidOrderMatch(range),
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: {
            menuItemId: "$items.menuItemId",
            name: {
              $ifNull: [
                "$items.name",
                "Unknown item",
              ],
            },
          },
          quantitySold: {
            $sum: {
              $ifNull: ["$items.quantity", 0],
            },
          },
          revenue: {
            $sum: {
              $ifNull: [
                "$items.lineTotal",
                {
                  $ifNull: ["$items.total", 0],
                },
              ],
            },
          },
          orderCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          menuItemId: "$_id.menuItemId",
          name: "$_id.name",
          quantitySold: 1,
          orderCount: 1,
          revenue: { $round: ["$revenue", 2] },
        },
      },
      {
        $sort: {
          revenue: -1,
          quantitySold: -1,
        },
      },
      { $limit: 200 },
    ])
    .toArray();
}

export async function getCustomerReport(
  range: ReportRange,
) {
  const orders =
    getReportCollection<OrderDocument>(
      REPORT_COLLECTIONS.orders,
    );

  return orders
    .aggregate([
      {
        $match: paidOrderMatch(range),
      },
      {
        $group: {
          _id: {
            $ifNull: [
              "$customerId",
              "$customerName",
            ],
          },
          customerName: {
            $first: {
              $ifNull: [
                "$customerName",
                "Guest customer",
              ],
            },
          },
          orders: { $sum: 1 },
          totalSpent: {
            $sum: orderTotalExpression(),
          },
          lastOrderAt: {
            $max: "$createdAt",
          },
        },
      },
      {
        $project: {
          _id: 0,
          customerId: "$_id",
          customerName: 1,
          orders: 1,
          totalSpent: {
            $round: ["$totalSpent", 2],
          },
          lastOrderAt: 1,
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 200 },
    ])
    .toArray();
}

export async function getInventoryReport(
  range: ReportRange,
) {
  const items = getReportCollection(
    REPORT_COLLECTIONS.inventoryItems,
  );
  const movements = getReportCollection(
    REPORT_COLLECTIONS.inventoryMovements,
  );

  const [valuation, lowStock, movementSummary] =
    await Promise.all([
      items
        .aggregate([
          {
            $match: {
              isActive: true,
            },
          },
          {
            $project: {
              name: 1,
              sku: 1,
              unit: 1,
              currentStock: 1,
              reorderLevel: 1,
              averageUnitCost: 1,
              stockValue: {
                $round: [
                  {
                    $multiply: [
                      {
                        $ifNull: [
                          "$currentStock",
                          0,
                        ],
                      },
                      {
                        $ifNull: [
                          "$averageUnitCost",
                          0,
                        ],
                      },
                    ],
                  },
                  2,
                ],
              },
            },
          },
          { $sort: { stockValue: -1 } },
        ])
        .toArray(),
      items
        .find(
          {
            isActive: true,
            $expr: {
              $lte: [
                "$currentStock",
                "$reorderLevel",
              ],
            },
          },
          {
            projection: {
              name: 1,
              sku: 1,
              unit: 1,
              currentStock: 1,
              reorderLevel: 1,
            },
          },
        )
        .sort({ currentStock: 1 })
        .toArray(),
      movements
        .aggregate([
          {
            $match: {
              createdAt: {
                $gte: range.from,
                $lte: range.to,
              },
            },
          },
          {
            $group: {
              _id: "$type",
              quantity: {
                $sum: {
                  $ifNull: ["$quantity", 0],
                },
              },
              value: {
                $sum: {
                  $ifNull: ["$totalCost", 0],
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              type: "$_id",
              quantity: 1,
              value: { $round: ["$value", 2] },
            },
          },
          { $sort: { type: 1 } },
        ])
        .toArray(),
    ]);

  return {
    range,
    valuation,
    lowStock,
    movementSummary,
  };
}

export async function getPurchasesReport(
  range: ReportRange,
) {
  const purchases = getReportCollection(
    REPORT_COLLECTIONS.purchaseOrders,
  );

  const [summary, bySupplier, orders] =
    await Promise.all([
      purchases
        .aggregate([
          {
            $match: {
              orderDate: {
                $gte: range.from,
                $lte: range.to,
              },
              status: { $ne: "cancelled" },
            },
          },
          {
            $group: {
              _id: null,
              orders: { $sum: 1 },
              purchaseValue: {
                $sum: {
                  $ifNull: ["$grandTotal", 0],
                },
              },
              paid: {
                $sum: {
                  $ifNull: ["$paidAmount", 0],
                },
              },
              outstanding: {
                $sum: {
                  $ifNull: ["$balanceAmount", 0],
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              orders: 1,
              purchaseValue: {
                $round: ["$purchaseValue", 2],
              },
              paid: { $round: ["$paid", 2] },
              outstanding: {
                $round: ["$outstanding", 2],
              },
            },
          },
        ])
        .toArray(),
      purchases
        .aggregate([
          {
            $match: {
              orderDate: {
                $gte: range.from,
                $lte: range.to,
              },
              status: { $ne: "cancelled" },
            },
          },
          {
            $group: {
              _id: "$supplierId",
              orders: { $sum: 1 },
              purchaseValue: {
                $sum: {
                  $ifNull: ["$grandTotal", 0],
                },
              },
              outstanding: {
                $sum: {
                  $ifNull: ["$balanceAmount", 0],
                },
              },
            },
          },
          {
            $lookup: {
              from: REPORT_COLLECTIONS.suppliers,
              localField: "_id",
              foreignField: "_id",
              as: "supplier",
            },
          },
          {
            $unwind: {
              path: "$supplier",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              _id: 0,
              supplierId: "$_id",
              supplierName: {
                $ifNull: [
                  "$supplier.name",
                  "Unknown supplier",
                ],
              },
              orders: 1,
              purchaseValue: {
                $round: ["$purchaseValue", 2],
              },
              outstanding: {
                $round: ["$outstanding", 2],
              },
            },
          },
          { $sort: { purchaseValue: -1 } },
        ])
        .toArray(),
      purchases
        .find(
          {
            orderDate: {
              $gte: range.from,
              $lte: range.to,
            },
          },
          {
            projection: {
              purchaseOrderNumber: 1,
              supplierId: 1,
              status: 1,
              orderDate: 1,
              expectedDeliveryDate: 1,
              grandTotal: 1,
              paidAmount: 1,
              balanceAmount: 1,
            },
          },
        )
        .sort({ orderDate: -1 })
        .limit(200)
        .toArray(),
    ]);

  return {
    range,
    summary:
      summary[0] ?? {
        orders: 0,
        purchaseValue: 0,
        paid: 0,
        outstanding: 0,
      },
    bySupplier,
    orders,
  };
}

export async function getPaymentReport(
  range: ReportRange,
) {
  const payments =
    getReportCollection<PaymentDocument>(
      REPORT_COLLECTIONS.payments,
    );

  return payments
    .aggregate([
      {
        $match: {
          createdAt: {
            $gte: range.from,
            $lte: range.to,
          },
        },
      },
      {
        $group: {
          _id: {
            method: {
              $ifNull: ["$method", "unknown"],
            },
            status: {
              $ifNull: ["$status", "unknown"],
            },
          },
          count: { $sum: 1 },
          amount: {
            $sum: {
              $ifNull: ["$amount", 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          method: "$_id.method",
          status: "$_id.status",
          count: 1,
          amount: { $round: ["$amount", 2] },
        },
      },
      {
        $sort: {
          amount: -1,
        },
      },
    ])
    .toArray();
}

export async function getExportRows(
  report:
    | "sales"
    | "orders"
    | "menu-performance"
    | "customers"
    | "inventory"
    | "purchases",
  range: ReportRange,
): Promise<Array<Record<string, unknown>>> {
  if (report === "sales") {
    const result = await getSalesReport(range);
    return result.daily as Array<
      Record<string, unknown>
    >;
  }

  if (report === "orders") {
    const result = await getOrdersReport(range);
    return result.recent as Array<
      Record<string, unknown>
    >;
  }

  if (report === "menu-performance") {
    return (await getMenuPerformanceReport(
      range,
    )) as Array<Record<string, unknown>>;
  }

  if (report === "customers") {
    return (await getCustomerReport(
      range,
    )) as Array<Record<string, unknown>>;
  }

  if (report === "inventory") {
    const result = await getInventoryReport(range);
    return result.valuation as Array<
      Record<string, unknown>
    >;
  }

  if (report === "purchases") {
    const result = await getPurchasesReport(range);
    return result.orders as Array<
      Record<string, unknown>
    >;
  }

  throw new Error(`Unsupported report export: ${report}`);
}


export async function getWaiterTipReport(range: ReportRange) {
  const orders = getReportCollection<OrderDocument>(REPORT_COLLECTIONS.orders);
  const match = {
    ...paidOrderMatch(range),
    tipCollection: "restaurant" as const,
    tipAmount: { $gt: 0 },
  };
  const [summaryRows, byWaiter, recent] = await Promise.all([
    orders.aggregate([
      { $match: match },
      { $group: { _id: null, onlineTipsReceived: { $sum: "$tipAmount" }, orderCount: { $sum: 1 }, restaurantQrReceived: { $sum: { $add: [{ $subtract: ["$grandTotal", { $ifNull: ["$waivedAmount", 0] }] }, "$tipAmount"] } } } },
      { $project: { _id: 0, onlineTipsReceived: { $round: ["$onlineTipsReceived", 2] }, restaurantQrReceived: { $round: ["$restaurantQrReceived", 2] }, orderCount: 1 } },
    ]).toArray(),
    orders.aggregate([
      { $match: match },
      { $group: { _id: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$orderTakerName", ""] } }, 0] }, "$orderTakerName", "Unassigned waiter"] }, tipAmount: { $sum: "$tipAmount" }, orderCount: { $sum: 1 } } },
      { $project: { _id: 0, waiterName: "$_id", tipAmount: { $round: ["$tipAmount", 2] }, orderCount: 1 } },
      { $sort: { tipAmount: -1 } },
    ]).toArray(),
    orders.find(match, { projection: { orderNumber: 1, orderTakerName: 1, tipAmount: 1, grandTotal: 1, waivedAmount: 1, paymentBreakdown: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(50).toArray(),
  ]);
  return {
    summary: summaryRows[0] ?? { onlineTipsReceived: 0, restaurantQrReceived: 0, orderCount: 0 },
    byWaiter,
    recent: recent.map((order) => ({
      orderNumber: order.orderNumber,
      waiterName: order.orderTakerName || "Unassigned waiter",
      tipAmount: Number(order.tipAmount || 0),
      saleAmount: Math.max(0, Number(order.grandTotal || 0) - Number(order.waivedAmount || 0)),
      restaurantReceived: Math.max(0, Number(order.grandTotal || 0) - Number(order.waivedAmount || 0)) + Number(order.tipAmount || 0),
      createdAt: order.createdAt,
    })),
  };
}
