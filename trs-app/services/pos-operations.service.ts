import { Types } from "mongoose";
import { AppError } from "@/lib/errors/AppError";
import { calculatePosCartTotals } from "@/lib/pos/cart";
import { createChangedKotRevision, createInitialKotRevision } from "@/lib/pos/running-order-kot";
import { nextRunningOrderIdentity } from "@/lib/pos/running-order-number";
import { Order } from "@/models/Order";
import { POSAuditEvent } from "@/models/POSAuditEvent";
import { POSCashMovement } from "@/models/POSCashMovement";
import { POSRefund } from "@/models/POSRefund";
import { POSRunningOrder } from "@/models/POSRunningOrder";
import { KitchenTicket } from "@/models/KitchenTicket";
import { MenuItem } from "@/models/MenuItem";
import { POSShift } from "@/models/POSShift";
import { POSTable } from "@/models/POSTable";
import { createPosOrder } from "@/services/pos-order.service";
import { createKitchenTicketsFromOrder } from "@/services/kds.service";
import { publishDashboardRefresh } from "@/services/realtimeEvents.service";
import { publishRealtimeEventSafely } from "@/services/realtimePublisher.service";
import type { PosCartLine, PosCartState } from "@/types/pos";

function oid(value: string) { return new Types.ObjectId(value); }
function isActive(status: string) { return ["open", "sent_to_kitchen", "partially_paid"].includes(status); }

function normalizeRunningOrderCartVariants(cart: PosCartState): PosCartState {
  let changed = false;
  const lines = cart.lines.map((line) => {
    const syntheticBaseVariantId = `${line.itemId}-base`;
    if (line.source !== "menu" || line.variantId !== syntheticBaseVariantId) return line;
    changed = true;
    return { ...line, variantId: null };
  });
  return changed ? { ...cart, lines } : cart;
}

async function audit(actorId: string, action: string, entityType: string, entityId: Types.ObjectId, reason = "", before: unknown = null, after: unknown = null) {
  await POSAuditEvent.create({ actorId: oid(actorId), action, entityType, entityId, reason, before, after });
}

function emit(action: string, entityId: string, actorId: string, data: Record<string, unknown> = {}) {
  publishRealtimeEventSafely({
    event: "order.updated",
    entityId,
    actorId,
    data: { action, ...data },
    target: { roleKeys: ["super_admin", "admin", "manager", "cashier", "kitchen"] },
  });
  publishDashboardRefresh(`pos.${action}`, actorId);
}

async function syncRunningOrderKitchen(order: { _id: Types.ObjectId; ticketNumber: string; tableName: string; cart: PosCartState }, actorId: string) {
  await KitchenTicket.deleteMany({ orderId: order._id });

  const menuItemIds = order.cart.lines
    .filter((line) => line.source === "menu" && Types.ObjectId.isValid(line.itemId))
    .map((line) => new Types.ObjectId(line.itemId));
  const menuItems = menuItemIds.length
    ? await MenuItem.find({ _id: { $in: menuItemIds } }).select("variants").lean()
    : [];
  const menuItemMap = new Map(menuItems.map((item) => [String(item._id), item]));

  await createKitchenTicketsFromOrder({
    orderId: String(order._id),
    orderNumber: order.ticketNumber,
    source: "pos",
    actorId,
    fulfilmentType: order.cart.orderType === "dine_in" ? "dine_in" : "pickup",
    tableLabel: order.tableName,
    customerName: order.cart.customer.name,
    items: order.cart.lines.map((line) => ({
      orderItemId: line.itemId,
      menuItemId: line.itemId,
      categoryId: null,
      name: line.name,
      variantName:
        line.variantName?.trim() ||
        (() => {
          const menuItem = menuItemMap.get(line.itemId);
          const selectedVariant = menuItem?.variants?.find(
            (variant) => String(variant._id) === String(line.variantId ?? ""),
          );
          return selectedVariant?.name?.trim() ?? "";
        })() ||
        line.modifiers.find((modifier) =>
          /half\s*plate|full\s*plate|\bsmall\b|\bmedium\b|\blarge\b/i.test(modifier.optionName),
        )?.optionName ||
        "",
      quantity: line.quantity,
      notes: line.note,
      modifiers: line.modifiers.map((modifier) => ({
        name: modifier.groupName,
        value: `${modifier.optionName}${modifier.quantity > 1 ? ` ×${modifier.quantity}` : ""}`,
      })),
    })),
  });
}

export async function listTablesWithOccupancy() {
  const [tables, running] = await Promise.all([
    POSTable.find({ isActive: true }).sort({ section: 1, sortOrder: 1, name: 1 }).lean(),
    POSRunningOrder.find({ status: { $in: ["open", "sent_to_kitchen", "partially_paid"] } }).select("tableId guestCount cart openedAt").lean(),
  ]);
  const byTable = new Map(running.filter((entry) => entry.tableId).map((entry) => [String(entry.tableId), entry]));
  return tables.map((table) => {
    const order = byTable.get(String(table._id));
    const totals = order ? calculatePosCartTotals(order.cart) : null;
    return {
      id: String(table._id), name: table.name, section: table.section, capacity: table.capacity,
      status: order ? "occupied" : table.status,
      reservationName: table.reservationName,
      reservationTime: table.reservationTime?.toISOString() ?? null,
      runningOrderId: order ? String(order._id) : null,
      elapsedMinutes: order ? Math.max(0, Math.floor((Date.now() - order.openedAt.getTime()) / 60000)) : 0,
      guestCount: order?.guestCount ?? 0,
      total: totals?.grandTotal ?? 0,
    };
  });
}

export async function createTable(input: { name: string; code: string; section: string; capacity: number; sortOrder: number }, actorId: string) {
  const table = await POSTable.create({ ...input, code: input.code.toUpperCase(), createdBy: oid(actorId), updatedBy: oid(actorId) });
  await audit(actorId, "table.created", "table", table._id, "", null, table.toObject());
  return table;
}

export async function updateTable(id: string, input: Record<string, unknown>, actorId: string) {
  const before = await POSTable.findById(id).lean();
  if (!before) throw new AppError("Table not found.", 404);
  const patch: Record<string, unknown> & {
    updatedBy: Types.ObjectId;
    reservationTime?: Date | string | null;
  } = { ...input, updatedBy: oid(actorId) };
  if (typeof patch.reservationTime === "string") patch.reservationTime = new Date(patch.reservationTime);
  const table = await POSTable.findByIdAndUpdate(id, { $set: patch }, { returnDocument: "after", runValidators: true });
  if (!table) throw new AppError("Table not found.", 404);
  await audit(actorId, "table.updated", "table", table._id, "", before, table.toObject());
  return table;
}

export async function listRunningOrders() {
  const rows = await POSRunningOrder.find({ status: { $in: ["open", "sent_to_kitchen", "partially_paid"] } }).sort({ updatedAt: -1 }).lean();
  return rows.map((row) => ({
    id: String(row._id), ticketNumber: row.ticketNumber, tableId: row.tableId ? String(row.tableId) : null,
    tableName: row.tableName, guestCount: row.guestCount, status: row.status, cart: row.cart,
    totals: calculatePosCartTotals(row.cart), kitchenSentAt: row.kitchenSentAt?.toISOString() ?? null,
    kitchenRevision: row.kitchenRevision ?? 0,
    openedAt: row.openedAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function createRunningOrder(input: { shiftId: string; tableId: string | null; tableName: string; guestCount: number; cart: PosCartState }, actorId: string) {
  const shift = await POSShift.findOne({ _id: input.shiftId, status: "open", openedBy: oid(actorId) }).lean();
  if (!shift) throw new AppError("Open shift not found for this cashier.", 409);
  let tableName = input.tableName.trim();
  if (input.tableId) {
    const table = await POSTable.findOne({ _id: input.tableId, isActive: true }).lean();
    if (!table) throw new AppError("Selected table is unavailable.", 409);
    if (table.status === "out_of_service") throw new AppError("Selected table is out of service.", 409);
    const occupied = await POSRunningOrder.exists({ tableId: table._id, status: { $in: ["open", "sent_to_kitchen", "partially_paid"] } });
    if (occupied) throw new AppError("Selected table already has a running order.", 409);
    tableName = table.name;
  }
  const identity = await nextRunningOrderIdentity();
  const normalizedCart = normalizeRunningOrderCartVariants(input.cart);
  const kotRevision = createInitialKotRevision(normalizedCart, actorId);
  const order = await POSRunningOrder.create({
    ticketNumber: identity.ticketNumber, kitchenToken: identity.kitchenToken,
    shiftId: shift._id, registerId: shift.registerId, cashierId: oid(actorId),
    tableId: input.tableId ? oid(input.tableId) : null, tableName, guestCount: input.guestCount, cart: normalizedCart,
    status: "open", kitchenRevision: kotRevision.revision, lastKitchenCart: normalizedCart, kotRevisions: [kotRevision],
    createdBy: oid(actorId), updatedBy: oid(actorId),
  });
  try {
    await syncRunningOrderKitchen(order, actorId);
    order.status = "sent_to_kitchen";
    order.kitchenSentAt = kotRevision.createdAt;
    await order.save();
  } catch (error) {
    await POSRunningOrder.deleteOne({ _id: order._id });
    throw error;
  }
  await audit(actorId, "running_order.created", "running_order", order._id, "", null, { ticketNumber: order.ticketNumber, kitchenRevision: kotRevision.revision });
  emit("running_order_created", String(order._id), actorId, { ticketNumber: order.ticketNumber, tableName, kitchenRevision: kotRevision.revision });
  return { order, kotRevision };
}

export async function updateRunningOrder(id: string, input: { cart: PosCartState; guestCount?: number; sendToKitchen: boolean }, actorId: string) {
  const current = await POSRunningOrder.findById(id);
  if (!current || !isActive(current.status)) throw new AppError("Running order not found.", 404);

  const normalizedCart = normalizeRunningOrderCartVariants(input.cart);
  const previousKitchenCart = normalizeRunningOrderCartVariants(current.lastKitchenCart ?? current.cart);
  const before = { cart: current.cart, guestCount: current.guestCount, status: current.status, kitchenRevision: current.kitchenRevision };
  const kotRevision = input.sendToKitchen
    ? createChangedKotRevision(previousKitchenCart, normalizedCart, Number(current.kitchenRevision ?? 0) + 1, actorId)
    : null;

  current.cart = normalizedCart;
  if (input.guestCount !== undefined) current.guestCount = input.guestCount;

  if (input.sendToKitchen && kotRevision) {
    await syncRunningOrderKitchen(current, actorId);
    current.status = "sent_to_kitchen";
    current.kitchenSentAt = kotRevision.createdAt;
    current.kitchenRevision = kotRevision.revision;
    current.lastKitchenCart = normalizedCart;
    current.kotRevisions.push(kotRevision);
  } else if (input.sendToKitchen && !current.lastKitchenCart) {
    // Migrate legacy running orders so future edits can produce differential KOTs.
    current.lastKitchenCart = normalizedCart;
  }

  current.updatedBy = oid(actorId);
  await current.save();
  await audit(
    actorId,
    input.sendToKitchen && kotRevision ? "running_order.sent_to_kitchen" : "running_order.updated",
    "running_order",
    current._id,
    "",
    before,
    { status: current.status, kitchenRevision: current.kitchenRevision, kitchenChanged: Boolean(kotRevision) },
  );
  emit(
    input.sendToKitchen && kotRevision ? "running_order_sent" : "running_order_updated",
    id,
    actorId,
    { tableName: current.tableName, kitchenRevision: current.kitchenRevision, kitchenChanged: Boolean(kotRevision) },
  );
  return { order: current, kotRevision };
}

export async function transferRunningOrder(id: string, tableId: string | null, guestCount: number | undefined, actorId: string) {
  const order = await POSRunningOrder.findById(id);
  if (!order || !isActive(order.status)) throw new AppError("Running order not found.", 404);
  const before = { tableId: order.tableId, tableName: order.tableName, guestCount: order.guestCount };
  if (tableId) {
    const table = await POSTable.findOne({ _id: tableId, isActive: true }).lean();
    if (!table || table.status === "out_of_service") throw new AppError("Destination table is unavailable.", 409);
    const occupied = await POSRunningOrder.exists({ _id: { $ne: order._id }, tableId: table._id, status: { $in: ["open", "sent_to_kitchen", "partially_paid"] } });
    if (occupied) throw new AppError("Destination table is occupied.", 409);
    order.tableId = table._id;
    order.tableName = table.name;
  } else { order.tableId = null; order.tableName = ""; }
  if (guestCount) order.guestCount = guestCount;
  order.updatedBy = oid(actorId);
  await order.save();
  await audit(actorId, "running_order.transferred", "running_order", order._id, "", before, { tableId: order.tableId, tableName: order.tableName, guestCount: order.guestCount });
  emit("running_order_transferred", id, actorId, { tableName: order.tableName });
  return order;
}

function combineLines(target: PosCartLine[], source: PosCartLine[]) {
  const result = target.map((line) => ({ ...line }));
  for (const line of source) {
    const found = result.find((entry) => entry.lineId === line.lineId);
    if (found) found.quantity += line.quantity;
    else result.push({ ...line });
  }
  return result;
}

export async function mergeRunningOrders(targetId: string, sourceId: string, actorId: string) {
  if (targetId === sourceId) throw new AppError("An order cannot be merged into itself.", 422);
  const [target, source] = await Promise.all([POSRunningOrder.findById(targetId), POSRunningOrder.findById(sourceId)]);
  if (!target || !source || !isActive(target.status) || !isActive(source.status)) throw new AppError("One of the running orders is unavailable.", 409);
  target.cart = { ...target.cart, lines: combineLines(target.cart.lines, source.cart.lines), orderNote: [target.cart.orderNote, source.cart.orderNote].filter(Boolean).join(" | ") };
  target.guestCount += source.guestCount;
  target.updatedBy = oid(actorId);
  source.status = "voided";
  source.voidReason = `Merged into ${target.ticketNumber}`;
  source.updatedBy = oid(actorId);
  await Promise.all([target.save(), source.save()]);
  await audit(actorId, "running_order.merged", "running_order", target._id, `Merged ${source.ticketNumber}`, null, { sourceId: String(source._id) });
  emit("running_order_merged", targetId, actorId, { sourceId });
  return target;
}

export async function splitRunningOrder(id: string, lineQuantities: Record<string, number>, targetTableId: string | null, actorId: string) {
  const source = await POSRunningOrder.findById(id);
  if (!source || !isActive(source.status)) throw new AppError("Running order not found.", 404);
  const moved: PosCartLine[] = [];
  const remaining: PosCartLine[] = [];
  for (const line of source.cart.lines) {
    const requested = lineQuantities[line.lineId] ?? 0;
    if (requested > line.quantity) throw new AppError(`Cannot move more than the available quantity of ${line.name}.`, 422);
    if (requested > 0) moved.push({ ...line, quantity: requested });
    if (line.quantity - requested > 0) remaining.push({ ...line, quantity: line.quantity - requested });
  }
  if (!moved.length || !remaining.length) throw new AppError("A split must leave items on both orders.", 422);
  let tableName = "";
  if (targetTableId) {
    const table = await POSTable.findById(targetTableId).lean();
    if (!table || table.status === "out_of_service") throw new AppError("Target table is unavailable.", 409);
    const occupied = await POSRunningOrder.exists({ tableId: table._id, status: { $in: ["open", "sent_to_kitchen", "partially_paid"] } });
    if (occupied) throw new AppError("Target table is occupied.", 409);
    tableName = table.name;
  }
  source.cart = { ...source.cart, lines: remaining };
  source.updatedBy = oid(actorId);
  const splitIdentity = await nextRunningOrderIdentity();
  const split = await POSRunningOrder.create({
    ticketNumber: splitIdentity.ticketNumber, kitchenToken: splitIdentity.kitchenToken,
    shiftId: source.shiftId, registerId: source.registerId, cashierId: source.cashierId,
    tableId: targetTableId ? oid(targetTableId) : null, tableName, guestCount: 1,
    cart: { ...source.cart, lines: moved }, status: source.status, kitchenSentAt: source.kitchenSentAt,
    createdBy: oid(actorId), updatedBy: oid(actorId),
  });
  await source.save();
  await audit(actorId, "running_order.split", "running_order", source._id, "", null, { splitOrderId: String(split._id) });
  emit("running_order_split", id, actorId, { splitOrderId: String(split._id) });
  return { source, split };
}

export async function voidRunningItem(id: string, lineId: string, quantity: number, reason: string, actorId: string) {
  const order = await POSRunningOrder.findById(id);
  if (!order || !isActive(order.status)) throw new AppError("Running order not found.", 404);
  const line = order.cart.lines.find((entry) => entry.lineId === lineId);
  if (!line || quantity > line.quantity) throw new AppError("The selected item quantity is unavailable.", 422);
  const before = { lineId, quantity: line.quantity };
  const lines = order.cart.lines.flatMap((entry) => entry.lineId !== lineId ? [entry] : entry.quantity === quantity ? [] : [{ ...entry, quantity: entry.quantity - quantity }]);
  if (!lines.length) {
    order.status = "voided";
    order.voidReason = reason;
  }
  order.cart = { ...order.cart, lines };
  order.updatedBy = oid(actorId);
  await order.save();
  await audit(actorId, "running_order.item_voided", "running_order", order._id, reason, before, { remaining: line.quantity - quantity });
  emit("running_order_item_voided", id, actorId, { lineId, quantity });
  return order;
}

export async function cancelRunningOrder(id: string, reason: string, actorId: string) {
  const order = await POSRunningOrder.findById(id);
  if (!order || !isActive(order.status)) throw new AppError("Running order not found.", 404);
  if (order.status === "partially_paid") {
    throw new AppError("A partially paid order cannot be cancelled. Settle or refund the payment first.", 409);
  }

  const before = {
    status: order.status,
    cart: order.cart,
    tableId: order.tableId,
    tableName: order.tableName,
  };
  const cancelledAt = new Date();

  order.status = "voided";
  order.voidReason = reason;
  order.updatedBy = oid(actorId);
  await order.save();

  await KitchenTicket.updateMany(
    { orderId: order._id, status: { $ne: "cancelled" } },
    {
      $set: {
        status: "cancelled",
        cancelledAt,
        "items.$[].status": "cancelled",
        "items.$[].cancelledAt": cancelledAt,
      },
    },
  );

  await audit(
    actorId,
    "running_order.cancelled",
    "running_order",
    order._id,
    reason,
    before,
    { status: order.status, cancelledAt },
  );
  emit("running_order_cancelled", id, actorId, { ticketNumber: order.ticketNumber, reason });
  return order;
}

export async function settleRunningOrder(
  id: string,
  payment: {
    paymentMethod: "cash" | "upi" | "split";
    paymentBreakdown: Array<{ method: "cash" | "upi"; amount: number; reference: string }>;
    amountTendered: number;
    upiReference: string;
    tipAmount: number;
    tipMethod: "none" | "cash" | "upi";
    tipCollection: "none" | "waiter_direct" | "restaurant";
    orderTakerName: string;
  },
  actorId: string,
) {
  const running = await POSRunningOrder.findById(id);
  if (!running || !isActive(running.status)) throw new AppError("Running order not found.", 404);
  const settlementCart = normalizeRunningOrderCartVariants(running.cart);
  const result = await createPosOrder({
    shiftId: String(running.shiftId), orderMode: settlementCart.orderType, tableNumber: running.tableName,
    internalConsumption: settlementCart.internalConsumption,
    customerId: settlementCart.customer.id || null, customerName: settlementCart.customer.name, customerPhone: settlementCart.customer.phone,
    customerEmail: settlementCart.customer.email, customerNote: settlementCart.orderNote,
    paymentMethod: payment.paymentMethod,
    paymentBreakdown: payment.paymentMethod === "split"
      ? payment.paymentBreakdown
      : [
          {
            method: payment.paymentMethod,
            amount:
              payment.paymentMethod === "cash"
                ? payment.amountTendered
                : calculatePosCartTotals(settlementCart).grandTotal +
                  (payment.tipCollection === "restaurant" ? payment.tipAmount : 0),
            reference: payment.paymentMethod === "upi" ? payment.upiReference : "",
          },
        ],
    waivedAmount: 0,
    waivedReason: "",
    tipAmount: payment.tipAmount,
    tipMethod: payment.tipMethod,
    tipCollection: payment.tipCollection,
    orderTakerName: payment.orderTakerName.trim(),
    upiReference: payment.upiReference,
    amountTendered: payment.amountTendered,
    adjustments: settlementCart.adjustments,
    items: settlementCart.lines.map((line) => ({ sourceType: line.source, itemId: line.itemId, variantId: line.variantId, quantity: line.quantity, unitPrice: line.basePrice, specialInstructions: line.note, modifiers: line.modifiers.map((modifier) => ({ groupId: modifier.groupId, groupName: modifier.groupName, optionId: modifier.optionId, optionName: modifier.optionName, quantity: modifier.quantity })) })),
  }, actorId);
  await KitchenTicket.deleteMany({ orderId: running._id });
  running.status = "settled";
  running.settledOrderId = result.order._id;
  running.settledAt = new Date();
  running.updatedBy = oid(actorId);
  await running.save();
  await audit(actorId, "running_order.settled", "running_order", running._id, "", null, { orderId: String(result.order._id) });
  emit("running_order_settled", id, actorId, { orderId: String(result.order._id) });
  return result;
}

export async function refundOrder(orderId: string, input: { idempotencyKey?: string; amount: number; method: "cash" | "upi"; reason: string; restockInventory: boolean; lines: Array<{ orderItemId: string; quantity: number; amount: number }> }, actorId: string) {
  const order = await Order.findById(orderId);
  if (!order || order.orderSource !== "pos" || order.paymentStatus !== "paid") throw new AppError("A paid POS order is required for a refund.", 409);
  if (input.idempotencyKey) {
    const replay = await POSRefund.findOne({ orderId: order._id, idempotencyKey: input.idempotencyKey });
    if (replay) return replay;
  }
  const existing = await POSRefund.aggregate<{ total: number }>([{ $match: { orderId: order._id, status: "approved" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
  const alreadyRefunded = existing[0]?.total ?? 0;
  if (input.amount > order.grandTotal - alreadyRefunded) throw new AppError("Refund amount exceeds the remaining refundable balance.", 422);
  for (const line of input.lines) {
    const item = order.items.id(line.orderItemId);
    if (!item || line.quantity > item.quantity) throw new AppError("A refund line exceeds the sold quantity.", 422);
  }
  const refund = await POSRefund.create({ orderId: order._id, idempotencyKey: input.idempotencyKey ?? "", amount: input.amount, method: input.method, reason: input.reason, restockInventory: input.restockInventory, lines: input.lines.map((line) => { const item = order.items.id(line.orderItemId); return { ...line, name: item?.name ?? "Item" }; }), approvedBy: oid(actorId), createdBy: oid(actorId) });
  if (input.method === "cash" && order.posShiftId) {
    await POSCashMovement.create({ shiftId: order.posShiftId, type: "cash_out", amount: input.amount, reason: `Refund ${order.orderNumber}: ${input.reason}`, referenceType: "refund", referenceId: refund._id, createdBy: oid(actorId) });
    await POSShift.updateOne({ _id: order.posShiftId, status: "open" }, { $inc: { expectedCash: -input.amount } });
  }
  const fullyRefunded = alreadyRefunded + input.amount >= order.grandTotal;
  if (fullyRefunded) order.paymentStatus = "refunded";
  order.updatedBy = oid(actorId);
  await order.save();
  await audit(actorId, "order.refunded", "order", order._id, input.reason, null, { refundId: String(refund._id), amount: input.amount, fullyRefunded });
  emit("order_refunded", orderId, actorId, { amount: input.amount, fullyRefunded });
  publishRealtimeEventSafely({ event: "pos.refund_created", entityId: String(refund._id), actorId, data: { orderId, amount: input.amount, fullyRefunded }, target: { roleKeys: ["super_admin", "admin", "manager", "cashier"] } });
  return refund;
}

export async function getShiftReport(shiftId: string) {
  const shift = await POSShift.findById(shiftId).populate("registerId", "name code").populate("openedBy", "name email").lean();
  if (!shift) throw new AppError("Shift not found.", 404);
  const [orders, movements, refunds] = await Promise.all([
    Order.find({ posShiftId: shift._id }).select("grandTotal paymentMethod paymentStatus taxTotal discountTotal itemCount createdAt").lean(),
    POSCashMovement.find({ shiftId: shift._id }).populate("createdBy", "name email").sort({ createdAt: 1 }).lean(),
    POSRefund.find({ orderId: { $in: await Order.find({ posShiftId: shift._id }).distinct("_id") } }).lean(),
  ]);
  const paid = orders.filter((order) => order.paymentStatus === "paid" || order.paymentStatus === "refunded");
  const byMethod = paid.reduce((acc, order) => { acc[order.paymentMethod] = (acc[order.paymentMethod] ?? 0) + order.grandTotal; return acc; }, {} as Record<string, number>);
  return {
    shift, orderCount: orders.length, paidOrderCount: paid.length,
    grossSales: paid.reduce((sum, order) => sum + order.grandTotal, 0),
    taxTotal: paid.reduce((sum, order) => sum + order.taxTotal, 0),
    discountTotal: paid.reduce((sum, order) => sum + order.discountTotal, 0),
    itemCount: paid.reduce((sum, order) => sum + order.itemCount, 0),
    refundsTotal: refunds.reduce((sum, refund) => sum + refund.amount, 0), byMethod, movements,
    expectedCash: shift.expectedCash, countedCash: shift.countedCash, cashDifference: shift.cashDifference,
  };
}

export async function cancelPaidPosOrder(
  orderId: string,
  input: { method: "cash" | "upi"; reason: string },
  actorId: string,
) {
  const order = await Order.findById(orderId);
  if (!order || order.orderSource !== "pos") throw new AppError("POS order not found.", 404);
  if (order.status === "cancelled" || order.paymentStatus === "refunded") {
    throw new AppError("This order has already been cancelled or fully refunded.", 409);
  }
  if (order.paymentStatus !== "paid") throw new AppError("Only a paid POS order can be cancelled from bill history.", 409);

  const refund = await refundOrder(
    orderId,
    {
      idempotencyKey: `cancel-${orderId}`,
      amount: Number(order.grandTotal),
      method: input.method,
      reason: input.reason,
      restockInventory: true,
      lines: order.items.map((item) => ({
        orderItemId: String(item._id),
        quantity: Number(item.quantity),
        amount: Number(item.lineTotal),
      })),
    },
    actorId,
  );

  const cancelledAt = new Date();
  order.status = "cancelled";
  order.cancelledAt = cancelledAt;
  order.cancellationReason = input.reason;
  order.statusHistory.push({
    status: "cancelled",
    note: `Paid POS order cancelled and fully refunded: ${input.reason}`,
    changedBy: oid(actorId),
    changedAt: cancelledAt,
  });
  order.updatedBy = oid(actorId);
  await order.save();

  await audit(
    actorId,
    "order.cancelled_after_payment",
    "order",
    order._id,
    input.reason,
    null,
    { refundId: String(refund._id), amount: order.grandTotal, method: input.method },
  );
  emit("cancelled_after_payment", orderId, actorId, { orderNumber: order.orderNumber, refundId: String(refund._id) });
  return { orderId: String(order._id), orderNumber: order.orderNumber, refundId: String(refund._id) };
}
