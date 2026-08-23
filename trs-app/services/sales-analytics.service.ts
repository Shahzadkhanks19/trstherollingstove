import { Order } from "@/models/Order";
import type { DashboardDateRange } from "@/types/dashboardAnalytics";

const paidMatch = (range: DashboardDateRange) => ({
  createdAt: { $gte: range.from, $lte: range.to },
  isRevenueOrder: { $ne: false },
  status: { $nin: ["cancelled", "rejected"] },
  paymentStatus: { $in: ["paid", "refunded"] },
});

function bucket(range: DashboardDateRange) {
  const days = Math.max(1, Math.ceil((range.to.getTime() - range.from.getTime()) / 86400000));
  if (days <= 2) return { format: "%Y-%m-%d %H:00", label: "hour" as const };
  if (days <= 93) return { format: "%Y-%m-%d", label: "day" as const };
  return { format: "%Y-%m", label: "month" as const };
}

export async function getSalesAnalytics(range: DashboardDateRange) {
  const grouping = bucket(range);
  const match = paidMatch(range);
  const [summaryRows, trend, payments, orderTypes, items, categories, details, cancelled] = await Promise.all([
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          grossSales: {
            $sum: {
              $add: [
                "$subtotal",
                "$packingCharge",
                "$serviceCharge",
                "$additionalCharge",
                "$taxTotal",
              ],
            },
          },
          netSales: {
            $sum: {
              $cond: [
                { $eq: ["$paymentStatus", "refunded"] },
                0,
                "$grandTotal",
              ],
            },
          },
          discounts: { $sum: "$discountTotal" },
          taxes: { $sum: "$taxTotal" },
          orders: { $sum: 1 },
          itemsSold: { $sum: "$itemCount" },
          refundedAmount: {
            $sum: {
              $cond: [
                { $eq: ["$paymentStatus", "refunded"] },
                "$grandTotal",
                0,
              ],
            },
          },
        },
      },
    ]),
    Order.aggregate([{ $match: match }, { $group: { _id: { $dateToString: { date: "$createdAt", format: grouping.format, timezone: "Asia/Kolkata" } }, grossSales: { $sum: { $add: ["$subtotal", "$packingCharge", "$serviceCharge", "$additionalCharge", "$taxTotal"] } }, netSales: { $sum: { $cond: [{ $eq: ["$paymentStatus", "refunded"] }, 0, "$grandTotal"] } }, orders: { $sum: 1 }, refunded: { $sum: { $cond: [{ $eq: ["$paymentStatus", "refunded"] }, "$grandTotal", 0] } } } }, { $sort: { _id: 1 } }, { $project: { _id: 0, period: "$_id", grossSales: { $round: ["$grossSales", 2] }, netSales: { $round: ["$netSales", 2] }, refunded: { $round: ["$refunded", 2] }, orders: 1 } }]),
    Order.aggregate([{ $match: match }, { $project: { parts: { $cond: [{ $gt: [{ $size: { $ifNull: ["$paymentBreakdown", []] } }, 0] }, "$paymentBreakdown", [{ method: "$paymentMethod", amount: "$grandTotal" }]] } } }, { $unwind: "$parts" }, { $group: { _id: "$parts.method", amount: { $sum: "$parts.amount" } } }, { $project: { _id: 0, method: "$_id", amount: { $round: ["$amount", 2] } } }, { $sort: { amount: -1 } }]),
    Order.aggregate([{ $match: match }, { $group: { _id: "$orderMode", orders: { $sum: 1 }, revenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "refunded"] }, 0, "$grandTotal"] } } } }, { $project: { _id: 0, type: "$_id", orders: 1, revenue: { $round: ["$revenue", 2] } } }]),
    Order.aggregate([{ $match: match }, { $unwind: "$items" }, { $group: { _id: { name: "$items.name", menuItemId: "$items.menuItemId", posItemId: "$items.posItemId" }, quantity: { $sum: "$items.quantity" }, revenue: { $sum: "$items.lineTotal" } } }, { $sort: { revenue: -1 } }, { $limit: 15 }, { $project: { _id: 0, name: "$_id.name", quantity: 1, revenue: { $round: ["$revenue", 2] } } }]),
    Order.aggregate([{ $match: match }, { $unwind: "$items" }, { $lookup: { from: "menuitems", localField: "items.menuItemId", foreignField: "_id", as: "menu" } }, { $lookup: { from: "positems", localField: "items.posItemId", foreignField: "_id", as: "pos" } }, { $lookup: { from: "menucategories", localField: "menu.categoryId", foreignField: "_id", as: "category" } }, { $addFields: { categoryName: { $ifNull: [{ $arrayElemAt: ["$category.name", 0] }, { $ifNull: [{ $arrayElemAt: ["$pos.category", 0] }, "Uncategorized"] }] } } }, { $group: { _id: "$categoryName", quantity: { $sum: "$items.quantity" }, revenue: { $sum: "$items.lineTotal" } } }, { $sort: { revenue: -1 } }, { $project: { _id: 0, category: "$_id", quantity: 1, revenue: { $round: ["$revenue", 2] } } }]),
    Order.aggregate([{ $match: { createdAt: { $gte: range.from, $lte: range.to }, isRevenueOrder: { $ne: false } } }, { $sort: { createdAt: -1 } }, { $limit: 250 }, { $lookup: { from: "users", localField: "cashierId", foreignField: "_id", as: "cashier" } }, { $project: { _id: 0, id: { $toString: "$_id" }, createdAt: 1, orderNumber: 1, customer: "$customerSnapshot.name", orderMode: 1, itemCount: 1, paymentMethod: 1, paymentBreakdown: 1, gross: { $add: ["$subtotal", "$packingCharge", "$serviceCharge", "$additionalCharge", "$taxTotal"] }, discount: "$discountTotal", tax: "$taxTotal", refund: { $cond: [{ $eq: ["$paymentStatus", "refunded"] }, "$grandTotal", 0] }, net: { $cond: [{ $eq: ["$paymentStatus", "refunded"] }, 0, "$grandTotal"] }, cashier: { $ifNull: [{ $arrayElemAt: ["$cashier.name", 0] }, "$orderTakerName"] }, status: 1, paymentStatus: 1 } }]),
    Order.aggregate([{ $match: { createdAt: { $gte: range.from, $lte: range.to }, status: { $in: ["cancelled", "rejected"] } } }, { $group: { _id: null, count: { $sum: 1 }, value: { $sum: "$grandTotal" } } }]),
  ]);
  const s = summaryRows[0] ?? { grossSales: 0, netSales: 0, discounts: 0, taxes: 0, orders: 0, itemsSold: 0, refundedAmount: 0 };
  return { range: { from: range.from, to: range.to, granularity: grouping.label }, summary: { ...s, averageOrderValue: s.orders ? Number((s.netSales / s.orders).toFixed(2)) : 0, cancelledOrders: cancelled[0]?.count ?? 0, cancelledValue: cancelled[0]?.value ?? 0 }, trend, payments, orderTypes, categories, items, details };
}
