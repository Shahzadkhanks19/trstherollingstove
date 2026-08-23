import { Types } from "mongoose";

import { DEFAULT_SETTINGS } from "@/config/defaultSettings";
import { AppError } from "@/lib/errors/AppError";
import { Invoice } from "@/models/Invoice";
import { Order } from "@/models/Order";
import { OrderCounter } from "@/models/OrderCounter";
import { SystemSetting } from "@/models/SystemSetting";
import { createInvoicePublicId } from "@/lib/invoices/verification";

const INDIA_TIME_ZONE = "Asia/Kolkata";

function getIndiaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: INDIA_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "2-digit",
  }).formatToParts(date);

  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  const day = value.day ?? "01";
  const month = (value.month ?? "JAN").toUpperCase();
  const year = value.year ?? "00";

  return {
    displayDate: `${day}${month}${year}`,
    counterKey: `invoice:${year}${month}${day}`,
  };
}

async function nextInvoiceNumber() {
  const { displayDate, counterKey } = getIndiaDateParts();
  const counter = await OrderCounter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { sequence: 1 } },
    { upsert: true, returnDocument: "after" },
  );

  if (!counter) {
    throw new AppError("Unable to generate invoice number.", 500);
  }

  return `TRS-INV-${displayDate}-${String(counter.sequence).padStart(3, "0")}`;
}

function buildBusinessAddress(
  data: Record<string, unknown>,
) {
  return [
    data.addressLine1,
    data.addressLine2,
    data.city,
    data.state,
    data.postalCode,
    data.country,
  ]
    .filter(
      (value): value is string =>
        typeof value === "string" &&
        value.trim().length > 0,
    )
    .join(", ");
}

export async function getOrCreateInvoice(
  orderId: string,
  actorId: string,
) {
  const existing = await Invoice.findOne({
    orderId,
  });

  if (existing) {
    if (!existing.verificationPublicId) {
      existing.verificationPublicId =
        createInvoicePublicId();
      await existing.save();
    }

    return existing;
  }

  const order = await Order.findById(orderId).lean();

  if (!order) {
    throw new AppError("Order not found.", 404);
  }

  const customerSnapshot =
    order.customerSnapshot;

  if (!customerSnapshot) {
    throw new AppError(
      "This order does not contain a customer snapshot and cannot be invoiced.",
      422,
    );
  }

  const businessSetting =
    await SystemSetting.findOne(
      {
        section: "business",
      },
      {
        data: 1,
      },
    ).lean();

  const businessData = {
    ...DEFAULT_SETTINGS.business.data,
    ...((businessSetting?.data as
      | Record<string, unknown>
      | undefined) ?? {}),
  };

  try {
    return await Invoice.create({
      verificationPublicId: createInvoicePublicId(),
      verificationEnabled: true,
      verificationVersion: 1,
      invoiceNumber: await nextInvoiceNumber(),
      orderId: order._id,
      orderNumber: order.orderNumber,
      issuedAt: new Date(),
      businessSnapshot: {
        legalName: String(
          businessData.legalName ?? "",
        ),
        tradeName: String(
          businessData.tradeName ?? "",
        ),
        phone: String(
          businessData.phone ?? "",
        ),
        email: String(
          businessData.email ?? "",
        ),
        gstin: String(
          businessData.gstin ?? "",
        ),
        address:
          buildBusinessAddress(businessData),
      },
      customerSnapshot: {
        name: customerSnapshot.name,
        phone:
          customerSnapshot.phone ?? "",
        email:
          customerSnapshot.email ?? "",
      },
      orderMode: order.orderMode,
      tableNumber: order.tableNumber ?? "",
      saleType: order.saleType ?? "customer",
      internalConsumption: order.saleType !== "customer" ? {
        personName: order.internalConsumption?.personName ?? "",
        reason: order.internalConsumption?.reason ?? "",
        notes: order.internalConsumption?.notes ?? "",
        menuValue: order.internalConsumption?.menuValue ?? order.subtotal,
        approvalStatus: order.internalConsumption?.approvalStatus ?? "not_required",
        approvalReason: order.internalConsumption?.approvalReason ?? "",
      } : undefined,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      paymentBreakdown: (order.paymentBreakdown ?? []).map((part) => ({
        method: part.method,
        amount: part.amount,
      })),
      upiReference: order.upiReference ?? "",
      // Customer invoice excludes waiter tips and internal tip liabilities.
      // A paid POS invoice therefore shows the food bill as settled with zero balance.
      amountTendered: order.amountTendered ?? order.grandTotal,
      changeDue: order.changeDue ?? 0,
      items: order.items.map((item) => ({
        name: item.name,
        variantName: item.variantName ?? "",
        specialInstructions: item.specialInstructions ?? "",
        modifiers: item.modifiers.map(
          (modifier) => ({
            groupName: modifier.groupName,
            optionName: modifier.optionName,
            unitPrice: modifier.unitPrice,
          }),
        ),
        quantity: item.quantity,
        unitPrice: item.lineUnitPrice,
        lineTotal: item.lineTotal,
      })),
      subtotal: order.subtotal,
      taxTotal: order.taxTotal,
      discountTotal: order.discountTotal,
      packingCharge: order.packingCharge ?? 0,
      serviceCharge: order.serviceCharge ?? 0,
      additionalCharge: order.additionalCharge ?? 0,
      additionalChargeLabel: order.additionalChargeLabel ?? "Additional charge",
      taxRate: order.taxRate ?? 0,
      taxMode: order.taxMode ?? "exclusive",
      discountReason: order.discountReason ?? "",
      grandTotal: order.grandTotal,
      currency: String(
        businessData.currency ?? "INR",
      ),
      currencySymbol: String(
        businessData.currencySymbol ?? "₹",
      ),
      generatedBy: new Types.ObjectId(actorId),
    });
  } catch (error) {
    const duplicateInvoice =
      await Invoice.findOne({ orderId });

    if (duplicateInvoice) {
      return duplicateInvoice;
    }

    throw error;
  }
}

export async function assertCustomerOwnsOrder(
  orderId: string,
  customerId: string,
) {
  const exists = await Order.exists({
    _id: orderId,
    customerId,
  });

  if (!exists) {
    throw new AppError("Order not found.", 404);
  }
}