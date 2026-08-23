import { KpiIntelligenceRun } from "@/models/KpiIntelligenceRun";
import { InventoryMovement } from "@/models/InventoryMovement";
import { Order } from "@/models/Order";

const DAY_MS = 86_400_000;
const round = (value: number, digits = 2) => Math.round((value + Number.EPSILON) * 10 ** digits) / 10 ** digits;
const percentChange = (current: number, previous: number) => previous > 0 ? round(((current - previous) / previous) * 100, 1) : current > 0 ? 100 : 0;
const ratio = (part: number, whole: number) => whole > 0 ? round((part / whole) * 100, 1) : 0;

type DailyAggregate = { date: string; revenue: number; orders: number; discounts: number; internalValue: number; wastageValue: number; complimentaryValue: number; uniqueCustomers: number };
type CostAggregate = { date: string; foodCost: number };
type DailyPoint = DailyAggregate & { foodCost: number; averageOrderValue: number; foodCostPercent: number };
type Alert = { code: string; severity: "low" | "medium" | "high" | "critical"; title: string; message: string; suggestedAction: string };
export type KpiIntelligenceResult = {
  generatedAt: string;
  lookbackDays: number;
  range: { currentFrom: string; currentTo: string; previousFrom: string; previousTo: string };
  kpis: {
    revenue: number; revenueChange: number; orders: number; ordersChange: number; averageOrderValue: number; averageOrderValueChange: number;
    foodCost: number; foodCostPercent: number; foodCostPercentChange: number; discounts: number; discountPercent: number;
    internalValue: number; internalPercent: number; wastageValue: number; wastagePercent: number; complimentaryValue: number; complimentaryPercent: number;
    uniqueCustomers: number; uniqueCustomersChange: number; rolling7Revenue: number; rolling30Revenue: number;
  };
  daily: DailyPoint[];
  weekdayPerformance: Array<{ weekday: string; revenue: number; orders: number; averageOrderValue: number }>;
  alerts: Alert[];
  executiveSummary: string[];
};

function iso(date: Date) { return date.toISOString().slice(0, 10); }
function startUtcDay(date = new Date()) { const value = new Date(date); value.setUTCHours(0, 0, 0, 0); return value; }
function sumRows(rows: DailyPoint[]) {
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const orders = rows.reduce((sum, row) => sum + row.orders, 0);
  const foodCost = rows.reduce((sum, row) => sum + row.foodCost, 0);
  const discounts = rows.reduce((sum, row) => sum + row.discounts, 0);
  const internalValue = rows.reduce((sum, row) => sum + row.internalValue, 0);
  const wastageValue = rows.reduce((sum, row) => sum + row.wastageValue, 0);
  const complimentaryValue = rows.reduce((sum, row) => sum + row.complimentaryValue, 0);
  const uniqueCustomers = rows.reduce((sum, row) => sum + row.uniqueCustomers, 0);
  return { revenue, orders, foodCost, discounts, internalValue, wastageValue, complimentaryValue, uniqueCustomers };
}

export async function generateKpiIntelligence(input: { lookbackDays: number; requestedBy?: string | null }): Promise<KpiIntelligenceResult> {
  const started = Date.now();
  const run = await KpiIntelligenceRun.create({ status: "running", lookbackDays: input.lookbackDays, requestedBy: input.requestedBy ?? null, startedAt: new Date() });
  try {
    const today = startUtcDay();
    const currentFrom = new Date(today.getTime() - (input.lookbackDays - 1) * DAY_MS);
    const previousFrom = new Date(currentFrom.getTime() - input.lookbackDays * DAY_MS);
    const [orders, costs] = await Promise.all([
      Order.aggregate<DailyAggregate>([
        { $match: { createdAt: { $gte: previousFrom }, status: { $nin: ["cancelled", "rejected"] } } },
        { $group: {
          _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } } },
          revenue: { $sum: { $cond: [{ $and: [{ $eq: ["$saleType", "customer"] }, { $eq: ["$paymentStatus", "paid"] }] }, "$grandTotal", 0] } },
          orders: { $sum: { $cond: [{ $eq: ["$saleType", "customer"] }, 1, 0] } },
          discounts: { $sum: { $cond: [{ $eq: ["$saleType", "customer"] }, "$discountTotal", 0] } },
          internalValue: { $sum: { $cond: [{ $ne: ["$saleType", "customer"] }, "$internalConsumption.menuValue", 0] } },
          wastageValue: { $sum: { $cond: [{ $eq: ["$saleType", "food_wastage"] }, "$internalConsumption.menuValue", 0] } },
          complimentaryValue: { $sum: { $cond: [{ $eq: ["$saleType", "complimentary"] }, "$internalConsumption.menuValue", 0] } },
          customerIds: { $addToSet: { $cond: [{ $and: [{ $eq: ["$saleType", "customer"] }, { $ne: ["$customerId", null] }] }, "$customerId", "$$REMOVE"] } },
        } },
        { $project: { _id: 0, date: "$_id.date", revenue: 1, orders: 1, discounts: 1, internalValue: 1, wastageValue: 1, complimentaryValue: 1, uniqueCustomers: { $size: "$customerIds" } } },
      ]),
      InventoryMovement.aggregate<CostAggregate>([
        { $match: { createdAt: { $gte: previousFrom }, type: { $in: ["sale", "wastage"] } } },
        { $group: { _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } } }, foodCost: { $sum: "$totalCost" } } },
        { $project: { _id: 0, date: "$_id.date", foodCost: 1 } },
      ]),
    ]);
    const orderMap = new Map(orders.map((row) => [row.date, row]));
    const costMap = new Map(costs.map((row) => [row.date, Number(row.foodCost ?? 0)]));
    const totalDays = input.lookbackDays * 2;
    const allDays: DailyPoint[] = Array.from({ length: totalDays }, (_, index) => {
      const key = iso(new Date(previousFrom.getTime() + index * DAY_MS)); const row = orderMap.get(key); const revenue = Number(row?.revenue ?? 0); const orderCount = Number(row?.orders ?? 0); const foodCost = Number(costMap.get(key) ?? 0);
      return { date: key, revenue, orders: orderCount, discounts: Number(row?.discounts ?? 0), internalValue: Number(row?.internalValue ?? 0), wastageValue: Number(row?.wastageValue ?? 0), complimentaryValue: Number(row?.complimentaryValue ?? 0), uniqueCustomers: Number(row?.uniqueCustomers ?? 0), foodCost, averageOrderValue: round(orderCount ? revenue / orderCount : 0), foodCostPercent: ratio(foodCost, revenue) };
    });
    const previous = allDays.slice(0, input.lookbackDays); const current = allDays.slice(input.lookbackDays);
    const p = sumRows(previous); const c = sumRows(current);
    const currentAov = c.orders ? c.revenue / c.orders : 0; const previousAov = p.orders ? p.revenue / p.orders : 0;
    const currentFoodPct = ratio(c.foodCost, c.revenue); const previousFoodPct = ratio(p.foodCost, p.revenue);
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((weekday, dayIndex) => {
      const rows = current.filter((row) => new Date(`${row.date}T00:00:00Z`).getUTCDay() === dayIndex); const totals = sumRows(rows);
      return { weekday, revenue: round(totals.revenue), orders: totals.orders, averageOrderValue: round(totals.orders ? totals.revenue / totals.orders : 0) };
    });
    const alerts: Alert[] = [];
    const revenueChange = percentChange(c.revenue, p.revenue); const orderChange = percentChange(c.orders, p.orders); const aovChange = percentChange(currentAov, previousAov);
    if (revenueChange <= -15) alerts.push({ code: "revenue_drop", severity: revenueChange <= -30 ? "critical" : "high", title: "Revenue decline detected", message: `Revenue is ${Math.abs(revenueChange)}% below the previous comparable period.`, suggestedAction: "Review peak-hour traffic, offer performance and unavailable menu items." });
    if (currentFoodPct >= 40 || currentFoodPct - previousFoodPct >= 5) alerts.push({ code: "food_cost_spike", severity: currentFoodPct >= 50 ? "critical" : "high", title: "Food cost requires attention", message: `Tracked food cost is ${currentFoodPct}% of revenue.`, suggestedAction: "Review ingredient pricing, portion control, recipe costing and wastage." });
    if (ratio(c.wastageValue, c.revenue) >= 3) alerts.push({ code: "wastage_spike", severity: "high", title: "Wastage is elevated", message: `Wastage menu value is ${ratio(c.wastageValue, c.revenue)}% of revenue.`, suggestedAction: "Inspect wastage reasons, responsible shifts and high-loss menu items." });
    if (ratio(c.complimentaryValue, c.revenue) >= 4) alerts.push({ code: "complimentary_spike", severity: "medium", title: "Complimentary usage is elevated", message: `Complimentary value is ${ratio(c.complimentaryValue, c.revenue)}% of revenue.`, suggestedAction: "Review approval records and complimentary reason patterns." });
    if (aovChange <= -10) alerts.push({ code: "aov_decline", severity: "medium", title: "Average order value is declining", message: `Average order value is down ${Math.abs(aovChange)}%.`, suggestedAction: "Review combo placement, upsell prompts and high-margin add-ons." });
    const bestDay = [...weekdays].sort((a, b) => b.revenue - a.revenue)[0];
    const kpis = { revenue: round(c.revenue), revenueChange, orders: c.orders, ordersChange: orderChange, averageOrderValue: round(currentAov), averageOrderValueChange: aovChange, foodCost: round(c.foodCost), foodCostPercent: currentFoodPct, foodCostPercentChange: round(currentFoodPct - previousFoodPct, 1), discounts: round(c.discounts), discountPercent: ratio(c.discounts, c.revenue + c.discounts), internalValue: round(c.internalValue), internalPercent: ratio(c.internalValue, c.revenue), wastageValue: round(c.wastageValue), wastagePercent: ratio(c.wastageValue, c.revenue), complimentaryValue: round(c.complimentaryValue), complimentaryPercent: ratio(c.complimentaryValue, c.revenue), uniqueCustomers: c.uniqueCustomers, uniqueCustomersChange: percentChange(c.uniqueCustomers, p.uniqueCustomers), rolling7Revenue: round(current.slice(-7).reduce((sum, row) => sum + row.revenue, 0)), rolling30Revenue: round(current.slice(-30).reduce((sum, row) => sum + row.revenue, 0)) };
    const executiveSummary = [`Revenue ${revenueChange >= 0 ? "increased" : "decreased"} by ${Math.abs(revenueChange)}% versus the previous period.`, `${c.orders} customer orders produced an average order value of INR ${round(currentAov, 0)}.`, `Food cost represents ${currentFoodPct}% of tracked revenue.`, bestDay ? `${bestDay.weekday} was the strongest weekday by revenue.` : "Weekday performance is not yet available.", alerts.length ? `${alerts.length} business exception${alerts.length === 1 ? "" : "s"} require review.` : "No major KPI exceptions were detected."];
    const result: KpiIntelligenceResult = { generatedAt: new Date().toISOString(), lookbackDays: input.lookbackDays, range: { currentFrom: iso(currentFrom), currentTo: iso(today), previousFrom: iso(previousFrom), previousTo: iso(new Date(currentFrom.getTime() - DAY_MS)) }, kpis, daily: current, weekdayPerformance: weekdays, alerts, executiveSummary };
    await KpiIntelligenceRun.updateOne({ _id: run._id }, { $set: { status: "completed", completedAt: new Date(), durationMs: Date.now() - started, result } }); return result;
  } catch (error) { await KpiIntelligenceRun.updateOne({ _id: run._id }, { $set: { status: "failed", completedAt: new Date(), durationMs: Date.now() - started, errorMessage: error instanceof Error ? error.message : "KPI intelligence generation failed." } }); throw error; }
}

export async function getKpiIntelligence(input: { lookbackDays: number; requestedBy?: string | null; refresh?: boolean }) {
  if (!input.refresh) { const cached = await KpiIntelligenceRun.findOne({ status: "completed", lookbackDays: input.lookbackDays, createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) } }).sort({ createdAt: -1 }).select("result").lean(); if (cached?.result) return cached.result as KpiIntelligenceResult; }
  return generateKpiIntelligence({ lookbackDays: input.lookbackDays, requestedBy: input.requestedBy });
}
