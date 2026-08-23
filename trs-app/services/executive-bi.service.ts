import { ExecutiveBIReportRun } from "@/models/ExecutiveBIReportRun";
import { ExecutiveBISnapshot } from "@/models/ExecutiveBISnapshot";
import { InventoryForecastRun } from "@/models/InventoryForecastRun";
import { InventoryForecastSnapshot } from "@/models/InventoryForecastSnapshot";
import { InventoryItem } from "@/models/InventoryItem";
import { InventoryMovement } from "@/models/InventoryMovement";
import { Order } from "@/models/Order";
import { PurchaseOrder } from "@/models/PurchaseOrder";
import { Supplier } from "@/models/Supplier";
import { SupplierIntelligenceRun } from "@/models/SupplierIntelligenceRun";
import { SupplierIntelligenceSnapshot } from "@/models/SupplierIntelligenceSnapshot";
import { publishInventoryEnterpriseEvent, recordInventoryAudit } from "@/services/inventory-enterprise-events.service";

const DAY = 86_400_000;
const round = (value: number, places = 2) => { const factor = 10 ** places; return Math.round((value + Number.EPSILON) * factor) / factor; };
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const pct = (part: number, total: number) => total > 0 ? (part / total) * 100 : 0;
const changePct = (current: number, previous: number) => previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

type PeriodPreset = "today" | "week" | "month" | "quarter" | "year" | "custom";
type GenerateOptions = { periodPreset: PeriodPreset; startDate?: Date; endDate?: Date; carryingCostAnnualPercent: number; deadStockDays: number; source: "manual" | "scheduled" | "api"; requestedBy?: string | null };
type Period = { start: Date; end: Date; comparisonStart: Date; comparisonEnd: Date };

function startOfDay(date: Date) { const result = new Date(date); result.setHours(0,0,0,0); return result; }
function endOfDay(date: Date) { const result = new Date(date); result.setHours(23,59,59,999); return result; }
export function resolveExecutivePeriod(preset: PeriodPreset, startDate?: Date, endDate?: Date): Period {
  const now = new Date(); let start: Date; const end = endOfDay(endDate ?? now);
  if (preset === "custom") { start = startOfDay(startDate ?? now); }
  else if (preset === "today") { start = startOfDay(now); }
  else if (preset === "week") { start = startOfDay(now); start.setDate(start.getDate() - 6); }
  else if (preset === "month") { start = new Date(now.getFullYear(), now.getMonth(), 1); }
  else if (preset === "quarter") { start = new Date(now.getFullYear(), Math.floor(now.getMonth()/3)*3, 1); }
  else { start = new Date(now.getFullYear(), 0, 1); }
  const span = end.getTime() - start.getTime() + 1;
  const comparisonEnd = new Date(start.getTime() - 1);
  const comparisonStart = new Date(comparisonEnd.getTime() - span + 1);
  return { start, end, comparisonStart, comparisonEnd };
}

async function salesMetrics(start: Date, end: Date) {
  const [row] = await Order.aggregate([{ $match: { createdAt: { $gte: start, $lte: end }, status: { $nin: ["cancelled", "rejected"] }, paymentStatus: "paid" } }, { $group: { _id: null, revenue: { $sum: "$grandTotal" }, orders: { $sum: 1 }, discounts: { $sum: "$discountTotal" }, taxes: { $sum: "$taxTotal" } } }]);
  return { revenue: Number(row?.revenue ?? 0), orders: Number(row?.orders ?? 0), discounts: Number(row?.discounts ?? 0), taxes: Number(row?.taxes ?? 0) };
}

export async function generateExecutiveBI(options: GenerateOptions) {
  const started = Date.now(); const period = resolveExecutivePeriod(options.periodPreset, options.startDate, options.endDate);
  const run = await ExecutiveBIReportRun.create({ status: "running", source: options.source, periodPreset: options.periodPreset, periodStart: period.start, periodEnd: period.end, comparisonStart: period.comparisonStart, comparisonEnd: period.comparisonEnd, requestedBy: options.requestedBy ?? null, startedAt: new Date() });
  try {
    const [currentSales, previousSales, purchaseRows, movementRows, items, latestSupplierRun, latestForecastRun, topSellingItems] = await Promise.all([
      salesMetrics(period.start, period.end), salesMetrics(period.comparisonStart, period.comparisonEnd),
      PurchaseOrder.aggregate([{ $match: { orderDate: { $gte: period.start, $lte: period.end }, status: { $ne: "cancelled" } } }, { $group: { _id: "$supplierId", spend: { $sum: "$grandTotal" }, orders: { $sum: 1 } } }, { $sort: { spend: -1 } }]),
      InventoryMovement.aggregate([{ $match: { createdAt: { $gte: period.start, $lte: period.end }, type: { $in: ["sale", "wastage", "adjustment_out", "return_out"] } } }, { $group: { _id: { type: "$type", item: "$inventoryItemId" }, cost: { $sum: "$totalCost" }, quantity: { $sum: "$quantity" } } }]),
      InventoryItem.find({ isActive: true }).select("name category currentStock idealStockLevel averageUnitCost").lean(),
      SupplierIntelligenceRun.findOne({ status: "completed" }).sort({ completedAt: -1 }).lean(),
      InventoryForecastRun.findOne({ status: "completed" }).sort({ completedAt: -1 }).lean(),
      Order.aggregate([{ $match: { createdAt: { $gte: period.start, $lte: period.end }, status: { $nin: ["cancelled", "rejected"] }, paymentStatus: "paid" } }, { $unwind: "$items" }, { $group: { _id: "$items.name", quantity: { $sum: "$items.quantity" }, revenue: { $sum: "$items.lineTotal" } } }, { $sort: { revenue: -1 } }, { $limit: 10 }]),
    ]);

    let cogs=0,wastageCost=0,adjustmentLossCost=0; const wasteByItem = new Map<string, number>();
    for (const row of movementRows) { const cost=Number(row.cost??0); if (row._id.type === "sale") cogs += cost; else if (row._id.type === "wastage") { wastageCost += cost; wasteByItem.set(String(row._id.item), (wasteByItem.get(String(row._id.item))??0)+cost); } else adjustmentLossCost += cost; }
    const inventoryValue = items.reduce((sum,item)=>sum+Number(item.currentStock??0)*Number(item.averageUnitCost??0),0);
    const overstockCost = items.reduce((sum,item)=>sum+Math.max(0,Number(item.currentStock??0)-Number(item.idealStockLevel??0))*Number(item.averageUnitCost??0),0);
    const deadCutoff = new Date(Date.now()-options.deadStockDays*DAY);
    const activeIds = new Set((await InventoryMovement.distinct("inventoryItemId", { createdAt: { $gte: deadCutoff }, type: { $in: ["sale","adjustment_out","wastage","return_out"] } })).map(String));
    const deadStockCost = items.reduce((sum,item)=>activeIds.has(String(item._id))?sum:sum+Number(item.currentStock??0)*Number(item.averageUnitCost??0),0);
    const periodDays = Math.max(1,(period.end.getTime()-period.start.getTime())/DAY); const annualizedCogs = cogs*(365/periodDays);
    const inventoryTurnover = inventoryValue>0?annualizedCogs/inventoryValue:0; const dio=annualizedCogs>0?(inventoryValue/annualizedCogs)*365:0;
    const carryingCostEstimate = inventoryValue*(options.carryingCostAnnualPercent/100)*(periodDays/365);
    const purchaseSpend = purchaseRows.reduce((sum,row)=>sum+Number(row.spend??0),0);
    const grossProfit = currentSales.revenue-cogs; const grossMarginPercent=pct(grossProfit,currentSales.revenue); const foodCostPercent=pct(cogs,currentSales.revenue); const lossPercentOfRevenue=pct(wastageCost+adjustmentLossCost,currentSales.revenue);

    let supplierPerformanceScore=0; if (latestSupplierRun) { const [row] = await SupplierIntelligenceSnapshot.aggregate([{ $match:{ runId: latestSupplierRun._id } }, { $group:{ _id:null, score:{ $avg:"$overallScore" } } }]); supplierPerformanceScore=Number(row?.score??0); }
    let forecastConfidenceScore=0,forecastHighRiskItems=0,forecastReorderValue=0; if (latestForecastRun) { const [row] = await InventoryForecastSnapshot.aggregate([{ $match:{ runId:latestForecastRun._id } }, { $group:{ _id:null, confidence:{ $avg:"$confidenceScore" }, highRisk:{ $sum:{ $cond:[{ $in:["$riskLevel",["critical","high"]]},1,0]}}, reorderValue:{ $sum:"$recommendedOrderValue" } } }]); forecastConfidenceScore=Number(row?.confidence??0); forecastHighRiskItems=Number(row?.highRisk??0); forecastReorderValue=Number(row?.reorderValue??0); }

    const suppliers = await Supplier.find({ _id:{ $in:purchaseRows.map(row=>row._id) } }).select("name").lean(); const supplierNames=new Map(suppliers.map(item=>[String(item._id),item.name]));
    const supplierSpend=purchaseRows.slice(0,10).map(row=>({ supplier:supplierNames.get(String(row._id))??"Unknown supplier", spend:round(Number(row.spend??0)), orders:Number(row.orders??0) }));
    const categoryInventory=Array.from(items.reduce((map,item)=>{ const key=String(item.category); const current=map.get(key)??{category:key,value:0,items:0}; current.value+=Number(item.currentStock??0)*Number(item.averageUnitCost??0); current.items+=1; map.set(key,current); return map; },new Map<string,{category:string;value:number;items:number}>()).values()).sort((a,b)=>b.value-a.value);
    const itemById=new Map(items.map(item=>[String(item._id),item])); const wasteByCategory=Array.from(Array.from(wasteByItem.entries()).reduce((map,[id,cost])=>{ const category=String(itemById.get(id)?.category??"Uncategorised"); map.set(category,(map.get(category)??0)+cost); return map; },new Map<string,number>()).entries()).map(([category,cost])=>({category,cost:round(cost)})).sort((a,b)=>b.cost-a.cost);

    const profitabilityScore=clamp(grossMarginPercent*1.5); const procurementEfficiencyScore=clamp((supplierPerformanceScore||50)*0.7+clamp(100-Math.max(0,pct(purchaseSpend,currentSales.revenue)-35)*2)*0.3); const wasteEfficiencyScore=clamp(100-lossPercentOfRevenue*12); const inventoryEfficiencyScore=clamp(inventoryTurnover*15 + clamp(100-pct(deadStockCost+overstockCost,inventoryValue))*0.5); const businessHealthScore=clamp(profitabilityScore*0.35+procurementEfficiencyScore*0.2+wasteEfficiencyScore*0.2+inventoryEfficiencyScore*0.15+(forecastConfidenceScore||50)*0.1);
    const insights:string[]=[]; if (grossMarginPercent<50) insights.push("Gross margin is below 50%; review menu pricing, portion costs, and high-cost recipes."); if (foodCostPercent>35) insights.push("Food cost is above the common 35% control threshold; investigate ingredient usage and purchase prices."); if (lossPercentOfRevenue>3) insights.push("Waste and adjustment losses exceed 3% of revenue; prioritise loss-control actions."); if (deadStockCost>inventoryValue*0.15) insights.push("More than 15% of inventory value is tied in dead stock; reduce or repurpose inactive items."); if (forecastHighRiskItems>0) insights.push(`${forecastHighRiskItems} forecast items are at critical or high stockout risk.`); if (!insights.length) insights.push("Core financial and operating indicators are within the configured control ranges.");
    const generatedAt=new Date(); const snapshot=await ExecutiveBISnapshot.create({ runId:run._id, periodStart:period.start, periodEnd:period.end, comparisonStart:period.comparisonStart, comparisonEnd:period.comparisonEnd, revenue:round(currentSales.revenue), previousRevenue:round(previousSales.revenue), revenueChangePercent:round(changePct(currentSales.revenue,previousSales.revenue),1), orderCount:currentSales.orders, averageOrderValue:round(currentSales.orders?currentSales.revenue/currentSales.orders:0), purchaseSpend:round(purchaseSpend), cogs:round(cogs), grossProfit:round(grossProfit), grossMarginPercent:round(grossMarginPercent,1), foodCostPercent:round(foodCostPercent,1), inventoryValue:round(inventoryValue), inventoryTurnover:round(inventoryTurnover,2), daysInventoryOutstanding:round(dio,1), carryingCostEstimate:round(carryingCostEstimate), deadStockCost:round(deadStockCost), overstockCost:round(overstockCost), wastageCost:round(wastageCost), adjustmentLossCost:round(adjustmentLossCost), lossPercentOfRevenue:round(lossPercentOfRevenue,1), supplierPerformanceScore:round(supplierPerformanceScore,1), forecastConfidenceScore:round(forecastConfidenceScore,1), forecastHighRiskItems, forecastReorderValue:round(forecastReorderValue), procurementEfficiencyScore:round(procurementEfficiencyScore,1), wasteEfficiencyScore:round(wasteEfficiencyScore,1), inventoryEfficiencyScore:round(inventoryEfficiencyScore,1), profitabilityScore:round(profitabilityScore,1), businessHealthScore:round(businessHealthScore,1), trends:[{label:"Current period",revenue:round(currentSales.revenue),cogs:round(cogs),grossProfit:round(grossProfit)},{label:"Previous period",revenue:round(previousSales.revenue)}], categoryInventory, wasteByCategory, supplierSpend, topSellingItems:topSellingItems.map(row=>({item:row._id,quantity:row.quantity,revenue:round(row.revenue)})), insights, generatedAt });
    run.status="completed"; run.revenue=round(currentSales.revenue); run.grossProfit=round(grossProfit); run.grossMarginPercent=round(grossMarginPercent,1); run.businessHealthScore=round(businessHealthScore,1); run.durationMs=Date.now()-started; run.completedAt=generatedAt; await run.save();
    await recordInventoryAudit({ actorUserId:options.requestedBy??null, action:"executive.bi_generated", entityType:"ExecutiveBIReportRun", entityId:String(run._id), description:"Executive business intelligence report generated.", metadata:{ periodPreset:options.periodPreset,revenue:run.revenue,businessHealthScore:run.businessHealthScore } });
    publishInventoryEnterpriseEvent({ event:"inventory.report_completed", entityId:String(run._id), data:{ reportType:"executive_business_intelligence", revenue:run.revenue, businessHealthScore:run.businessHealthScore } });
    return { runId:String(run._id), snapshotId:String(snapshot._id), businessHealthScore:run.businessHealthScore, revenue:run.revenue, grossProfit:run.grossProfit, generatedAt };
  } catch(error) { run.status="failed"; run.errorMessage=error instanceof Error?error.message:"Unknown executive BI error."; run.durationMs=Date.now()-started; run.completedAt=new Date(); await run.save(); throw error; }
}

export async function getLatestExecutiveBI() { const run=await ExecutiveBIReportRun.findOne({status:"completed"}).sort({completedAt:-1}).lean(); if(!run) return {run:null,snapshot:null}; const snapshot=await ExecutiveBISnapshot.findOne({runId:run._id}).lean(); return {run:{id:String(run._id),periodPreset:run.periodPreset,periodStart:run.periodStart,periodEnd:run.periodEnd,durationMs:run.durationMs,completedAt:run.completedAt},snapshot}; }
