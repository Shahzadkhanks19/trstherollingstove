import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { RevenueSnapshot } from "@/models/RevenueSnapshot";

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const dayKey = (value: Date) => value.toISOString().slice(0, 10);

export type RevenueRange = { start: Date; end: Date; days: number };

export function getRevenueRange(days: number): RevenueRange {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - Math.max(1, days) + 1);
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end, days };
}

function addBreakdown(
  map: Map<string, { orders: number; grossRevenue: number; netRevenue: number; tax: number; discounts: number; refunds: number }>,
  key: string,
  values: { grossRevenue: number; netRevenue: number; tax: number; discounts: number; refunds: number },
) {
  const row = map.get(key) ?? { orders: 0, grossRevenue: 0, netRevenue: 0, tax: 0, discounts: 0, refunds: 0 };
  row.orders += 1;
  row.grossRevenue += values.grossRevenue;
  row.netRevenue += values.netRevenue;
  row.tax += values.tax;
  row.discounts += values.discounts;
  row.refunds += values.refunds;
  map.set(key, row);
}

function finalize(map: Map<string, { orders: number; grossRevenue: number; netRevenue: number; tax: number; discounts: number; refunds: number }>) {
  return [...map.entries()].map(([key, row]) => ({
    key,
    orders: row.orders,
    grossRevenue: round(row.grossRevenue),
    netRevenue: round(row.netRevenue),
    tax: round(row.tax),
    discounts: round(row.discounts),
    refunds: round(row.refunds),
  }));
}

export async function buildRevenueSnapshot(input: { days: number; source: "manual" | "scheduled" | "system"; generatedBy?: string | null }) {
  await connectToDatabase();
  const range = getRevenueRange(input.days);
  const orders = await Order.find({ createdAt: { $gte: range.start, $lte: range.end } }).lean();
  const orderIds = orders.map((order) => order._id);
  const payments = orderIds.length
    ? await Payment.find({ orderId: { $in: orderIds }, status: { $in: ["captured", "partially_refunded", "refunded"] } }).lean()
    : [];
  const refundsByOrder = new Map<string, number>();
  for (const payment of payments) {
    refundsByOrder.set(String(payment.orderId), (refundsByOrder.get(String(payment.orderId)) ?? 0) + Number(payment.amountRefunded ?? 0));
  }

  const byDay = new Map<string, { orders: number; grossRevenue: number; netRevenue: number; tax: number; discounts: number; refunds: number }>();
  const byPaymentMethod = new Map<string, { orders: number; grossRevenue: number; netRevenue: number; tax: number; discounts: number; refunds: number }>();
  const byOrderMode = new Map<string, { orders: number; grossRevenue: number; netRevenue: number; tax: number; discounts: number; refunds: number }>();
  const bySource = new Map<string, { orders: number; grossRevenue: number; netRevenue: number; tax: number; discounts: number; refunds: number }>();

  let paidOrderCount = 0;
  let completedOrderCount = 0;
  let grossRevenue = 0;
  let recognizedRevenue = 0;
  let taxCollected = 0;
  let discountTotal = 0;
  let couponDiscount = 0;
  let coinDiscount = 0;
  let refundTotal = 0;
  let dineInRevenue = 0;
  let takeawayRevenue = 0;

  for (const order of orders) {
    const paid = order.paymentStatus === "paid" || order.paymentStatus === "refunded";
    const completed = order.status === "completed";
    if (paid) paidOrderCount += 1;
    if (completed) completedOrderCount += 1;
    const gross = Number(order.grandTotal ?? 0);
    const refund = refundsByOrder.get(String(order._id)) ?? (order.paymentStatus === "refunded" ? gross : 0);
    const recognized = paid && completed ? Math.max(0, gross - refund) : 0;
    const tax = paid ? Number(order.taxTotal ?? 0) : 0;
    const discounts = paid ? Number(order.discountTotal ?? 0) : 0;

    if (paid) {
      grossRevenue += gross;
      taxCollected += tax;
      discountTotal += discounts;
      couponDiscount += Number(order.couponDiscount ?? 0);
      coinDiscount += Number(order.coinDiscount ?? 0);
      refundTotal += refund;
      recognizedRevenue += recognized;
      if (order.orderMode === "dine_in") dineInRevenue += recognized;
      if (order.orderMode === "takeaway") takeawayRevenue += recognized;

      const values = { grossRevenue: gross, netRevenue: recognized, tax, discounts, refunds: refund };
      addBreakdown(byDay, dayKey(new Date(order.createdAt)), values);
      addBreakdown(byPaymentMethod, order.paymentMethod || "unknown", values);
      addBreakdown(byOrderMode, order.orderMode, values);
      addBreakdown(bySource, order.orderSource || "unknown", values);
    }
  }

  const metrics = {
    orderCount: orders.length,
    paidOrderCount,
    completedOrderCount,
    grossRevenue: round(grossRevenue),
    recognizedRevenue: round(recognizedRevenue),
    netRevenue: round(recognizedRevenue),
    taxableRevenue: round(Math.max(0, recognizedRevenue - taxCollected)),
    taxCollected: round(taxCollected),
    discountTotal: round(discountTotal),
    couponDiscount: round(couponDiscount),
    coinDiscount: round(coinDiscount),
    refundTotal: round(refundTotal),
    averageOrderValue: paidOrderCount ? round(grossRevenue / paidOrderCount) : 0,
    dineInRevenue: round(dineInRevenue),
    takeawayRevenue: round(takeawayRevenue),
  };

  const periodKey = `${dayKey(range.start)}_${dayKey(range.end)}`;
  const snapshot = await RevenueSnapshot.findOneAndUpdate(
    { periodKey },
    {
      $set: {
        periodStart: range.start,
        periodEnd: range.end,
        currency: "INR",
        metrics,
        byDay: finalize(byDay).sort((a, b) => a.key.localeCompare(b.key)),
        byPaymentMethod: finalize(byPaymentMethod).sort((a, b) => b.netRevenue - a.netRevenue),
        byOrderMode: finalize(byOrderMode).sort((a, b) => b.netRevenue - a.netRevenue),
        bySource: finalize(bySource).sort((a, b) => b.netRevenue - a.netRevenue),
        generatedAt: new Date(),
        generatedBy: input.generatedBy || null,
        source: input.source,
      },
    },
    { upsert: true, returnDocument: "after", runValidators: true },
  ).lean();

  return snapshot;
}

export async function getRevenueSummary(days: number) {
  await connectToDatabase();
  const range = getRevenueRange(days);
  const periodKey = `${dayKey(range.start)}_${dayKey(range.end)}`;
  const snapshot = await RevenueSnapshot.findOne({ periodKey }).lean();
  return snapshot ?? buildRevenueSnapshot({ days, source: "system" });
}
