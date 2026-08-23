import mongoose from "mongoose";
import type {
  Collection,
  Document,
} from "mongodb";

import {
  percentageChange,
  previousDateRange,
} from "@/lib/dashboard/dateRange";
import type {
  DashboardDateRange,
  DashboardOverview,
  ProductPerformance,
  RevenuePoint,
} from "@/types/dashboardAnalytics";

function getCollection(
  name: string,
): Collection<Document> {
  const database =
    mongoose.connection.db;

  if (!database) {
    throw new Error(
      "Database connection is not ready.",
    );
  }

  return database.collection(name);
}

function numberValue(
  value: unknown,
) {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : 0;
}

function stringValue(
  value: unknown,
) {
  return typeof value === "string"
    ? value
    : "";
}

function dateMatch(
  range: DashboardDateRange,
) {
  return {
    createdAt: {
      $gte: range.from,
      $lte: range.to,
    },
  };
}

function paidOrderMatch(range: DashboardDateRange) {
  return {
    ...dateMatch(range),
    status: { $nin: ["cancelled", "rejected"] },
    paymentStatus: "paid",
  };
}

async function aggregateSingle(
  collectionName: string,
  pipeline: Document[],
) {
  const collection =
    getCollection(collectionName);

  const [result] =
    await collection
      .aggregate<Document>(pipeline)
      .toArray();

  return result ?? {};
}

export async function getDashboardOverview(
  range: DashboardDateRange,
): Promise<DashboardOverview> {
  const orders = getCollection("orders");
  const users = getCollection("users");
  const [
    orderSummary,
    customerCount,
    pendingOrders,
    completedOrders,
  ] = await Promise.all([
    aggregateSingle("orders", [
      {
        $match: paidOrderMatch(range),
      },
      {
        $group: {
          _id: null,
          revenue: {
            $sum: {
              $ifNull: [
                "$pricing.grandTotal",
                {
                  $ifNull: [
                    "$grandTotal",
                    0,
                  ],
                },
              ],
            },
          },
          orders: { $sum: 1 },
        },
      },
    ]),
    users.countDocuments({
      createdAt: {
        $gte: range.from,
        $lte: range.to,
      },
      role: {
        $in: [
          "customer",
          "user",
        ],
      },
    }),
    orders.countDocuments({
      createdAt: {
        $gte: range.from,
        $lte: range.to,
      },
      status: {
        $in: [
          "placed",
          "accepted",
          "preparing",
          "ready",
        ],
      },
    }),
    orders.countDocuments({
      createdAt: {
        $gte: range.from,
        $lte: range.to,
      },
      status: {
        $in: ["completed"],
      },
    }),
  ]);

  const revenue =
    numberValue(orderSummary.revenue);
  const orderCount =
    numberValue(orderSummary.orders);

  return {
    revenue,
    orders: orderCount,
    averageOrderValue:
      orderCount > 0
        ? Number(
            (
              revenue / orderCount
            ).toFixed(2),
          )
        : 0,
    customers: customerCount,
    pendingOrders,
    completedOrders,
  };
}

export async function getDashboardComparison(
  range: DashboardDateRange,
) {
  const previous =
    previousDateRange(range);

  const [current, previousMetrics] =
    await Promise.all([
      getDashboardOverview(range),
      getDashboardOverview(previous),
    ]);

  return {
    current,
    previous: previousMetrics,
    change: {
      revenue: percentageChange(
        current.revenue,
        previousMetrics.revenue,
      ),
      orders: percentageChange(
        current.orders,
        previousMetrics.orders,
      ),
      customers: percentageChange(
        current.customers,
        previousMetrics.customers,
      ),
      averageOrderValue:
        percentageChange(
          current.averageOrderValue,
          previousMetrics.averageOrderValue,
        ),
    },
  };
}

export async function getRevenueSeries(
  range: DashboardDateRange,
  interval: "hour" | "day" | "month",
): Promise<RevenuePoint[]> {
  const formatByInterval = {
    hour: "%Y-%m-%d %H:00",
    day: "%Y-%m-%d",
    month: "%Y-%m",
  } as const;

  const documents =
    await getCollection("orders")
      .aggregate<Document>([
        {
          $match: paidOrderMatch(range),
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format:
                  formatByInterval[
                    interval
                  ],
                date: "$createdAt",
                timezone:
                  "Asia/Kolkata",
              },
            },
            revenue: {
              $sum: {
                $ifNull: [
                  "$pricing.grandTotal",
                  {
                    $ifNull: [
                      "$grandTotal",
                      0,
                    ],
                  },
                ],
              },
            },
            orders: { $sum: 1 },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ])
      .toArray();

  return documents.map((entry) => {
    const revenue =
      numberValue(entry.revenue);
    const orders =
      numberValue(entry.orders);

    return {
      label: stringValue(entry._id),
      revenue,
      orders,
      averageOrderValue:
        orders > 0
          ? Number(
              (
                revenue / orders
              ).toFixed(2),
            )
          : 0,
    };
  });
}

export async function getTopProducts(
  range: DashboardDateRange,
  limit: number,
): Promise<ProductPerformance[]> {
  const documents =
    await getCollection("orders")
      .aggregate<Document>([
        {
          $match: paidOrderMatch(range),
        },
        {
          $unwind: "$items",
        },
        {
          $group: {
            _id: {
              $ifNull: [
                "$items.menuItemId",
                "$items.itemId",
              ],
            },
            name: {
              $first: {
                $ifNull: [
                  "$items.name",
                  "$items.itemName",
                ],
              },
            },
            quantity: {
              $sum: {
                $ifNull: [
                  "$items.quantity",
                  0,
                ],
              },
            },
            revenue: {
              $sum: {
                $ifNull: [
                  "$items.lineTotal",
                  {
                    $ifNull: [
                      "$items.total",
                      {
                        $multiply: [
                          { $ifNull: ["$items.lineUnitPrice", { $ifNull: ["$items.price", 0] }] },
                          { $ifNull: ["$items.quantity", 0] },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
        {
          $sort: {
            revenue: -1,
            quantity: -1,
          },
        },
        {
          $limit: limit,
        },
      ])
      .toArray();

  return documents.map((entry) => ({
    itemId:
      entry._id === null ||
      entry._id === undefined
        ? ""
        : String(entry._id),
    name:
      stringValue(entry.name) ||
      "Unknown item",
    quantity:
      numberValue(entry.quantity),
    revenue:
      numberValue(entry.revenue),
  }));
}

export async function getCustomerMetrics(
  range: DashboardDateRange,
) {
  const users = getCollection("users");

  const [
    totalCustomers,
    newCustomers,
    repeatCustomersResult,
  ] = await Promise.all([
    users.countDocuments({
      role: {
        $in: [
          "customer",
          "user",
        ],
      },
    }),
    users.countDocuments({
      role: {
        $in: [
          "customer",
          "user",
        ],
      },
      createdAt: {
        $gte: range.from,
        $lte: range.to,
      },
    }),
    aggregateSingle("orders", [
      {
        $match: {
          ...dateMatch(range),
          customerId: {
            $ne: null,
          },
          status: { $nin: ["cancelled", "rejected"] },
          paymentStatus: "paid",
        },
      },
      {
        $group: {
          _id: "$customerId",
          orderCount: {
            $sum: 1,
          },
        },
      },
      {
        $match: {
          orderCount: {
            $gte: 2,
          },
        },
      },
      {
        $count: "count",
      },
    ]),
  ]);

  return {
    totalCustomers,
    newCustomers,
    repeatCustomers:
      numberValue(
        repeatCustomersResult.count,
      ),
  };
}

export async function getOrderStatusBreakdown(
  range: DashboardDateRange,
) {
  const documents =
    await getCollection("orders")
      .aggregate<Document>([
        {
          $match:
            dateMatch(range),
        },
        {
          $group: {
            _id: "$status",
            count: {
              $sum: 1,
            },
            revenue: {
              $sum: {
                $ifNull: [
                  "$pricing.grandTotal",
                  {
                    $ifNull: [
                      "$grandTotal",
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
      ])
      .toArray();

  return documents.map((entry) => ({
    status:
      stringValue(entry._id) ||
      "unknown",
    count:
      numberValue(entry.count),
    revenue:
      numberValue(entry.revenue),
  }));
}

export async function getHourlyHeatmap(
  range: DashboardDateRange,
) {
  const documents =
    await getCollection("orders")
      .aggregate<Document>([
        {
          $match: paidOrderMatch(range),
        },
        {
          $group: {
            _id: {
              weekday: {
                $dayOfWeek: {
                  date: "$createdAt",
                  timezone:
                    "Asia/Kolkata",
                },
              },
              hour: {
                $hour: {
                  date: "$createdAt",
                  timezone:
                    "Asia/Kolkata",
                },
              },
            },
            orders: {
              $sum: 1,
            },
            revenue: {
              $sum: {
                $ifNull: [
                  "$pricing.grandTotal",
                  {
                    $ifNull: [
                      "$grandTotal",
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
        {
          $sort: {
            "_id.weekday": 1,
            "_id.hour": 1,
          },
        },
      ])
      .toArray();

  return documents.map((entry) => {
    const key =
      typeof entry._id === "object" &&
      entry._id !== null
        ? entry._id as Record<
            string,
            unknown
          >
        : {};

    return {
      weekday:
        numberValue(key.weekday),
      hour:
        numberValue(key.hour),
      orders:
        numberValue(entry.orders),
      revenue:
        numberValue(entry.revenue),
    };
  });
}
