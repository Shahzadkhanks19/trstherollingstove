import { Types } from "mongoose";
import { AppError } from "@/lib/errors/AppError";
import { InventoryItem } from "@/models/InventoryItem";
import { PurchaseOrder } from "@/models/PurchaseOrder";
import { PurchaseReturn } from "@/models/PurchaseReturn";
import { StockCount } from "@/models/StockCount";
import { StockTransfer } from "@/models/StockTransfer";
import { Supplier } from "@/models/Supplier";
import { WasteEntry } from "@/models/WasteEntry";
import { recordInventoryMovement } from "@/services/inventory.service";
import { publishDashboardRefresh } from "@/services/realtimeEvents.service";

function nextNumber(prefix: string) { return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`; }
function oid(id: string) { return new Types.ObjectId(id); }

export async function createPurchaseReturn(input: { supplierId: string; purchaseOrderId: string | null; supplierCreditExpected: boolean; creditNoteNumber: string; notes: string; items: Array<{ inventoryItemId: string; quantity: number; batchNumber: string; reason: string }>; actorId: string }) {
  const supplier = await Supplier.findOne({ _id: input.supplierId, isActive: true }).lean();
  if (!supplier) throw new AppError("Supplier not found.", 404);
  if (input.purchaseOrderId) {
    const purchaseOrder = await PurchaseOrder.findOne({ _id: input.purchaseOrderId, supplierId: supplier._id }).lean();
    if (!purchaseOrder) throw new AppError("Purchase order does not belong to this supplier.", 409);
  }
  const items = await InventoryItem.find({ _id: { $in: input.items.map((item) => oid(item.inventoryItemId)) }, isActive: true }).lean();
  if (items.length !== input.items.length) throw new AppError("One or more inventory items are unavailable.", 409);
  const byId = new Map(items.map((item) => [String(item._id), item]));
  let subtotal = 0;
  const lines = input.items.map((line) => {
    const item = byId.get(line.inventoryItemId);
    if (!item) throw new AppError("Inventory item not found.", 404);
    const lineTotal = line.quantity * item.averageUnitCost;
    subtotal += lineTotal;
    return { ...line, itemName: item.name, unitCost: item.averageUnitCost, lineTotal };
  });
  return PurchaseReturn.create({ returnNumber: nextNumber("PR"), supplierId: supplier._id, purchaseOrderId: input.purchaseOrderId ? oid(input.purchaseOrderId) : null, items: lines, subtotal, taxTotal: 0, grandTotal: subtotal, supplierCreditExpected: input.supplierCreditExpected, creditNoteNumber: input.creditNoteNumber, notes: input.notes, createdBy: oid(input.actorId), updatedBy: oid(input.actorId) });
}

export async function approvePurchaseReturn(id: string, actorId: string) {
  const entry = await PurchaseReturn.findOne({ _id: id, status: "draft" });
  if (!entry) throw new AppError("Draft purchase return not found.", 404);
  for (const line of entry.items) {
    await recordInventoryMovement({ inventoryItemId: String(line.inventoryItemId), type: "return_out", quantity: line.quantity, unitCost: line.unitCost, referenceType: "return", referenceId: String(entry._id), reason: line.reason || `Purchase return ${entry.returnNumber}`, batchNumber: line.batchNumber, actorId });
  }
  entry.status = "approved";
  entry.approvedBy = oid(actorId);
  entry.approvedAt = new Date();
  entry.updatedBy = oid(actorId);
  await entry.save();
  publishDashboardRefresh("inventory.purchase_return_approved", actorId);
  return entry;
}

export async function createStockTransfer(input: { fromWarehouseId: string; toWarehouseId: string; notes: string; items: Array<{ inventoryItemId: string; quantity: number; batchNumber: string }>; actorId: string }) {
  const items = await InventoryItem.find({ _id: { $in: input.items.map((item) => oid(item.inventoryItemId)) }, isActive: true }).lean();
  if (items.length !== input.items.length) throw new AppError("One or more inventory items are unavailable.", 409);
  const byId = new Map(items.map((item) => [String(item._id), item]));
  const lines = input.items.map((line) => { const item = byId.get(line.inventoryItemId); if (!item) throw new AppError("Inventory item not found.", 404); return { ...line, itemName: item.name, unitCost: item.averageUnitCost }; });
  return StockTransfer.create({ transferNumber: nextNumber("ST"), fromWarehouseId: oid(input.fromWarehouseId), toWarehouseId: oid(input.toWarehouseId), items: lines, notes: input.notes, createdBy: oid(input.actorId), updatedBy: oid(input.actorId) });
}

export async function completeStockTransfer(id: string, actorId: string) {
  const transfer = await StockTransfer.findOne({ _id: id, status: { $in: ["draft", "in_transit"] } });
  if (!transfer) throw new AppError("Open stock transfer not found.", 404);
  for (const line of transfer.items) {
    await recordInventoryMovement({ inventoryItemId: String(line.inventoryItemId), type: "transfer_out", quantity: line.quantity, unitCost: line.unitCost, referenceType: "transfer", referenceId: String(transfer._id), reason: `Transfer ${transfer.transferNumber} dispatched`, batchNumber: line.batchNumber, actorId });
    await recordInventoryMovement({ inventoryItemId: String(line.inventoryItemId), type: "transfer_in", quantity: line.quantity, unitCost: line.unitCost, referenceType: "transfer", referenceId: String(transfer._id), reason: `Transfer ${transfer.transferNumber} received`, batchNumber: line.batchNumber, actorId });
  }
  transfer.status = "completed";
  transfer.dispatchedAt ??= new Date();
  transfer.completedAt = new Date();
  transfer.updatedBy = oid(actorId);
  await transfer.save();
  publishDashboardRefresh("inventory.stock_transfer_completed", actorId);
  return transfer;
}

export async function createStockCount(input: { warehouseId: string | null; countType: "full" | "cycle" | "spot"; notes: string; items: Array<{ inventoryItemId: string; countedQuantity: number; reason: string }>; actorId: string }) {
  const inventory = await InventoryItem.find({ _id: { $in: input.items.map((item) => oid(item.inventoryItemId)) }, isActive: true }).lean();
  if (inventory.length !== input.items.length) throw new AppError("One or more inventory items are unavailable.", 409);
  const byId = new Map(inventory.map((item) => [String(item._id), item]));
  const lines = input.items.map((line) => { const item = byId.get(line.inventoryItemId); if (!item) throw new AppError("Inventory item not found.", 404); const varianceQuantity = line.countedQuantity - item.currentStock; return { ...line, itemName: item.name, systemQuantity: item.currentStock, varianceQuantity, unitCost: item.averageUnitCost, varianceValue: varianceQuantity * item.averageUnitCost }; });
  return StockCount.create({ countNumber: nextNumber("SC"), warehouseId: input.warehouseId ? oid(input.warehouseId) : null, countType: input.countType, items: lines, notes: input.notes, createdBy: oid(input.actorId), updatedBy: oid(input.actorId) });
}

export async function postStockCount(id: string, actorId: string) {
  const count = await StockCount.findOne({ _id: id, status: "draft" });
  if (!count) throw new AppError("Draft stock count not found.", 404);
  for (const line of count.items) {
    if (line.varianceQuantity === 0) continue;
    await recordInventoryMovement({ inventoryItemId: String(line.inventoryItemId), type: line.varianceQuantity > 0 ? "adjustment_in" : "adjustment_out", quantity: Math.abs(line.varianceQuantity), unitCost: line.unitCost, referenceType: "stock_count", referenceId: String(count._id), reason: line.reason || `Stock count ${count.countNumber}`, actorId });
  }
  count.status = "posted";
  count.postedBy = oid(actorId);
  count.postedAt = new Date();
  count.updatedBy = oid(actorId);
  await count.save();
  publishDashboardRefresh("inventory.stock_count_posted", actorId);
  return count;
}

export async function createWasteEntry(input: { inventoryItemId: string; warehouseId: string | null; quantity: number; wasteType: "spoilage" | "expiry" | "damage" | "production_loss" | "theft" | "other"; batchNumber: string; reason: string; occurredAt?: Date; actorId: string }) {
  const item = await InventoryItem.findOne({ _id: input.inventoryItemId, isActive: true }).lean();
  if (!item) throw new AppError("Inventory item not found.", 404);
  const waste = await WasteEntry.create({ wasteNumber: nextNumber("WE"), inventoryItemId: item._id, warehouseId: input.warehouseId ? oid(input.warehouseId) : null, quantity: input.quantity, unitCost: item.averageUnitCost, totalCost: input.quantity * item.averageUnitCost, wasteType: input.wasteType, batchNumber: input.batchNumber, reason: input.reason, occurredAt: input.occurredAt ?? new Date(), createdBy: oid(input.actorId) });
  await recordInventoryMovement({ inventoryItemId: String(item._id), type: "wastage", quantity: input.quantity, unitCost: item.averageUnitCost, referenceType: "wastage", referenceId: String(waste._id), reason: input.reason, batchNumber: input.batchNumber, actorId: input.actorId });
  publishDashboardRefresh("inventory.wastage_recorded", input.actorId);
  return waste;
}
