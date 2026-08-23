import { Types } from "mongoose";

import { AppError } from "@/lib/errors/AppError";
import { GoodsReceipt } from "@/models/GoodsReceipt";
import { InventoryItem } from "@/models/InventoryItem";
import { PurchaseOrder } from "@/models/PurchaseOrder";
import { PickupPerson } from "@/models/PickupPerson";
import { Supplier } from "@/models/Supplier";
import { SupplierPayment } from "@/models/SupplierPayment";
import { recordInventoryMovement } from "@/services/inventory.service";
import { sendWhatsAppMessage } from "@/services/notification.service";

function createDocumentNumber(prefix: string) {
  const date = new Date();
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
    String(date.getMilliseconds()).padStart(3, "0"),
  ].join("");

  const random = Math.floor(
    1000 + Math.random() * 9000,
  );

  return `${prefix}-${stamp}-${random}`;
}

type CreatePurchaseOrderInput = {
  supplierId: string;
  expectedDeliveryDate?: Date | null;
  fulfilmentType: "vendor_delivery" | "self_pickup";
  pickupPersonId?: string | null;
  items: Array<{ inventoryItemId: string; orderedQuantity: number }>;
  notes: string;
  actorId: string;
};

function formatPurchaseRequestMessage(order: {
  purchaseOrderNumber: string; supplierName: string; expectedDeliveryDate: Date | null;
  fulfilmentType: "vendor_delivery" | "self_pickup"; pickupPersonName: string;
  items: Array<{ itemName: string; orderedQuantity: number; unit: string }>; notes: string;
}) {
  const expected = order.expectedDeliveryDate
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(order.expectedDeliveryDate)
    : "Not specified";
  return [
    `*TRS Purchase Request ${order.purchaseOrderNumber}*`,
    `Vendor: ${order.supplierName}`,
    `Fulfilment: ${order.fulfilmentType === "self_pickup" ? "Self Pickup" : "Vendor Delivery"}`,
    ...(order.pickupPersonName ? [`Pickup person: ${order.pickupPersonName}`] : []),
    `Expected date: ${expected}`,
    "",
    "*Items:*",
    ...order.items.map((item, index) => `${index + 1}. ${item.itemName} — ${item.orderedQuantity} ${item.unit}`),
    ...(order.notes ? ["", `Notes: ${order.notes}`] : []),
  ].join("\n");
}

export async function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  const supplier = await Supplier.findOne({ _id: input.supplierId, isActive: true }).lean();
  if (!supplier) throw new AppError("Active supplier not found.", 404);
  if (!supplier.phone) throw new AppError("Vendor WhatsApp number is required.", 409);

  const pickupPerson = input.fulfilmentType === "self_pickup"
    ? await PickupPerson.findOne({ _id: input.pickupPersonId, isActive: true }).lean()
    : null;
  if (input.fulfilmentType === "self_pickup" && !pickupPerson) {
    throw new AppError("Active pickup person not found.", 404);
  }

  const inventoryIds = input.items.map((item) => new Types.ObjectId(item.inventoryItemId));
  const inventoryItems = await InventoryItem.find({ _id: { $in: inventoryIds }, isActive: true }).lean();
  const inventoryMap = new Map(inventoryItems.map((item) => [String(item._id), item]));
  if (inventoryItems.length !== new Set(input.items.map((item) => item.inventoryItemId)).size) {
    throw new AppError("One or more inventory items are missing or inactive.", 409);
  }

  const items = input.items.map((item) => {
    const inventoryItem = inventoryMap.get(item.inventoryItemId);
    if (!inventoryItem) throw new AppError("Inventory item not found.", 404);
    return {
      inventoryItemId: inventoryItem._id, itemName: inventoryItem.name, sku: inventoryItem.sku,
      unit: inventoryItem.unit, orderedQuantity: item.orderedQuantity, receivedQuantity: 0,
      unitCost: 0, taxRate: 0, lineSubtotal: 0, lineTax: 0, lineTotal: 0,
    };
  });

  const adminWhatsapp = (process.env.ADMIN_WHATSAPP_NUMBER || process.env.SUPER_ADMIN_PHONE || "").trim();
  const recipients = [
    { recipientType: "vendor" as const, destination: supplier.phone },
    { recipientType: "admin" as const, destination: adminWhatsapp },
    ...(pickupPerson ? [{ recipientType: "pickup_person" as const, destination: pickupPerson.whatsappNumber }] : []),
  ];

  const purchaseOrder = await PurchaseOrder.create({
    purchaseOrderNumber: createDocumentNumber("PR"), supplierId: new Types.ObjectId(input.supplierId),
    expectedDeliveryDate: input.expectedDeliveryDate ?? null, fulfilmentType: input.fulfilmentType,
    pickupPersonId: pickupPerson?._id ?? null, pickupPersonName: pickupPerson?.name ?? "",
    pickupPersonWhatsapp: pickupPerson?.whatsappNumber ?? "", items, subtotal: 0, taxTotal: 0,
    discountTotal: 0, shippingTotal: 0, grandTotal: 0, paidAmount: 0, balanceAmount: 0, notes: input.notes,
    whatsappDeliveries: recipients.map((recipient) => ({ ...recipient, status: recipient.destination ? "queued" : "skipped", failureReason: recipient.destination ? "" : "WhatsApp number is not configured." })),
    createdBy: new Types.ObjectId(input.actorId), updatedBy: new Types.ObjectId(input.actorId),
  });

  const message = formatPurchaseRequestMessage({
    purchaseOrderNumber: purchaseOrder.purchaseOrderNumber, supplierName: supplier.name,
    expectedDeliveryDate: purchaseOrder.expectedDeliveryDate
      ? new Date(purchaseOrder.expectedDeliveryDate)
      : null,
    fulfilmentType: input.fulfilmentType,
    pickupPersonName: pickupPerson?.name ?? "", items, notes: input.notes,
  });

  for (const delivery of purchaseOrder.whatsappDeliveries) {
    if (!delivery.destination) continue;
    delivery.attemptedAt = new Date();
    try {
      const result = await sendWhatsAppMessage({ to: delivery.destination, message });
      delivery.provider = result.provider; delivery.providerMessageId = result.messageId;
      delivery.status = result.skipped ? "skipped" : "sent";
      delivery.failureReason = result.skipped ? "WhatsApp provider environment variables are not configured." : "";
    } catch (error) {
      delivery.status = "failed";
      delivery.failureReason = error instanceof Error ? error.message : "Unknown WhatsApp delivery error.";
    }
  }
  await purchaseOrder.save();
  return purchaseOrder;
}

type ReceivePurchaseOrderInput = {
  purchaseOrderId: string;
  invoiceNumber: string;
  invoiceDate: Date | null;
  items: Array<{
    purchaseOrderItemId: string;
    receivedQuantity: number;
    acceptedQuantity: number;
    rejectedQuantity: number;
    batchNumber: string;
    expiryDate: Date | null;
    rejectionReason: string;
  }>;
  notes: string;
  actorId: string;
};

export async function receivePurchaseOrder(
  input: ReceivePurchaseOrderInput,
) {
  const session = await PurchaseOrder.startSession();
  let createdReceipt;

  try {
    await session.withTransaction(async () => {
      const purchaseOrder = await PurchaseOrder.findById(
        input.purchaseOrderId,
      ).session(session);

      if (!purchaseOrder) {
        throw new AppError(
          "Purchase order not found.",
          404,
        );
      }

      if (
        !["approved", "partially_received"].includes(
          purchaseOrder.status,
        )
      ) {
        throw new AppError(
          "Only approved purchase orders can be received.",
          409,
        );
      }

      const inventoryItemIds = input.items.map((receiptItem) => {
        const purchaseItem = purchaseOrder.items.id(
          receiptItem.purchaseOrderItemId,
        );

        if (!purchaseItem) {
          throw new AppError(
            "Purchase order item not found.",
            404,
          );
        }

        return purchaseItem.inventoryItemId;
      });

      const inventoryItems = await InventoryItem.find({
        _id: { $in: inventoryItemIds },
      })
        .session(session)
        .select("name expiryTrackingEnabled isActive")
        .lean();
      const inventoryMap = new Map(
        inventoryItems.map((item) => [String(item._id), item]),
      );

      let acceptedValue = 0;

      for (const receiptItem of input.items) {
        const purchaseItem = purchaseOrder.items.id(
          receiptItem.purchaseOrderItemId,
        );

        if (!purchaseItem) {
          throw new AppError(
            "Purchase order item not found.",
            404,
          );
        }

        const inventoryItem = inventoryMap.get(
          String(purchaseItem.inventoryItemId),
        );
        if (!inventoryItem || !inventoryItem.isActive) {
          throw new AppError(
            `Inventory item ${purchaseItem.itemName} is missing or inactive.`,
            409,
          );
        }

        const remainingQuantity =
          purchaseItem.orderedQuantity -
          purchaseItem.receivedQuantity;

        if (
          receiptItem.acceptedQuantity >
          remainingQuantity
        ) {
          throw new AppError(
            `Accepted quantity exceeds the remaining quantity for ${purchaseItem.itemName}.`,
            409,
          );
        }

        if (
          inventoryItem.expiryTrackingEnabled &&
          receiptItem.acceptedQuantity > 0 &&
          !receiptItem.expiryDate
        ) {
          throw new AppError(
            `Expiry date is required for ${purchaseItem.itemName}.`,
            409,
          );
        }

        acceptedValue +=
          receiptItem.acceptedQuantity *
          purchaseItem.unitCost;
      }

      const goodsReceiptNumber =
        createDocumentNumber("GRN");

      for (const receiptItem of input.items) {
        const purchaseItem = purchaseOrder.items.id(
          receiptItem.purchaseOrderItemId,
        );

        if (!purchaseItem) {
          continue;
        }

        if (receiptItem.acceptedQuantity > 0) {
          await recordInventoryMovement({
            inventoryItemId: String(
              purchaseItem.inventoryItemId,
            ),
            type: "purchase",
            quantity: receiptItem.acceptedQuantity,
            unitCost: purchaseItem.unitCost,
            referenceType: "purchase",
            referenceId: input.purchaseOrderId,
            reason: `Goods receipt ${goodsReceiptNumber}`,
            batchNumber: receiptItem.batchNumber,
            expiryDate: receiptItem.expiryDate,
            actorId: input.actorId,
            session,
          });
        }

        // Only accepted stock fulfils the purchase order. Rejected units
        // remain outstanding so a replacement delivery can be received.
        purchaseItem.receivedQuantity +=
          receiptItem.acceptedQuantity;
      }

      const allReceived = purchaseOrder.items.every(
        (item) =>
          item.receivedQuantity >= item.orderedQuantity,
      );

      purchaseOrder.status = allReceived
        ? "received"
        : "partially_received";
      purchaseOrder.updatedBy =
        new Types.ObjectId(input.actorId);

      await purchaseOrder.save({ session });

      const [receipt] = await GoodsReceipt.create(
        [
          {
            goodsReceiptNumber,
            purchaseOrderId: purchaseOrder._id,
            supplierId: purchaseOrder.supplierId,
            receivedAt: new Date(),
            invoiceNumber: input.invoiceNumber,
            invoiceDate: input.invoiceDate,
            items: input.items.map((receiptItem) => {
              const purchaseItem = purchaseOrder.items.id(
                receiptItem.purchaseOrderItemId,
              );

              if (!purchaseItem) {
                throw new AppError(
                  "Purchase order item not found.",
                  404,
                );
              }

              return {
                purchaseOrderItemId: purchaseItem._id,
                inventoryItemId: purchaseItem.inventoryItemId,
                receivedQuantity: receiptItem.receivedQuantity,
                acceptedQuantity: receiptItem.acceptedQuantity,
                rejectedQuantity: receiptItem.rejectedQuantity,
                unitCost: purchaseItem.unitCost,
                batchNumber: receiptItem.batchNumber,
                expiryDate: receiptItem.expiryDate,
                rejectionReason: receiptItem.rejectionReason,
              };
            }),
            acceptedValue,
            notes: input.notes,
            receivedBy: new Types.ObjectId(input.actorId),
          },
        ],
        { session },
      );

      createdReceipt = receipt;
    });
  } finally {
    await session.endSession();
  }

  if (!createdReceipt) {
    throw new AppError(
      "Goods receipt could not be created.",
      500,
    );
  }

  return createdReceipt;
}

type RecordSupplierPaymentInput = {
  supplierId: string;
  purchaseOrderId: string | null;
  amount: number;
  method:
    | "cash"
    | "upi"
    | "bank_transfer"
    | "cheque"
    | "card"
    | "other";
  referenceNumber: string;
  paymentDate?: Date;
  notes: string;
  actorId: string;
};

export async function recordSupplierPayment(
  input: RecordSupplierPaymentInput,
) {
  const supplier = await Supplier.findById(
    input.supplierId,
  );

  if (!supplier) {
    throw new AppError("Supplier not found.", 404);
  }

  let purchaseOrder = null;

  if (input.purchaseOrderId) {
    purchaseOrder = await PurchaseOrder.findOne({
      _id: input.purchaseOrderId,
      supplierId: input.supplierId,
      status: { $ne: "cancelled" },
    });

    if (!purchaseOrder) {
      throw new AppError(
        "Purchase order not found for this supplier.",
        404,
      );
    }

    if (input.amount > purchaseOrder.balanceAmount) {
      throw new AppError(
        "Payment exceeds the purchase order balance.",
        409,
      );
    }

    purchaseOrder.paidAmount += input.amount;
    purchaseOrder.balanceAmount = Math.max(
      0,
      purchaseOrder.grandTotal -
        purchaseOrder.paidAmount,
    );
    purchaseOrder.updatedBy =
      new Types.ObjectId(input.actorId);

    await purchaseOrder.save();
  }

  supplier.outstandingBalance = Math.max(
    0,
    supplier.outstandingBalance - input.amount,
  );
  supplier.updatedBy =
    new Types.ObjectId(input.actorId);

  await supplier.save();

  return SupplierPayment.create({
    paymentNumber:
      createDocumentNumber("SP"),
    supplierId: supplier._id,
    purchaseOrderId:
      purchaseOrder?._id ?? null,
    amount: input.amount,
    method: input.method,
    referenceNumber: input.referenceNumber,
    paymentDate:
      input.paymentDate ?? new Date(),
    notes: input.notes,
    recordedBy: new Types.ObjectId(
      input.actorId,
    ),
  });
}
