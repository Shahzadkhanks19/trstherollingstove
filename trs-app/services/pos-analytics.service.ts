import { Order } from "@/models/Order";

type HourRow = { hour: number; orders: number; revenue: number; items: number };
type CategoryRow = { category: string; quantity: number; revenue: number; orders: number };
type ItemRow = { name: string; variantName: string; category: string; quantity: number; revenue: number; orders: number };
type PaymentRow = { method: string; orders: number; amount: number };
type ModeRow = { mode: string; orders: number; revenue: number };

export type PosAnalyticsResult = {
  range: { from: string; to: string };
  kpis: { orders: number; revenue: number; items: number; averageOrderValue: number; firstOrderAt: string | null; lastOrderAt: string | null; peakHour: string; peakHourOrders: number };
  hourly: Array<{ hour: string; orders: number; revenue: number; items: number }>;
  categories: CategoryRow[];
  topItems: ItemRow[];
  payments: PaymentRow[];
  modes: ModeRow[];
};

function hourLabel(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const value = hour % 12 || 12;
  return `${value} ${suffix}`;
}

export async function getPosAnalytics(input: { from: Date; to: Date; orderMode: string; saleType: string }): Promise<PosAnalyticsResult> {
  const from = new Date(input.from); from.setHours(0, 0, 0, 0);
  const to = new Date(input.to); to.setHours(23, 59, 59, 999);
  const match: Record<string, unknown> = { orderSource: "pos", createdAt: { $gte: from, $lte: to }, status: { $nin: ["cancelled", "rejected"] } };
  if (input.orderMode !== "all") match.orderMode = input.orderMode;
  if (input.saleType !== "all") match.saleType = input.saleType;

  const [summaryRows, hourlyRows, categoryRows, itemRows, paymentRows, modeRows] = await Promise.all([
    Order.aggregate<{ orders: number; revenue: number; items: number; firstOrderAt: Date; lastOrderAt: Date }>([
      { $match: match },
      { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: { $cond: [{ $and: [{ $eq: ["$saleType", "customer"] }, { $in: ["$paymentStatus", ["paid", "refunded"]] }] }, "$grandTotal", 0] } }, items: { $sum: "$itemCount" }, firstOrderAt: { $min: "$createdAt" }, lastOrderAt: { $max: "$createdAt" } } },
    ]),
    Order.aggregate<HourRow>([
      { $match: match },
      { $group: { _id: { $hour: { date: "$createdAt", timezone: "Asia/Kolkata" } }, orders: { $sum: 1 }, revenue: { $sum: { $cond: [{ $and: [{ $eq: ["$saleType", "customer"] }, { $in: ["$paymentStatus", ["paid", "refunded"]] }] }, "$grandTotal", 0] } }, items: { $sum: "$itemCount" } } },
      { $project: { _id: 0, hour: "$_id", orders: 1, revenue: 1, items: 1 } }, { $sort: { hour: 1 } },
    ]),
    Order.aggregate<CategoryRow>([
      { $match: match }, { $unwind: "$items" },
      { $lookup: { from: "menuitems", localField: "items.menuItemId", foreignField: "_id", as: "menuItem" } },
      { $lookup: { from: "positems", localField: "items.posItemId", foreignField: "_id", as: "posItem" } },
      { $set: { categoryId: { $ifNull: [{ $arrayElemAt: ["$menuItem.categoryId", 0] }, { $arrayElemAt: ["$posItem.categoryId", 0] }] } } },
      { $lookup: { from: "menucategories", localField: "categoryId", foreignField: "_id", as: "categoryDoc" } },
      { $set: { categoryName: { $ifNull: [{ $arrayElemAt: ["$categoryDoc.name", 0] }, "Uncategorised"] } } },
      { $group: { _id: "$categoryName", quantity: { $sum: "$items.quantity" }, revenue: { $sum: { $cond: [{ $eq: ["$saleType", "customer"] }, "$items.lineTotal", 0] } }, orders: { $addToSet: "$_id" } } },
      { $project: { _id: 0, category: "$_id", quantity: 1, revenue: 1, orders: { $size: "$orders" } } }, { $sort: { quantity: -1 } },
    ]),
    Order.aggregate<ItemRow>([
      { $match: match }, { $unwind: "$items" },
      { $lookup: { from: "menuitems", localField: "items.menuItemId", foreignField: "_id", as: "menuItem" } },
      { $lookup: { from: "positems", localField: "items.posItemId", foreignField: "_id", as: "posItem" } },
      { $set: { categoryId: { $ifNull: [{ $arrayElemAt: ["$menuItem.categoryId", 0] }, { $arrayElemAt: ["$posItem.categoryId", 0] }] } } },
      { $lookup: { from: "menucategories", localField: "categoryId", foreignField: "_id", as: "categoryDoc" } },
      { $set: { categoryName: { $ifNull: [{ $arrayElemAt: ["$categoryDoc.name", 0] }, "Uncategorised"] } } },
      { $group: { _id: { name: "$items.name", variantName: "$items.variantName", category: "$categoryName" }, quantity: { $sum: "$items.quantity" }, revenue: { $sum: { $cond: [{ $eq: ["$saleType", "customer"] }, "$items.lineTotal", 0] } }, orders: { $addToSet: "$_id" } } },
      { $project: { _id: 0, name: "$_id.name", variantName: "$_id.variantName", category: "$_id.category", quantity: 1, revenue: 1, orders: { $size: "$orders" } } }, { $sort: { quantity: -1 } }, { $limit: 20 },
    ]),
    Order.aggregate<PaymentRow>([
      { $match: { ...match, saleType: "customer", paymentStatus: { $in: ["paid", "refunded"] } } },
      { $group: { _id: "$paymentMethod", orders: { $sum: 1 }, amount: { $sum: "$grandTotal" } } },
      { $project: { _id: 0, method: "$_id", orders: 1, amount: 1 } }, { $sort: { amount: -1 } },
    ]),
    Order.aggregate<ModeRow>([
      { $match: { ...match, saleType: "customer", paymentStatus: { $in: ["paid", "refunded"] } } },
      { $group: { _id: "$orderMode", orders: { $sum: 1 }, revenue: { $sum: "$grandTotal" } } },
      { $project: { _id: 0, mode: "$_id", orders: 1, revenue: 1 } },
    ]),
  ]);

  const summary = summaryRows[0];
  const firstHour = hourlyRows[0]?.hour ?? 0;
  const lastHour = hourlyRows.at(-1)?.hour ?? firstHour;
  const hourlyMap = new Map(hourlyRows.map((row) => [row.hour, row]));
  const hourly = summary ? Array.from({ length: Math.max(1, lastHour - firstHour + 1) }, (_, index) => {
    const hour = firstHour + index; const row = hourlyMap.get(hour);
    return { hour: hourLabel(hour), orders: row?.orders ?? 0, revenue: row?.revenue ?? 0, items: row?.items ?? 0 };
  }) : [];
  const peak = hourly.reduce((best, row) => row.orders > best.orders ? row : best, { hour: "—", orders: 0, revenue: 0, items: 0 });
  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    kpis: { orders: summary?.orders ?? 0, revenue: summary?.revenue ?? 0, items: summary?.items ?? 0, averageOrderValue: summary?.orders ? summary.revenue / summary.orders : 0, firstOrderAt: summary?.firstOrderAt?.toISOString() ?? null, lastOrderAt: summary?.lastOrderAt?.toISOString() ?? null, peakHour: peak.hour, peakHourOrders: peak.orders },
    hourly, categories: categoryRows, topItems: itemRows, payments: paymentRows, modes: modeRows,
  };
}
