import type { PipelineStage } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Expense } from "@/models/Expense";
import { InventoryMovement } from "@/models/InventoryMovement";
import { Order } from "@/models/Order";
import { INTERNAL_SALE_TYPES, type InternalSaleType } from "@/services/internal-consumption-analytics.service";

const round = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export type InternalConsumptionFinancialReport = {
  generatedAt: string;
  range: { from: string; to: string };
  kpis: {
    grossSales: number;
    netRevenue: number;
    taxCollected: number;
    customerCogs: number;
    grossProfit: number;
    operatingExpenses: number;
    internalConsumptionCost: number;
    adjustedOperatingProfit: number;
    grossMarginPercent: number;
    foodCostPercent: number;
    internalConsumptionPercent: number;
    orderCount: number;
    averageOrderValue: number;
  };
  discounts: {
    manual: number;
    coupons: number;
    coins: number;
    itemMarkdowns: number;
    comboSavings: number;
    total: number;
  };
  internalConsumption: {
    menuValue: number;
    inventoryCost: number;
    costCoveragePercent: number;
    orders: number;
    byType: Array<{ saleType: InternalSaleType; orders: number; menuValue: number; inventoryCost: number }>;
  };
  gst: {
    taxableRevenue: number;
    outputTax: number;
    inputTax: number;
    netTaxPayable: number;
    effectiveTaxRatePercent: number;
  };
  revenueTrend: Array<{ date: string; grossSales: number; netRevenue: number; tax: number; cogs: number; grossProfit: number }>;
  expenseBreakdown: Array<{ category: string; amount: number; tax: number; count: number }>;
  profitAndLoss: Array<{ key: string; label: string; amount: number; kind: "income" | "expense" | "subtotal" }>;
  dataQuality: { customerOrdersWithoutCost: number; internalOrdersWithoutCost: number; costCoveragePercent: number };
};

type OrderAggregate = {
  summary?: Array<{
    orders: number;
    grossSales: number;
    netRevenue: number;
    tax: number;
    manualDiscount: number;
    couponDiscount: number;
    coinDiscount: number;
    itemMarkdowns: number;
    comboSavings: number;
  }>;
  daily?: Array<{ _id: string; grossSales: number; netRevenue: number; tax: number }>;
};

type InternalAggregate = {
  totals?: Array<{ orders: number; menuValue: number }>;
  byType?: Array<{ _id: InternalSaleType; orders: number; menuValue: number }>;
};

function orderCostPipeline(orderIdsMatch: Record<string, unknown>): PipelineStage[] {
  return [
    { $match: { ...orderIdsMatch, referenceType: "order", type: "sale" } },
    { $group: { _id: "$referenceId", cost: { $sum: "$totalCost" } } },
  ];
}

export async function getInternalConsumptionFinancialReport(input: {
  from: Date;
  to: Date;
}): Promise<InternalConsumptionFinancialReport> {
  await connectToDatabase();

  const validStatuses = { $nin: ["cancelled", "rejected"] };
  const customerMatch = {
    createdAt: { $gte: input.from, $lte: input.to },
    saleType: "customer",
    isRevenueOrder: true,
    status: validStatuses,
  };
  const internalMatch = {
    createdAt: { $gte: input.from, $lte: input.to },
    saleType: { $in: INTERNAL_SALE_TYPES },
    status: validStatuses,
  };

  const [customer, internal, expenses, customerOrderIds, internalOrderIds] = await Promise.all([
    Order.aggregate<OrderAggregate>([
      { $match: customerMatch },
      {
        $set: {
          itemMarkdowns: {
            $sum: {
              $map: {
                input: "$items",
                as: "item",
                in: { $multiply: [{ $ifNull: ["$$item.itemDiscountSavings", 0] }, "$$item.quantity"] },
              },
            },
          },
          comboSavings: {
            $sum: {
              $map: {
                input: "$items",
                as: "item",
                in: { $multiply: [{ $ifNull: ["$$item.comboSavings", 0] }, "$$item.quantity"] },
              },
            },
          },
        },
      },
      {
        $facet: {
          summary: [{
            $group: {
              _id: null,
              orders: { $sum: 1 },
              grossSales: { $sum: { $add: ["$subtotal", "$packingCharge", "$serviceCharge", "$additionalCharge"] } },
              netRevenue: { $sum: { $subtract: ["$grandTotal", "$taxTotal"] } },
              tax: { $sum: "$taxTotal" },
              manualDiscount: { $sum: { $max: [0, { $subtract: ["$discountTotal", { $add: ["$couponDiscount", "$coinDiscount"] }] }] } },
              couponDiscount: { $sum: "$couponDiscount" },
              coinDiscount: { $sum: "$coinDiscount" },
              itemMarkdowns: { $sum: "$itemMarkdowns" },
              comboSavings: { $sum: "$comboSavings" },
            },
          }],
          daily: [{
            $group: {
              _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d", timezone: "Asia/Kolkata" } },
              grossSales: { $sum: { $add: ["$subtotal", "$packingCharge", "$serviceCharge", "$additionalCharge"] } },
              netRevenue: { $sum: { $subtract: ["$grandTotal", "$taxTotal"] } },
              tax: { $sum: "$taxTotal" },
            },
          }, { $sort: { _id: 1 } }],
        },
      },
    ]).allowDiskUse(true),
    Order.aggregate<InternalAggregate>([
      { $match: internalMatch },
      { $set: { menuValue: { $ifNull: ["$internalConsumption.menuValue", "$subtotal"] } } },
      { $facet: {
        totals: [{ $group: { _id: null, orders: { $sum: 1 }, menuValue: { $sum: "$menuValue" } } }],
        byType: [{ $group: { _id: "$saleType", orders: { $sum: 1 }, menuValue: { $sum: "$menuValue" } } }, { $sort: { menuValue: -1 } }],
      } },
    ]).allowDiskUse(true),
    Expense.aggregate<{ _id: string; amount: number; tax: number; count: number }>([
      { $match: { expenseDate: { $gte: input.from, $lte: input.to }, approvalStatus: "approved", paymentStatus: { $ne: "void" } } },
      { $group: { _id: "$category", amount: { $sum: "$totalAmount" }, tax: { $sum: "$taxAmount" }, count: { $sum: 1 } } },
      { $sort: { amount: -1 } },
    ]),
    Order.find(customerMatch as never).select({ _id: 1 }).lean(),
    Order.find(internalMatch as never).select({ _id: 1, saleType: 1 }).lean(),
  ]);

  const customerIds = customerOrderIds.map((row) => row._id);
  const internalIds = internalOrderIds.map((row) => row._id);
  const [customerCosts, internalCosts] = await Promise.all([
    customerIds.length ? InventoryMovement.aggregate<{ _id: unknown; cost: number }>(orderCostPipeline({ referenceId: { $in: customerIds } })) : [],
    internalIds.length ? InventoryMovement.aggregate<{ _id: unknown; cost: number }>(orderCostPipeline({ referenceId: { $in: internalIds } })) : [],
  ]);

  const customerCostMap = new Map(customerCosts.map((row) => [String(row._id), Number(row.cost)]));
  const internalCostMap = new Map(internalCosts.map((row) => [String(row._id), Number(row.cost)]));
  const customerCogs = round(customerCosts.reduce((sum, row) => sum + Number(row.cost), 0));
  const internalConsumptionCost = round(internalCosts.reduce((sum, row) => sum + Number(row.cost), 0));
  const operatingExpenses = round(expenses.reduce((sum, row) => sum + Number(row.amount), 0));
  const inputTax = round(expenses.reduce((sum, row) => sum + Number(row.tax), 0));

  const customerSummary = customer[0]?.summary?.[0];
  const internalSummary = internal[0]?.totals?.[0];
  const grossSales = round(customerSummary?.grossSales ?? 0);
  const netRevenue = round(customerSummary?.netRevenue ?? 0);
  const taxCollected = round(customerSummary?.tax ?? 0);
  const grossProfit = round(netRevenue - customerCogs);
  const adjustedOperatingProfit = round(grossProfit - operatingExpenses - internalConsumptionCost);
  const orderCount = customerSummary?.orders ?? 0;
  const internalMenuValue = round(internalSummary?.menuValue ?? 0);
  const totalTrackedOrders = customerOrderIds.length + internalOrderIds.length;
  const costedOrders = customerCostMap.size + internalCostMap.size;

  const byType = (internal[0]?.byType ?? []).map((row) => {
    const ids = internalOrderIds.filter((order) => order.saleType === row._id).map((order) => String(order._id));
    return {
      saleType: row._id,
      orders: row.orders,
      menuValue: round(row.menuValue),
      inventoryCost: round(ids.reduce((sum, id) => sum + (internalCostMap.get(id) ?? 0), 0)),
    };
  });

  const dailyCostRows = await (customerIds.length ? InventoryMovement.aggregate<{ _id: string; cogs: number }>([
    { $match: { referenceType: "order", type: "sale", referenceId: { $in: customerIds } } },
    { $lookup: { from: "orders", localField: "referenceId", foreignField: "_id", as: "order", pipeline: [{ $project: { createdAt: 1 } }] } },
    { $unwind: "$order" },
    { $group: { _id: { $dateToString: { date: "$order.createdAt", format: "%Y-%m-%d", timezone: "Asia/Kolkata" } }, cogs: { $sum: "$totalCost" } } },
  ]) : []);
  const dailyCostMap = new Map<string, number>(dailyCostRows.map((row) => [row._id, Number(row.cogs)]));
  const revenueTrend = (customer[0]?.daily ?? []).map((row) => {
    const cogs = round(dailyCostMap.get(row._id) ?? 0);
    const dailyRevenue = round(row.netRevenue);
    return { date: row._id, grossSales: round(row.grossSales), netRevenue: dailyRevenue, tax: round(row.tax), cogs, grossProfit: round(dailyRevenue - cogs) };
  });

  const discounts = {
    manual: round(customerSummary?.manualDiscount ?? 0),
    coupons: round(customerSummary?.couponDiscount ?? 0),
    coins: round(customerSummary?.coinDiscount ?? 0),
    itemMarkdowns: round(customerSummary?.itemMarkdowns ?? 0),
    comboSavings: round(customerSummary?.comboSavings ?? 0),
    total: 0,
  };
  discounts.total = round(discounts.manual + discounts.coupons + discounts.coins + discounts.itemMarkdowns + discounts.comboSavings);

  const profitAndLoss: InternalConsumptionFinancialReport["profitAndLoss"] = [
    { key: "net_revenue", label: "Net revenue (excluding GST)", amount: netRevenue, kind: "income" },
    { key: "customer_cogs", label: "Customer order food cost", amount: customerCogs, kind: "expense" },
    { key: "gross_profit", label: "Gross profit", amount: grossProfit, kind: "subtotal" },
    { key: "operating_expenses", label: "Approved operating expenses", amount: operatingExpenses, kind: "expense" },
    { key: "internal_consumption", label: "Internal consumption inventory cost", amount: internalConsumptionCost, kind: "expense" },
    { key: "adjusted_operating_profit", label: "Adjusted operating profit", amount: adjustedOperatingProfit, kind: "subtotal" },
  ];

  return {
    generatedAt: new Date().toISOString(),
    range: { from: input.from.toISOString(), to: input.to.toISOString() },
    kpis: {
      grossSales,
      netRevenue,
      taxCollected,
      customerCogs,
      grossProfit,
      operatingExpenses,
      internalConsumptionCost,
      adjustedOperatingProfit,
      grossMarginPercent: netRevenue > 0 ? round((grossProfit / netRevenue) * 100) : 0,
      foodCostPercent: netRevenue > 0 ? round((customerCogs / netRevenue) * 100) : 0,
      internalConsumptionPercent: netRevenue > 0 ? round((internalConsumptionCost / netRevenue) * 100) : 0,
      orderCount,
      averageOrderValue: orderCount > 0 ? round(netRevenue / orderCount) : 0,
    },
    discounts,
    internalConsumption: {
      menuValue: internalMenuValue,
      inventoryCost: internalConsumptionCost,
      costCoveragePercent: internalMenuValue > 0 ? round((internalConsumptionCost / internalMenuValue) * 100) : 0,
      orders: internalSummary?.orders ?? 0,
      byType,
    },
    gst: {
      taxableRevenue: netRevenue,
      outputTax: taxCollected,
      inputTax,
      netTaxPayable: round(Math.max(0, taxCollected - inputTax)),
      effectiveTaxRatePercent: netRevenue > 0 ? round((taxCollected / netRevenue) * 100) : 0,
    },
    revenueTrend,
    expenseBreakdown: expenses.map((row) => ({ category: row._id, amount: round(row.amount), tax: round(row.tax), count: row.count })),
    profitAndLoss,
    dataQuality: {
      customerOrdersWithoutCost: Math.max(0, customerOrderIds.length - customerCostMap.size),
      internalOrdersWithoutCost: Math.max(0, internalOrderIds.length - internalCostMap.size),
      costCoveragePercent: totalTrackedOrders > 0 ? round((costedOrders / totalTrackedOrders) * 100) : 100,
    },
  };
}
