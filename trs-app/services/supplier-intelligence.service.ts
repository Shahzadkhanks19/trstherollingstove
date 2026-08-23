import { GoodsReceipt } from "@/models/GoodsReceipt";
import { PurchaseOrder } from "@/models/PurchaseOrder";
import { PurchaseReturn } from "@/models/PurchaseReturn";
import { Supplier } from "@/models/Supplier";
import { SupplierIntelligenceRun } from "@/models/SupplierIntelligenceRun";
import { SupplierIntelligenceSnapshot } from "@/models/SupplierIntelligenceSnapshot";
import { publishInventoryEnterpriseEvent, recordInventoryAudit } from "@/services/inventory-enterprise-events.service";

type Source = "manual" | "scheduled" | "api";
type GenerateOptions = { lookbackDays: number; source: Source; requestedBy?: string | null };
type POLean = { _id: unknown; supplierId: unknown; status: string; orderDate: Date; expectedDeliveryDate?: Date | null; grandTotal: number; items: Array<{ inventoryItemId: unknown; orderedQuantity: number; receivedQuantity: number; unitCost: number }> };
type GRNLean = { purchaseOrderId: unknown; supplierId: unknown; receivedAt: Date; items: Array<{ inventoryItemId: unknown; receivedQuantity: number; acceptedQuantity: number; rejectedQuantity: number; unitCost: number }> };
type ReturnLean = { supplierId: unknown; status: string; grandTotal: number };

const DAY = 86_400_000;
const round = (value: number, places = 2) => { const factor = 10 ** places; return Math.round((value + Number.EPSILON) * factor) / factor; };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const percent = (part: number, total: number) => total > 0 ? (part / total) * 100 : 0;

function grade(score: number) { if (score >= 85) return "A" as const; if (score >= 70) return "B" as const; if (score >= 55) return "C" as const; return "D" as const; }
function recommendation(input: { score: number; onTime: number; rejection: number; fillRate: number; priceVariance: number; orders: number }) {
  if (input.orders === 0) return "No purchase history in this period; collect transaction data before ranking.";
  if (input.score >= 85 && input.onTime >= 90 && input.rejection <= 2) return "Preferred supplier: prioritize for recurring purchases and negotiated volume pricing.";
  if (input.rejection > 8) return "Quality risk: review rejected goods, specifications, and replacement terms before the next order.";
  if (input.onTime < 70) return "Delivery risk: revise lead-time expectations, add delivery SLAs, or qualify a backup supplier.";
  if (input.fillRate < 80) return "Fulfilment risk: confirm availability before ordering and maintain an alternate source.";
  if (input.priceVariance > 10) return "Price volatility: renegotiate rates and compare item-level quotations before approval.";
  if (input.score >= 70) return "Approved supplier: continue ordering while monitoring delivery and pricing trends.";
  return "Improvement required: reduce purchasing exposure until reliability, quality, and fulfilment improve.";
}

export async function generateSupplierIntelligence(options: GenerateOptions) {
  const started = Date.now();
  const run = await SupplierIntelligenceRun.create({ status: "running", source: options.source, lookbackDays: options.lookbackDays, requestedBy: options.requestedBy ?? null, startedAt: new Date() });
  try {
    const from = new Date(Date.now() - options.lookbackDays * DAY);
    const [suppliers, orders, receipts, returns] = await Promise.all([
      Supplier.find().sort({ name: 1 }).lean(),
      PurchaseOrder.find({ orderDate: { $gte: from }, status: { $ne: "cancelled" } }).lean<POLean[]>(),
      GoodsReceipt.find({ receivedAt: { $gte: from } }).lean<GRNLean[]>(),
      PurchaseReturn.find({ returnDate: { $gte: from }, status: "approved" }).lean<ReturnLean[]>(),
    ]);

    const receiptsByPo = new Map<string, GRNLean[]>();
    for (const receipt of receipts) { const key = String(receipt.purchaseOrderId); const list = receiptsByPo.get(key) ?? []; list.push(receipt); receiptsByPo.set(key, list); }
    const returnsBySupplier = new Map<string, { count: number; value: number }>();
    for (const item of returns) { const key = String(item.supplierId); const current = returnsBySupplier.get(key) ?? { count: 0, value: 0 }; current.count += 1; current.value += Number(item.grandTotal ?? 0); returnsBySupplier.set(key, current); }

    const generatedAt = new Date();
    const snapshots = suppliers.map((supplier) => {
      const sid = String(supplier._id);
      const supplierOrders = orders.filter((order) => String(order.supplierId) === sid);
      let orderedQuantity = 0, receivedQuantity = 0, acceptedQuantity = 0, rejectedQuantity = 0;
      let totalSpend = 0, completedOrderCount = 0, onTimeCount = 0, deliveryCount = 0, leadTotal = 0, delayTotal = 0;
      const itemPrices = new Map<string, number[]>();
      for (const order of supplierOrders) {
        totalSpend += Number(order.grandTotal ?? 0);
        orderedQuantity += order.items.reduce((sum, item) => sum + Number(item.orderedQuantity ?? 0), 0);
        for (const item of order.items) { const key = String(item.inventoryItemId); const values = itemPrices.get(key) ?? []; values.push(Number(item.unitCost ?? 0)); itemPrices.set(key, values); }
        const poReceipts = receiptsByPo.get(String(order._id)) ?? [];
        if (poReceipts.length) {
          completedOrderCount += 1;
          const lastReceipt = poReceipts.reduce((latest, receipt) => receipt.receivedAt > latest.receivedAt ? receipt : latest);
          const lead = Math.max(0, (lastReceipt.receivedAt.getTime() - order.orderDate.getTime()) / DAY); leadTotal += lead;
          if (order.expectedDeliveryDate) { deliveryCount += 1; const delay = (lastReceipt.receivedAt.getTime() - new Date(order.expectedDeliveryDate).getTime()) / DAY; delayTotal += delay; if (delay <= 0.99) onTimeCount += 1; }
          for (const receipt of poReceipts) for (const item of receipt.items) { receivedQuantity += Number(item.receivedQuantity ?? 0); acceptedQuantity += Number(item.acceptedQuantity ?? 0); rejectedQuantity += Number(item.rejectedQuantity ?? 0); }
        }
      }
      const variances: number[] = [];
      for (const values of itemPrices.values()) if (values.length > 1) { const baseline = values[0]; if (baseline > 0) for (const value of values.slice(1)) variances.push(((value - baseline) / baseline) * 100); }
      const purchasePriceVariancePercent = variances.length ? variances.reduce((a,b)=>a+b,0)/variances.length : 0;
      const fillRatePercent = clamp(percent(receivedQuantity, orderedQuantity), 0, 100);
      const rejectionRatePercent = clamp(percent(rejectedQuantity, receivedQuantity), 0, 100);
      const qualityScore = clamp(100 - rejectionRatePercent * 5, 0, 100);
      const onTimeDeliveryPercent = deliveryCount ? percent(onTimeCount, deliveryCount) : completedOrderCount ? 75 : 0;
      const averageLeadTimeDays = completedOrderCount ? leadTotal / completedOrderCount : 0;
      const averageDelayDays = deliveryCount ? delayTotal / deliveryCount : 0;
      const deliveryScore = clamp(onTimeDeliveryPercent - Math.max(0, averageDelayDays) * 3, 0, 100);
      const fulfilmentScore = clamp(fillRatePercent, 0, 100);
      const priceScore = clamp(100 - Math.max(0, purchasePriceVariancePercent) * 3 - Math.abs(Math.min(0, purchasePriceVariancePercent)), 0, 100);
      const historyScore = clamp(supplierOrders.length * 10, 0, 100);
      const returnInfo = returnsBySupplier.get(sid) ?? { count: 0, value: 0 };
      const returnPenalty = totalSpend > 0 ? clamp((returnInfo.value / totalSpend) * 100, 0, 20) : 0;
      const reliabilityScore = clamp(deliveryScore * 0.45 + fulfilmentScore * 0.35 + historyScore * 0.2 - returnPenalty, 0, 100);
      const overallScore = clamp(deliveryScore * 0.30 + qualityScore * 0.25 + fulfilmentScore * 0.20 + priceScore * 0.15 + reliabilityScore * 0.10, 0, 100);
      const preferredSupplier = overallScore >= 85 && onTimeDeliveryPercent >= 85 && rejectionRatePercent <= 3 && supplierOrders.length >= 2;
      return {
        runId: run._id, supplierId: supplier._id, supplierName: supplier.name, supplierCode: supplier.code, isActive: supplier.isActive,
        purchaseOrderCount: supplierOrders.length, completedOrderCount, totalSpend: round(totalSpend), averageOrderValue: round(supplierOrders.length ? totalSpend / supplierOrders.length : 0),
        orderedQuantity: round(orderedQuantity,4), receivedQuantity: round(receivedQuantity,4), acceptedQuantity: round(acceptedQuantity,4), rejectedQuantity: round(rejectedQuantity,4),
        fillRatePercent: round(fillRatePercent,1), rejectionRatePercent: round(rejectionRatePercent,1), qualityScore: round(qualityScore,1), onTimeDeliveryPercent: round(onTimeDeliveryPercent,1),
        averageLeadTimeDays: round(averageLeadTimeDays,1), averageDelayDays: round(averageDelayDays,1), purchasePriceVariancePercent: round(purchasePriceVariancePercent,1),
        returnCount: returnInfo.count, returnValue: round(returnInfo.value), deliveryScore: round(deliveryScore,1), fulfilmentScore: round(fulfilmentScore,1), priceScore: round(priceScore,1), reliabilityScore: round(reliabilityScore,1),
        overallScore: round(overallScore,1), grade: grade(overallScore), preferredSupplier,
        recommendation: recommendation({ score: overallScore, onTime: onTimeDeliveryPercent, rejection: rejectionRatePercent, fillRate: fillRatePercent, priceVariance: purchasePriceVariancePercent, orders: supplierOrders.length }), generatedAt,
      };
    });
    if (snapshots.length) await SupplierIntelligenceSnapshot.insertMany(snapshots, { ordered: false });
    const preferredSupplierCount = snapshots.filter((item) => item.preferredSupplier).length;
    const totalSpend = snapshots.reduce((sum,item)=>sum+item.totalSpend,0);
    const averageScore = snapshots.length ? snapshots.reduce((sum,item)=>sum+item.overallScore,0)/snapshots.length : 0;
    run.status="completed"; run.supplierCount=snapshots.length; run.preferredSupplierCount=preferredSupplierCount; run.totalSpend=round(totalSpend); run.averageScore=round(averageScore,1); run.durationMs=Date.now()-started; run.completedAt=new Date(); await run.save();
    await recordInventoryAudit({ actorUserId: options.requestedBy ?? null, action: "supplier.intelligence_generated", entityType: "SupplierIntelligenceRun", entityId: String(run._id), description: `Supplier intelligence generated for ${snapshots.length} suppliers.`, metadata: { lookbackDays: options.lookbackDays, preferredSupplierCount, totalSpend, averageScore } });
    publishInventoryEnterpriseEvent({ event: "inventory.report_completed", entityId: String(run._id), data: { reportType: "supplier_intelligence", supplierCount: snapshots.length, preferredSupplierCount, totalSpend, averageScore } });
    return { runId: String(run._id), supplierCount: snapshots.length, preferredSupplierCount, totalSpend: round(totalSpend), averageScore: round(averageScore,1), durationMs: run.durationMs, generatedAt };
  } catch (error) { run.status="failed"; run.errorMessage=error instanceof Error ? error.message : "Unknown supplier intelligence error."; run.durationMs=Date.now()-started; run.completedAt=new Date(); await run.save(); throw error; }
}

export async function getLatestSupplierIntelligenceRun() { return SupplierIntelligenceRun.findOne({ status: "completed" }).sort({ completedAt: -1 }).lean(); }
export async function getSupplierIntelligenceSummary(runId?: string) {
  const run = runId ? await SupplierIntelligenceRun.findById(runId).lean() : await getLatestSupplierIntelligenceRun();
  if (!run) return { run: null, summary: { supplierCount:0, preferredSupplierCount:0, gradeA:0, gradeB:0, gradeC:0, gradeD:0, totalSpend:0, averageScore:0, averageOnTime:0, averageQuality:0, averageFillRate:0 }, topSuppliers: [], spendLeaders: [] };
  const [rows, topSuppliers, spendLeaders] = await Promise.all([
    SupplierIntelligenceSnapshot.aggregate([{ $match: { runId: run._id } }, { $group: { _id:null, supplierCount:{$sum:1}, preferredSupplierCount:{$sum:{$cond:["$preferredSupplier",1,0]}}, gradeA:{$sum:{$cond:[{$eq:["$grade","A"]},1,0]}}, gradeB:{$sum:{$cond:[{$eq:["$grade","B"]},1,0]}}, gradeC:{$sum:{$cond:[{$eq:["$grade","C"]},1,0]}}, gradeD:{$sum:{$cond:[{$eq:["$grade","D"]},1,0]}}, totalSpend:{$sum:"$totalSpend"}, averageScore:{$avg:"$overallScore"}, averageOnTime:{$avg:"$onTimeDeliveryPercent"}, averageQuality:{$avg:"$qualityScore"}, averageFillRate:{$avg:"$fillRatePercent"} } }]),
    SupplierIntelligenceSnapshot.find({ runId: run._id }).sort({ overallScore:-1, totalSpend:-1 }).limit(5).lean(),
    SupplierIntelligenceSnapshot.find({ runId: run._id }).sort({ totalSpend:-1 }).limit(5).lean(),
  ]);
  return { run: { id:String(run._id), lookbackDays:run.lookbackDays, supplierCount:run.supplierCount, preferredSupplierCount:run.preferredSupplierCount, totalSpend:run.totalSpend, averageScore:run.averageScore, durationMs:run.durationMs, completedAt:run.completedAt }, summary: rows[0] ?? {}, topSuppliers, spendLeaders };
}
