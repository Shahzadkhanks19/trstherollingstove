import { InventoryAlertEvent } from "@/models/InventoryAlertEvent";
import { InventoryItem } from "@/models/InventoryItem";
import { InventoryMovement } from "@/models/InventoryMovement";
import { PurchaseOrder } from "@/models/PurchaseOrder";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getInventoryDashboardSummary() {
  const now = new Date();
  const expiryBoundary = new Date(now.getTime() + 7 * DAY_MS);

  const [
    itemSummary,
    alertSummary,
    movementSummary,
    purchaseSummary,
  ] = await Promise.all([
    InventoryItem.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalStockUnits: { $sum: "$currentStock" },
          inventoryValue: {
            $sum: {
              $multiply: [
                { $ifNull: ["$currentStock", 0] },
                {
                  $ifNull: [
                    "$averageUnitCost",
                    0,
                  ],
                },
              ],
            },
          },
          lowStockItems: {
            $sum: {
              $cond: [
                {
                  $lte: [
                    "$currentStock",
                    "$reorderLevel",
                  ],
                },
                1,
                0,
              ],
            },
          },
          outOfStockItems: {
            $sum: {
              $cond: [{ $lte: ["$currentStock", 0] }, 1, 0],
            },
          },
        },
      },
    ]),
    InventoryAlertEvent.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
    InventoryMovement.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(now.getTime() - 30 * DAY_MS),
          },
        },
      },
      {
        $group: {
          _id: "$type",
          quantity: { $sum: "$quantity" },
          value: {
            $sum: {
              $multiply: [
                { $ifNull: ["$quantity", 0] },
                { $ifNull: ["$unitCost", 0] },
              ],
            },
          },
        },
      },
    ]),
    PurchaseOrder.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(now.getTime() - 30 * DAY_MS),
          },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          total: {
            $sum: {
              $ifNull: ["$grandTotal", "$totalAmount"],
            },
          },
        },
      },
    ]),
  ]);

  const expiredCount = await InventoryMovement.countDocuments({
    expiryDate: { $lt: now },
    type: { $in: ["opening", "purchase", "return_in"] },
  });

  const expiringSoonCount =
    await InventoryMovement.countDocuments({
      expiryDate: {
        $gte: now,
        $lte: expiryBoundary,
      },
      type: { $in: ["opening", "purchase", "return_in"] },
    });

  const base = itemSummary[0] ?? {
    totalItems: 0,
    totalStockUnits: 0,
    inventoryValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
  };

  return {
    ...base,
    expiredCount,
    expiringSoonCount,
    alerts: Object.fromEntries(
      alertSummary.map((entry) => [
        String(entry._id),
        entry.count,
      ]),
    ),
    last30Days: {
      movements: Object.fromEntries(
        movementSummary.map((entry) => [
          String(entry._id),
          {
            quantity: entry.quantity,
            value: entry.value,
          },
        ]),
      ),
      purchaseOrders: Object.fromEntries(
        purchaseSummary.map((entry) => [
          String(entry._id),
          {
            count: entry.count,
            total: entry.total,
          },
        ]),
      ),
    },
    generatedAt: now,
  };
}

export async function getInventoryDashboardTrends(days = 30) {
  const safeDays = Math.max(7, Math.min(days, 365));
  const from = new Date(
    Date.now() - (safeDays - 1) * DAY_MS,
  );

  const movements = await InventoryMovement.aggregate([
    {
      $match: {
        createdAt: { $gte: from },
      },
    },
    {
      $group: {
        _id: {
          day: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          type: "$type",
        },
        quantity: { $sum: "$quantity" },
        value: {
          $sum: {
            $multiply: [
              { $ifNull: ["$quantity", 0] },
              { $ifNull: ["$unitCost", 0] },
            ],
          },
        },
      },
    },
    {
      $sort: { "_id.day": 1 },
    },
  ]);

  const rows = new Map<
    string,
    Record<string, number | string>
  >();

  for (const entry of movements) {
    const day = String(entry._id.day);
    const row = rows.get(day) ?? { date: day };
    const type = String(entry._id.type);

    row[`${type}Quantity`] = entry.quantity;
    row[`${type}Value`] = entry.value;
    rows.set(day, row);
  }

  return {
    days: safeDays,
    from,
    to: new Date(),
    rows: Array.from(rows.values()),
  };
}

export async function getInventoryDashboardTopItems(
  limit = 10,
) {
  const safeLimit = Math.max(1, Math.min(limit, 50));
  const from = new Date(Date.now() - 30 * DAY_MS);

  const [consumed, valued] = await Promise.all([
    InventoryMovement.aggregate([
      {
        $match: {
          createdAt: { $gte: from },
          type: {
            $in: [
              "sale",
              "adjustment_out",
              "wastage",
              "return_out",
              "transfer_out",
            ],
          },
        },
      },
      {
        $group: {
          _id: "$inventoryItemId",
          quantity: { $sum: "$quantity" },
          value: {
            $sum: {
              $multiply: [
                { $ifNull: ["$quantity", 0] },
                { $ifNull: ["$unitCost", 0] },
              ],
            },
          },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: safeLimit },
      {
        $lookup: {
          from: "inventoryitems",
          localField: "_id",
          foreignField: "_id",
          as: "item",
        },
      },
      {
        $unwind: {
          path: "$item",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]),
    InventoryItem.aggregate([
      { $match: { isActive: true } },
      {
        $addFields: {
          inventoryValue: {
            $multiply: [
              { $ifNull: ["$currentStock", 0] },
              {
                $ifNull: [
                  "$averageCost",
                  { $ifNull: ["$costPrice", 0] },
                ],
              },
            ],
          },
        },
      },
      { $sort: { inventoryValue: -1 } },
      { $limit: safeLimit },
      {
        $project: {
          name: 1,
          sku: 1,
          unit: 1,
          currentStock: 1,
          inventoryValue: 1,
        },
      },
    ]),
  ]);

  return {
    mostConsumed: consumed.map((entry) => ({
      inventoryItemId: String(entry._id),
      name: entry.item?.name ?? "Unknown item",
      sku: entry.item?.sku ?? "",
      unit: entry.item?.unit ?? "",
      quantity: entry.quantity,
      value: entry.value,
    })),
    highestValue: valued,
    periodDays: 30,
  };
}

export async function getInventoryDashboardAlertBreakdown() {
  const rows = await InventoryAlertEvent.aggregate([
    {
      $group: {
        _id: {
          status: "$status",
          severity: "$severity",
          type: "$type",
        },
        count: { $sum: 1 },
        latestDetectedAt: { $max: "$lastDetectedAt" },
      },
    },
    {
      $sort: {
        count: -1,
      },
    },
  ]);

  return rows.map((entry) => ({
    status: entry._id.status,
    severity: entry._id.severity,
    type: entry._id.type,
    count: entry.count,
    latestDetectedAt: entry.latestDetectedAt,
  }));
}
