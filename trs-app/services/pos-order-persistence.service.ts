import { Types } from "mongoose";

import { InternalConsumptionAudit } from "@/models/InternalConsumptionAudit";
import { Order } from "@/models/Order";
import type {
  InternalConsumptionApproval,
} from "@/services/pos-order-internal-consumption.service";
import type {
  CreatePosOrderInput,
  ResolvedPosLine,
} from "@/services/pos-order.types";
import type { AdjustmentsInput } from "@/services/pos-order.types";

type PosOrderCustomer = {
  _id: Types.ObjectId;
  name?: string;
  phone?: string;
  email?: string;
} | null;

type CreatePersistedPosOrderInput = {
  input: CreatePosOrderInput;
  actorId: string;
  shift: {
    _id: Types.ObjectId;
    registerId?: Types.ObjectId | null;
  };
  customer: PosOrderCustomer;
  orderLines: ResolvedPosLine[];
  subtotal: number;
  adjustments: AdjustmentsInput;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  waivedAmount: number;
  tipAmount: number;
  paymentBreakdown: Array<{
    method: "cash" | "upi";
    amount: number;
    reference: string;
  }>;
  amountTendered: number;
  changeDue: number;
  internalApproval: InternalConsumptionApproval;
  orderNumber: string;
};

export async function createPersistedPosOrder({
  input,
  actorId,
  shift,
  customer,
  orderLines,
  subtotal,
  adjustments,
  discountTotal,
  taxTotal,
  grandTotal,
  waivedAmount,
  tipAmount,
  paymentBreakdown,
  amountTendered,
  changeDue,
  internalApproval,
  orderNumber,
}: CreatePersistedPosOrderInput) {
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
  } = internalApproval;
  const now = new Date();

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

  return order;
}
