import { InventoryItem } from "@/models/InventoryItem";
import { InventoryMovement } from "@/models/InventoryMovement";

export type InventoryReportType =
  | "valuation"
  | "consumption"
  | "expiry"
  | "abc_analysis"
  | "stock_ledger";

export type InventoryReportFilters = {
  from?: Date;
  to?: Date;
  inventoryItemId?: string;
  search?: string;
  limit?: number;
};

function dateMatch(filters: InventoryReportFilters) {
  if (!filters.from && !filters.to) return {};

  return {
    createdAt: {
      ...(filters.from ? { $gte: filters.from } : {}),
      ...(filters.to ? { $lte: filters.to } : {}),
    },
  };
}

export async function generateInventoryReport(
  type: InventoryReportType,
  filters: InventoryReportFilters,
): Promise<Array<Record<string, unknown>>> {
  const limit = filters.limit ?? 500;

  if (type === "valuation") {
    const match: Record<string, unknown> = {
      isActive: true,
    };

    if (filters.search) {
      match.$or = [
        {
          name: {
            $regex: filters.search,
            $options: "i",
          },
        },
        {
          sku: {
            $regex: filters.search,
            $options: "i",
          },
        },
      ];
    }

    return InventoryItem.aggregate([
      { $match: match },
      {
        $project: {
          _id: 0,
          inventoryItemId: { $toString: "$_id" },
          name: 1,
          sku: 1,
          category: 1,
          unit: 1,
          currentStock: 1,
          reorderLevel: 1,
          idealStockLevel: 1,
          averageUnitCost: 1,
          stockValue: {
            $round: [
              {
                $multiply: [
                  "$currentStock",
                  "$averageUnitCost",
                ],
              },
              2,
            ],
          },
        },
      },
      { $sort: { stockValue: -1 } },
      { $limit: limit },
    ]);
  }

  if (type === "stock_ledger") {
    return InventoryMovement.aggregate([
      {
        $match: {
          ...dateMatch(filters),
          ...(filters.inventoryItemId
            ? {
                inventoryItemId:
                  new InventoryMovement.base.Types.ObjectId(
                    filters.inventoryItemId,
                  ),
              }
            : {}),
        },
      },
      {
        $lookup: {
          from: "inventoryitems",
          localField: "inventoryItemId",
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
      {
        $project: {
          _id: 0,
          movementId: { $toString: "$_id" },
          date: "$createdAt",
          item: "$item.name",
          sku: "$item.sku",
          type: 1,
          quantity: 1,
          stockBefore: 1,
          stockAfter: 1,
          unitCost: 1,
          totalCost: 1,
          referenceType: 1,
          referenceId: {
            $cond: [
              { $ifNull: ["$referenceId", false] },
              { $toString: "$referenceId" },
              "",
            ],
          },
          batchNumber: 1,
          expiryDate: 1,
          reason: 1,
        },
      },
      { $sort: { date: -1 } },
      { $limit: limit },
    ]);
  }

  if (type === "consumption") {
    return InventoryMovement.aggregate([
      {
        $match: {
          ...dateMatch(filters),
          type: {
            $in: [
              "sale",
              "adjustment_out",
              "wastage",
              "return_out",
              "transfer_out",
            ],
          },
          ...(filters.inventoryItemId
            ? {
                inventoryItemId:
                  new InventoryMovement.base.Types.ObjectId(
                    filters.inventoryItemId,
                  ),
              }
            : {}),
        },
      },
      {
        $group: {
          _id: {
            inventoryItemId: "$inventoryItemId",
            type: "$type",
          },
          quantity: { $sum: "$quantity" },
          value: { $sum: "$totalCost" },
          movements: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "inventoryitems",
          localField: "_id.inventoryItemId",
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
      {
        $project: {
          _id: 0,
          inventoryItemId: {
            $toString: "$_id.inventoryItemId",
          },
          item: "$item.name",
          sku: "$item.sku",
          unit: "$item.unit",
          movementType: "$_id.type",
          quantity: { $round: ["$quantity", 4] },
          value: { $round: ["$value", 2] },
          movements: 1,
        },
      },
      { $sort: { value: -1, quantity: -1 } },
      { $limit: limit },
    ]);
  }

  if (type === "expiry") {
    return InventoryMovement.aggregate([
      {
        $match: {
          expiryDate: { $ne: null },
          type: {
            $in: ["opening", "purchase", "return_in"],
          },
          ...(filters.inventoryItemId
            ? {
                inventoryItemId:
                  new InventoryMovement.base.Types.ObjectId(
                    filters.inventoryItemId,
                  ),
              }
            : {}),
        },
      },
      {
        $lookup: {
          from: "inventoryitems",
          localField: "inventoryItemId",
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
      {
        $project: {
          _id: 0,
          inventoryItemId: {
            $toString: "$inventoryItemId",
          },
          item: "$item.name",
          sku: "$item.sku",
          unit: "$item.unit",
          batchNumber: 1,
          receiptQuantity: "$quantity",
          expiryDate: 1,
          daysRemaining: {
            $dateDiff: {
              startDate: "$$NOW",
              endDate: "$expiryDate",
              unit: "day",
            },
          },
          status: {
            $switch: {
              branches: [
                {
                  case: { $lt: ["$expiryDate", "$$NOW"] },
                  then: "expired",
                },
                {
                  case: {
                    $lte: [
                      "$expiryDate",
                      {
                        $dateAdd: {
                          startDate: "$$NOW",
                          unit: "day",
                          amount: 7,
                        },
                      },
                    ],
                  },
                  then: "near_expiry",
                },
              ],
              default: "valid",
            },
          },
        },
      },
      { $sort: { expiryDate: 1 } },
      { $limit: limit },
    ]);
  }

  const consumption = await InventoryMovement.aggregate([
    {
      $match: {
        ...dateMatch(filters),
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
        consumptionValue: { $sum: "$totalCost" },
        consumedQuantity: { $sum: "$quantity" },
      },
    },
    { $sort: { consumptionValue: -1 } },
  ]);

  const totalValue = consumption.reduce(
    (sum, row) =>
      sum + Number(row.consumptionValue ?? 0),
    0,
  );
  let cumulative = 0;

  const itemMap = new Map(
    (
      await InventoryItem.find({
        _id: { $in: consumption.map((row) => row._id) },
      })
        .select("name sku unit")
        .lean()
    ).map((item) => [String(item._id), item]),
  );

  return consumption.slice(0, limit).map((row) => {
    const value = Number(row.consumptionValue ?? 0);
    cumulative += value;
    const cumulativePercentage =
      totalValue > 0
        ? (cumulative / totalValue) * 100
        : 0;
    const item = itemMap.get(String(row._id));

    return {
      inventoryItemId: String(row._id),
      item: item?.name ?? "Unknown item",
      sku: item?.sku ?? "",
      unit: item?.unit ?? "",
      consumedQuantity: Number(
        row.consumedQuantity ?? 0,
      ),
      consumptionValue:
        Math.round(value * 100) / 100,
      cumulativePercentage:
        Math.round(cumulativePercentage * 100) / 100,
      classification:
        cumulativePercentage <= 80
          ? "A"
          : cumulativePercentage <= 95
            ? "B"
            : "C",
    };
  });
}
