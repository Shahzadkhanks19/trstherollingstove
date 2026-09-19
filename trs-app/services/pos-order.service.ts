import { Types } from "mongoose";

import { AppError } from "@/lib/errors/AppError";
import { nextOrderNumber } from "@/lib/orders/order-number";
import { InternalConsumptionAudit } from "@/models/InternalConsumptionAudit";
import { Invoice } from "@/models/Invoice";
import { Order } from "@/models/Order";
import { POSCashMovement } from "@/models/POSCashMovement";
import { POSShift } from "@/models/POSShift";
import { User } from "@/models/User";
import { getOrCreateInvoice } from "@/services/invoice.service";
import {
  publishDashboardRefresh,
  publishOrderCreated,
} from "@/services/realtimeEvents.service";
import { publishRealtimeEventSafely } from "@/services/realtimePublisher.service";
import type { CreatePosOrderInput } from "@/services/pos-order.types";
import { money } from "@/services/pos-order.utils";
import { resolvePosOrderPayment } from "@/services/pos-order-payment.service";
import { assertPosInventoryAvailable, deductPosInventory } from "@/services/pos-order-inventory.service";
import { createPosKitchenOutput } from "@/services/pos-order-kitchen.service";
import { validatePosInternalConsumption } from "@/services/pos-order-internal-consumption.service";
import { resolvePosOrderLines } from "@/services/pos-order-lines.service";

export async function createPosOrder(
  input: CreatePosOrderInput,
  actorId: string,
) {
  const shift = await POSShift.findOne({
    _id: input.shiftId,
    status: "open",
    openedBy: new Types.ObjectId(actorId),
  }).lean();
  if (!shift)
    throw new AppError("Open POS shift not found for this cashier.", 409);

  const {
    isInternalOrder,
    approvalStatus,
    approvalReason,
    approvedBy,
    approvedAt,
    dailyUsageBefore,
    monthlyUsageBefore,
    dailyLimit,
    monthlyLimit,
  } = await validatePosInternalConsumption(input.internalConsumption);

  const customer =
    !isInternalOrder && input.customerId
      ? await User.findOne({ _id: input.customerId, deletedAt: null })
          .select("name phone email")
          .lean()
      : null;
  if (input.customerId && !customer)
    throw new AppError("Selected customer is no longer available.", 409);

  const orderLines = await resolvePosOrderLines(input);

  const subtotal = money(
    orderLines.reduce((sum, item) => sum + item.lineTotal, 0),
  );
  const {
    adjustments,
    discountTotal,
    taxTotal,
    grandTotal,
    waivedAmount,
    tipAmount,
    paymentBreakdown,
    cashPaid,
    amountTendered,
    changeDue,
  } = resolvePosOrderPayment(input, subtotal, isInternalOrder);

  await assertPosInventoryAvailable(orderLines);

  const now = new Date();
  const orderNumber = await nextOrderNumber();
  const order = await Order.create({
    orderNumber,
    customerId: customer?._id ?? null,
    saleType: input.internalConsumption.saleType,
    isRevenueOrder: !isInternalOrder,
    internalConsumption: {
      referenceId: input.internalConsumption.referenceId
        ? new Types.ObjectId(input.internalConsumption.referenceId)
        : null,
      personName: input.internalConsumption.personName.trim(),
      reason: input.internalConsumption.reason.trim(),
      notes: input.internalConsumption.notes.trim(),
      menuValue: subtotal,
      approvalStatus,
      approvalReason,
      approvedBy:
        approvedBy ?? (isInternalOrder ? new Types.ObjectId(actorId) : null),
      approvedAt: approvedAt ?? (isInternalOrder ? now : null),
      dailyUsageBefore,
      monthlyUsageBefore,
      dailyLimit,
      monthlyLimit,
    },
    orderSource: "pos",
    posShiftId: shift._id,
    posRegisterId: shift.registerId,
    cashierId: new Types.ObjectId(actorId),
    upiReference:
      !isInternalOrder && input.paymentMethod === "upi"
        ? input.upiReference
        : "",
    paymentBreakdown,
    waivedAmount,
    waivedReason: waivedAmount > 0 ? input.waivedReason.trim() : "",
    tipAmount,
    tipMethod: tipAmount > 0 ? input.tipMethod : "none",
    tipCollection: tipAmount > 0 ? input.tipCollection : "none",
    orderTakerName: input.orderTakerName.trim(),
    paymentConfirmedBy: new Types.ObjectId(actorId),
    paymentConfirmedAt: now,
    amountTendered,
    changeDue,
    customerSnapshot: {
      name: isInternalOrder
        ? input.internalConsumption.personName.trim()
        : (customer?.name ?? (input.customerName || "Walk-in Customer")),
      phone: customer?.phone ?? input.customerPhone,
      email: customer?.email ?? input.customerEmail,
    },
    items: orderLines.map((item) => ({
      sourceType: item.sourceType,
      menuItemId: item.menuItemId,
      posItemId: item.posItemId,
      name: item.name,
      imageUrl: item.imageUrl,
      variantId: item.variantId,
      variantName: item.variantName,
      baseUnitPrice: item.baseUnitPrice,
      modifiers: item.modifiers.flatMap((modifier) =>
        Array.from({ length: modifier.quantity }, () => ({
          groupId: modifier.groupId,
          groupName: modifier.groupName,
          optionId: modifier.optionId,
          optionName: modifier.optionName,
          unitPrice: modifier.unitPrice,
        })),
      ),
      quantity: item.quantity,
      specialInstructions: item.specialInstructions,
      lineUnitPrice: item.lineUnitPrice,
      lineTotal: item.lineTotal,
    })),
    orderMode: input.orderMode,
    tableNumber: input.orderMode === "dine_in" ? input.tableNumber : "",
    customerNote: input.customerNote,
    status: "preparing",
    statusHistory: [
      {
        status: "placed",
        note: isInternalOrder
          ? "Internal consumption order created from POS."
          : "Order created and paid from POS.",
        changedBy: new Types.ObjectId(actorId),
        changedAt: now,
      },
      {
        status: "accepted",
        note: "POS orders are accepted automatically.",
        changedBy: new Types.ObjectId(actorId),
        changedAt: now,
      },
      {
        status: "preparing",
        note: "POS order sent directly to kitchen preparation.",
        changedBy: new Types.ObjectId(actorId),
        changedAt: now,
      },
    ],
    acceptedAt: now,
    preparingAt: now,
    paymentStatus: "paid",
    paymentMethod: isInternalOrder ? "cash" : input.paymentMethod,
    subtotal,
    taxTotal: isInternalOrder ? 0 : taxTotal,
    discountTotal: isInternalOrder ? subtotal : discountTotal,
    packingCharge: adjustments.packingCharge,
    serviceCharge: adjustments.serviceCharge,
    additionalCharge: adjustments.additionalCharge,
    additionalChargeLabel: adjustments.additionalChargeLabel,
    taxRate: adjustments.taxRate,
    taxMode: adjustments.taxMode,
    discountType: isInternalOrder ? "fixed" : adjustments.discountType,
    discountValue: isInternalOrder ? subtotal : adjustments.discountValue,
    discountReason: isInternalOrder
      ? `Internal consumption: ${input.internalConsumption.reason.trim()}`
      : adjustments.discountReason,
    grandTotal,
    loyaltyEligibleAmount: 0,
    itemCount: orderLines.reduce((sum, item) => sum + item.quantity, 0),
    createdBy: new Types.ObjectId(actorId),
    updatedBy: new Types.ObjectId(actorId),
  });

  if (isInternalOrder) {
    await InternalConsumptionAudit.create({
      orderId: order._id,
      action: approvalStatus === "approved" ? "approved" : "created",
      saleType: input.internalConsumption.saleType,
      subjectId: input.internalConsumption.referenceId
        ? new Types.ObjectId(input.internalConsumption.referenceId)
        : null,
      subjectName: input.internalConsumption.personName.trim(),
      actorId: new Types.ObjectId(actorId),
      approvedBy,
      reason: approvalReason || input.internalConsumption.reason.trim(),
      metadata: {
        dailyUsageBefore,
        monthlyUsageBefore,
        dailyLimit,
        monthlyLimit,
        menuValue: subtotal,
      },
    });
  }

  try {
    if (!isInternalOrder && cashPaid > 0) {
      await POSCashMovement.create({
        shiftId: shift._id,
        type: "cash_sale",
        amount: cashPaid,
        reason: `Cash sale ${orderNumber}`,
        referenceType: "order",
        referenceId: order._id,
        createdBy: new Types.ObjectId(actorId),
      });
      await POSShift.updateOne(
        { _id: shift._id },
        { $inc: { expectedCash: cashPaid } },
      );
    }

    await deductPosInventory(orderLines, order._id, actorId);
    await createPosKitchenOutput(order, orderLines, actorId);
    const invoice = await getOrCreateInvoice(String(order._id), actorId);

    publishOrderCreated({
      orderId: String(order._id),
      orderNumber,
      customerId: order.customerId?.toString(),
      status: order.status,
      paymentStatus: order.paymentStatus,
      grandTotal,
      orderMode: order.orderMode,
      actorId,
    });
    publishRealtimeEventSafely({
      event: "pos.order_created",
      entityId: String(order._id),
      actorId,
      data: {
        orderId: String(order._id),
        orderNumber,
        grandTotal,
        paymentMethod: isInternalOrder ? "not_required" : input.paymentMethod,
        saleType: input.internalConsumption.saleType,
      },
      target: {
        roleKeys: ["super_admin", "admin", "manager", "cashier", "kitchen"],
      },
    });
    publishDashboardRefresh("pos.order_created", actorId);

    return { order, invoice };
  } catch (error) {
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancellationReason: "POS finalization failed after order creation.",
        },
      },
    );
    throw error;
  }
}

export async function markInvoicePrinted(invoiceId: string, actorId: string) {
  let invoice = await Invoice.findByIdAndUpdate(
    invoiceId,
    {
      $inc: { printCount: 1 },
      $set: {
        lastPrintedAt: new Date(),
        lastPrintedBy: new Types.ObjectId(actorId),
      },
    },
    { returnDocument: "after" },
  );

  if (!invoice) {
    throw new AppError("Bill not found.", 404);
  }

  if (
    invoice.paymentMethod === "split" &&
    (!invoice.paymentBreakdown || invoice.paymentBreakdown.length === 0)
  ) {
    const order = await Order.findById(invoice.orderId)
      .select({ paymentBreakdown: 1 })
      .lean();

    const paymentBreakdown = (order?.paymentBreakdown ?? [])
      .filter((part) => Number(part.amount) > 0)
      .map((part) => ({
        method: part.method,
        amount: part.amount,
      }));

    if (paymentBreakdown.length > 0) {
      invoice =
        (await Invoice.findByIdAndUpdate(
          invoiceId,
          { $set: { paymentBreakdown } },
          { returnDocument: "after" },
        )) ?? invoice;
    }
  }

  return invoice;
}
