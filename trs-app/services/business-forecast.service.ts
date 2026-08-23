import { BusinessForecastRun } from "@/models/BusinessForecastRun";
import { InventoryMovement } from "@/models/InventoryMovement";
import { Order } from "@/models/Order";

const DAY_MS = 86_400_000;
const HORIZONS = [7, 30, 90] as const;
const round = (value: number, digits = 2) => Math.round((value + Number.EPSILON) * 10 ** digits) / 10 ** digits;
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const deviation = (values: number[]) => { if (values.length < 2) return 0; const avg = mean(values); return Math.sqrt(mean(values.map((value) => (value - avg) ** 2))); };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

type DailyRow = { date: string; revenue: number; orders: number; internalValue: number; wastageValue: number; complimentaryValue: number; foodCost: number };
type OrderAggregateRow = Omit<DailyRow, "foodCost">;
type CostAggregateRow = { date: string; foodCost: number };
export type BusinessForecastResult = {
  generatedAt: string;
  lookbackDays: number;
  dataDays: number;
  quality: { score: number; level: "low" | "medium" | "high"; message: string };
  history: DailyRow[];
  forecasts: Array<DailyRow & { lowerRevenue: number; upperRevenue: number }>;
  horizons: Array<{ days: number; revenue: number; orders: number; internalValue: number; wastageValue: number; complimentaryValue: number; foodCost: number; lowerRevenue: number; upperRevenue: number }>;
  summary: { recent30Revenue: number; recent30Orders: number; averageDailyRevenue: number; forecast7Revenue: number; forecast30Revenue: number; forecast90Revenue: number; forecast30FoodCost: number; forecast30InternalValue: number };
};

function iso(date: Date) { return date.toISOString().slice(0, 10); }
function startUtcDay(date = new Date()) { const value = new Date(date); value.setUTCHours(0, 0, 0, 0); return value; }

function projectMetric(history: number[], weekdays: number[], targetWeekday: number) {
  const recent7 = mean(history.slice(-7));
  const recent30 = mean(history.slice(-30));
  const prior30 = mean(history.slice(-60, -30));
  const sameWeekday = mean(history.filter((_, index) => weekdays[index] === targetWeekday).slice(-8));
  const base = sameWeekday * 0.45 + recent7 * 0.35 + recent30 * 0.2;
  const trend = prior30 > 0 ? clamp((recent30 - prior30) / prior30, -0.35, 0.35) : 0;
  return Math.max(0, base * (1 + trend * 0.35));
}

export async function generateBusinessForecast(input: { lookbackDays: number; requestedBy?: string | null; source?: "manual" | "api" | "scheduled" }): Promise<BusinessForecastResult> {
  const started = Date.now();
  const run = await BusinessForecastRun.create({ status: "running", source: input.source ?? "manual", lookbackDays: input.lookbackDays, requestedBy: input.requestedBy ?? null, startedAt: new Date() });
  try {
    const today = startUtcDay();
    const from = new Date(today.getTime() - (input.lookbackDays - 1) * DAY_MS);
    const [orders, costs] = await Promise.all([
      Order.aggregate<OrderAggregateRow>([{
        $match: { createdAt: { $gte: from }, status: { $nin: ["cancelled", "rejected"] } },
      }, {
        $group: {
          _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } } },
          revenue: { $sum: { $cond: [{ $and: [{ $eq: ["$saleType", "customer"] }, { $eq: ["$paymentStatus", "paid"] }] }, "$grandTotal", 0] } },
          orders: { $sum: { $cond: [{ $eq: ["$saleType", "customer"] }, 1, 0] } },
          internalValue: { $sum: { $cond: [{ $ne: ["$saleType", "customer"] }, "$internalConsumption.menuValue", 0] } },
          wastageValue: { $sum: { $cond: [{ $eq: ["$saleType", "food_wastage"] }, "$internalConsumption.menuValue", 0] } },
          complimentaryValue: { $sum: { $cond: [{ $eq: ["$saleType", "complimentary"] }, "$internalConsumption.menuValue", 0] } },
        },
      }, { $project: { _id: 0, date: "$_id.date", revenue: 1, orders: 1, internalValue: 1, wastageValue: 1, complimentaryValue: 1 } }]),
      InventoryMovement.aggregate<CostAggregateRow>([{ $match: { createdAt: { $gte: from }, type: { $in: ["sale", "wastage"] } } }, { $group: { _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } } }, foodCost: { $sum: "$totalCost" } } }, { $project: { _id: 0, date: "$_id.date", foodCost: 1 } }]),
    ]);
    const orderMap = new Map(orders.map((row) => [row.date, row]));
    const costMap = new Map(costs.map((row) => [row.date, Number(row.foodCost ?? 0)]));
    const history: DailyRow[] = Array.from({ length: input.lookbackDays }, (_, index) => {
      const date = new Date(from.getTime() + index * DAY_MS); const key = iso(date); const row = orderMap.get(key);
      return { date: key, revenue: Number(row?.revenue ?? 0), orders: Number(row?.orders ?? 0), internalValue: Number(row?.internalValue ?? 0), wastageValue: Number(row?.wastageValue ?? 0), complimentaryValue: Number(row?.complimentaryValue ?? 0), foodCost: Number(costMap.get(key) ?? 0) };
    });
    const weekdays = history.map((row) => new Date(`${row.date}T00:00:00Z`).getUTCDay());
    const revenueStd = deviation(history.slice(-30).map((row) => row.revenue));
    const forecasts: BusinessForecastResult["forecasts"] = [];
    for (let offset = 1; offset <= 90; offset += 1) {
      const date = new Date(today.getTime() + offset * DAY_MS); const weekday = date.getUTCDay();
      const revenue = projectMetric(history.map((row) => row.revenue), weekdays, weekday);
      const values = {
        date: iso(date), revenue, orders: projectMetric(history.map((row) => row.orders), weekdays, weekday),
        internalValue: projectMetric(history.map((row) => row.internalValue), weekdays, weekday),
        wastageValue: projectMetric(history.map((row) => row.wastageValue), weekdays, weekday),
        complimentaryValue: projectMetric(history.map((row) => row.complimentaryValue), weekdays, weekday),
        foodCost: projectMetric(history.map((row) => row.foodCost), weekdays, weekday),
      };
      const spread = revenueStd * Math.sqrt(Math.min(offset, 30) / 7);
      forecasts.push({ ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === "number" ? round(value) : value])) as typeof values, lowerRevenue: round(Math.max(0, revenue - spread)), upperRevenue: round(revenue + spread) });
    }
    const horizons = HORIZONS.map((days) => { const rows = forecasts.slice(0, days); const sum = (key: keyof DailyRow) => round(rows.reduce((total, row) => total + Number(row[key]), 0)); return { days, revenue: sum("revenue"), orders: round(sum("orders"), 0), internalValue: sum("internalValue"), wastageValue: sum("wastageValue"), complimentaryValue: sum("complimentaryValue"), foodCost: sum("foodCost"), lowerRevenue: round(rows.reduce((total, row) => total + row.lowerRevenue, 0)), upperRevenue: round(rows.reduce((total, row) => total + row.upperRevenue, 0)) }; });
    const activeDays = history.filter((row) => row.orders > 0 || row.internalValue > 0).length;
    const score = Math.round(clamp((activeDays / input.lookbackDays) * 70 + Math.min(input.lookbackDays / 180, 1) * 30, 0, 100));
    const quality = score >= 75 ? { score, level: "high" as const, message: "Strong historical coverage for operational forecasting." } : score >= 45 ? { score, level: "medium" as const, message: "Usable forecast; accuracy will improve as more daily history accumulates." } : { score, level: "low" as const, message: "Limited active history. Treat projections as directional estimates." };
    const result: BusinessForecastResult = { generatedAt: new Date().toISOString(), lookbackDays: input.lookbackDays, dataDays: activeDays, quality, history, forecasts, horizons, summary: { recent30Revenue: round(history.slice(-30).reduce((sum, row) => sum + row.revenue, 0)), recent30Orders: history.slice(-30).reduce((sum, row) => sum + row.orders, 0), averageDailyRevenue: round(mean(history.slice(-30).map((row) => row.revenue))), forecast7Revenue: horizons[0].revenue, forecast30Revenue: horizons[1].revenue, forecast90Revenue: horizons[2].revenue, forecast30FoodCost: horizons[1].foodCost, forecast30InternalValue: horizons[1].internalValue } };
    await BusinessForecastRun.updateOne({ _id: run._id }, { $set: { status: "completed", completedAt: new Date(), durationMs: Date.now() - started, dataDays: activeDays, result } });
    return result;
  } catch (error) {
    await BusinessForecastRun.updateOne({ _id: run._id }, { $set: { status: "failed", completedAt: new Date(), durationMs: Date.now() - started, errorMessage: error instanceof Error ? error.message : "Forecast generation failed." } });
    throw error;
  }
}

export async function getBusinessForecast(input: { lookbackDays: number; requestedBy?: string | null; refresh?: boolean }) {
  if (!input.refresh) {
    const cached = await BusinessForecastRun.findOne({ status: "completed", lookbackDays: input.lookbackDays, createdAt: { $gte: new Date(Date.now() - 6 * 60 * 60 * 1000) } }).sort({ createdAt: -1 }).select("result").lean();
    if (cached?.result) return cached.result as BusinessForecastResult;
  }
  return generateBusinessForecast({ lookbackDays: input.lookbackDays, requestedBy: input.requestedBy, source: "manual" });
}
