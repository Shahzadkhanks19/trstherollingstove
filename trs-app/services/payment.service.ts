import { createHmac, timingSafeEqual } from "node:crypto";

import { Types } from "mongoose";

import { AppError } from "@/lib/errors/AppError";
import {
  getRazorpayClient,
  getRazorpayPublicKey,
} from "@/lib/payments/razorpay";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { PaymentWebhookEvent } from "@/models/PaymentWebhookEvent";
import { publishOrderCreated, publishPaymentUpdated } from "@/services/realtimeEvents.service";
import { createKitchenTicketsFromOrder } from "@/services/kds.service";

function toPaise(amount: number) {
  return Math.round(amount * 100);
}

function fromPaise(amount: number) {
  return Math.round(amount) / 100;
}

function secureEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

async function finalizeCapturedOrder(input: {
  orderId: string;
  actorId: string;
}) {
  const paidOrder = await Order.findOneAndUpdate(
    { _id: input.orderId, paymentStatus: { $ne: "paid" } },
    {
      $set: {
        paymentStatus: "paid",
        paymentMethod: "online",
        updatedBy: new Types.ObjectId(input.actorId),
      },
    },
    { returnDocument: "after" },
  );

  if (!paidOrder) return null;

  publishOrderCreated({
    orderId: paidOrder.id,
    orderNumber: paidOrder.orderNumber,
    customerId: paidOrder.customerId?.toString(),
    status: paidOrder.status,
    paymentStatus: paidOrder.paymentStatus,
    grandTotal: paidOrder.grandTotal,
    orderMode: paidOrder.orderMode,
    actorId: input.actorId,
  });

  try {
    await createKitchenTicketsFromOrder({
      orderId: paidOrder.id,
      orderNumber: paidOrder.orderNumber,
      source: "website",
      actorId: input.actorId,
      fulfilmentType:
        paidOrder.orderMode === "dine_in" ? "dine_in" : "pickup",
      ...(paidOrder.tableNumber
        ? { tableLabel: paidOrder.tableNumber }
        : {}),
      ...(paidOrder.customerSnapshot?.name
        ? { customerName: paidOrder.customerSnapshot.name }
        : {}),
      items: paidOrder.items.map((item) => ({
        orderItemId: item._id.toString(),
        menuItemId: item.menuItemId?.toString() ?? item._id.toString(),
        name: item.name,
        variantName: item.variantName ?? "",
        quantity: item.quantity,
        ...(item.specialInstructions
          ? { notes: item.specialInstructions }
          : {}),
        modifiers: item.modifiers.map((modifier) => ({
          name: modifier.groupName,
          value: modifier.optionName,
        })),
      })),
    });
  } catch (error) {
    console.error("[kds] Unable to create tickets for paid order.", {
      orderId: paidOrder.id,
      error:
        error instanceof Error ? error.message : "Unknown KDS error.",
    });
  }

  return paidOrder;
}

export function verifyCheckoutSignature(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new AppError("Razorpay secret is not configured.", 500);

  const expected = createHmac("sha256", secret)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest("hex");

  return secureEqual(expected, input.razorpaySignature);
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new AppError("Razorpay webhook secret is not configured.", 500);
  }

  const expected = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return secureEqual(expected, signature);
}

export async function createRazorpayPaymentOrder(input: {
  orderId: string;
  customerId: string;
}) {
  const order = await Order.findOne({
    _id: input.orderId,
    customerId: input.customerId,
  });

  if (!order) throw new AppError("Order not found.", 404);
  if (order.paymentMethod !== "online") {
    throw new AppError("This order is not configured for online payment.", 400);
  }
  if (order.paymentStatus === "paid") {
    throw new AppError("Order is already paid.", 409);
  }
  if (["cancelled", "rejected"].includes(order.status)) {
    throw new AppError("Cancelled orders cannot be paid.", 409);
  }

  const existing = await Payment.findOne({
    orderId: order._id,
    status: { $in: ["created", "authorized", "captured", "failed"] },
  }).sort({ createdAt: -1 });

  if (existing) {
    if (toPaise(existing.amount) !== toPaise(order.grandTotal)) {
      throw new AppError(
        "The order total changed after the payment session was created. Please return to checkout.",
        409,
      );
    }

    if (existing.status === "failed") {
      existing.status = "created";
      existing.failureCode = "";
      existing.failureDescription = "";
      existing.updatedBy = new Types.ObjectId(input.customerId);
      await existing.save();
    }

    const key = getRazorpayPublicKey();
    return {
      key,
      keyId: key,
      orderId: existing.providerOrderId,
      providerOrderId: existing.providerOrderId,
      amount: toPaise(existing.amount),
      currency: existing.currency,
      orderNumber: order.orderNumber,
    };
  }

  const client = getRazorpayClient();
  const providerOrder = await client.orders.create({
    amount: toPaise(order.grandTotal),
    currency: "INR",
    receipt: order.orderNumber,
    notes: {
      applicationOrderId: order.id,
      customerId: input.customerId,
    },
  });

  const payment = await Payment.create({
    orderId: order._id,
    customerId: new Types.ObjectId(input.customerId),
    provider: "razorpay",
    providerOrderId: providerOrder.id,
    amount: order.grandTotal,
    currency: providerOrder.currency,
    status: "created",
    createdBy: new Types.ObjectId(input.customerId),
    updatedBy: new Types.ObjectId(input.customerId),
  });

  const key = getRazorpayPublicKey();
  return {
    key,
    keyId: key,
    paymentId: payment.id,
    orderId: providerOrder.id,
    providerOrderId: providerOrder.id,
    amount: providerOrder.amount,
    currency: providerOrder.currency,
    orderNumber: order.orderNumber,
  };
}

export async function markRazorpayPaymentFailed(input: {
  orderId: string;
  customerId: string;
  razorpayOrderId: string;
  code?: string;
  description?: string;
  reason?: string;
}) {
  const payment = await Payment.findOne({
    orderId: input.orderId,
    customerId: input.customerId,
    providerOrderId: input.razorpayOrderId,
    status: { $ne: "captured" },
  });

  if (!payment) throw new AppError("Payment record not found.", 404);

  payment.status = "failed";
  payment.failureCode = input.code?.slice(0, 200) ?? "";
  payment.failureDescription =
    input.description?.slice(0, 500) || input.reason?.slice(0, 500) || "Payment failed.";
  payment.rawMetadata = {
    ...((payment.rawMetadata as Record<string, unknown>) ?? {}),
    checkoutFailure: {
      code: input.code ?? "",
      description: input.description ?? "",
      reason: input.reason ?? "",
      recordedAt: new Date().toISOString(),
    },
  };
  payment.updatedBy = new Types.ObjectId(input.customerId);
  await payment.save();

  publishPaymentUpdated({
    paymentId: payment.id,
    orderId: payment.orderId.toString(),
    status: payment.status,
    actorId: input.customerId,
  });

  return payment;
}

export async function confirmRazorpayPayment(input: {
  orderId: string;
  customerId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const isValid = verifyCheckoutSignature(input);
  if (!isValid) throw new AppError("Payment signature verification failed.", 400);

  const payment = await Payment.findOne({
    orderId: input.orderId,
    customerId: input.customerId,
    providerOrderId: input.razorpayOrderId,
  });

  if (!payment) throw new AppError("Payment record not found.", 404);

  const client = getRazorpayClient();
  const providerPayment = await client.payments.fetch(input.razorpayPaymentId);

  if (providerPayment.order_id !== input.razorpayOrderId) {
    throw new AppError("Payment does not belong to this order.", 400);
  }

  if (Number(providerPayment.amount) !== toPaise(payment.amount)) {
    throw new AppError("Payment amount mismatch.", 400);
  }

  payment.providerPaymentId = providerPayment.id;
  payment.method = providerPayment.method ?? "";
  payment.email = providerPayment.email ?? "";
  payment.contact = providerPayment.contact
    ? String(providerPayment.contact)
    : "";
  payment.rawMetadata = providerPayment;
  payment.verifiedAt = new Date();
  payment.updatedBy = new Types.ObjectId(input.customerId);

  if (providerPayment.status === "captured") {
    payment.status = "captured";
    payment.capturedAt = new Date();
  } else if (providerPayment.status === "authorized") {
    payment.status = "authorized";
  } else if (providerPayment.status === "failed") {
    payment.status = "failed";
    payment.failureCode = providerPayment.error_code ?? "";
    payment.failureDescription = providerPayment.error_description ?? "";
  }

  await payment.save();

  if (payment.status === "captured") {
    await finalizeCapturedOrder({
      orderId: input.orderId,
      actorId: input.customerId,
    });
  }

  publishPaymentUpdated({
    paymentId: payment.id,
    orderId: payment.orderId.toString(),
    status: payment.status,
    actorId: input.customerId,
  });

  return payment;
}

export async function refundRazorpayPayment(input: {
  paymentId: string;
  actorId: string;
  amount?: number;
  reason: string;
}) {
  const payment = await Payment.findById(input.paymentId);
  if (!payment) throw new AppError("Payment not found.", 404);
  if (!payment.providerPaymentId) {
    throw new AppError("Provider payment ID is unavailable.", 400);
  }
  if (![
    "captured",
    "partially_refunded",
  ].includes(payment.status)) {
    throw new AppError("Only captured payments can be refunded.", 409);
  }

  const refundableAmount = Math.max(
    0,
    Number((payment.amount - payment.amountRefunded).toFixed(2)),
  );
  const requestedAmount = Number(
    (input.amount ?? refundableAmount).toFixed(2),
  );

  if (requestedAmount <= 0 || requestedAmount > refundableAmount) {
    throw new AppError("Invalid refund amount.", 400);
  }

  const previousStatus = payment.status;
  const lockedPayment = await Payment.findOneAndUpdate(
    {
      _id: payment._id,
      status: previousStatus,
      amountRefunded: payment.amountRefunded,
    },
    {
      $set: {
        status: "refund_pending",
        updatedBy: new Types.ObjectId(input.actorId),
      },
    },
    { returnDocument: "after" },
  );

  if (!lockedPayment) {
    throw new AppError(
      "Another refund is already being processed for this payment.",
      409,
    );
  }

  try {
    const client = getRazorpayClient();
    const refund = await client.payments.refund(
      lockedPayment.providerPaymentId,
      {
        amount: toPaise(requestedAmount),
        notes: {
          reason: input.reason,
          applicationPaymentId: lockedPayment.id,
        },
      },
    );

    const refundAmount = fromPaise(Number(refund.amount));
    const nextRefundedAmount = Math.min(
      lockedPayment.amount,
      Number((lockedPayment.amountRefunded + refundAmount).toFixed(2)),
    );

    lockedPayment.providerRefundId = refund.id;
    lockedPayment.providerRefundIds = Array.from(
      new Set([...(lockedPayment.providerRefundIds ?? []), refund.id]),
    );
    lockedPayment.amountRefunded = nextRefundedAmount;
    lockedPayment.status =
      nextRefundedAmount >= lockedPayment.amount
        ? "refunded"
        : "partially_refunded";
    lockedPayment.refundedAt = new Date();
    lockedPayment.updatedBy = new Types.ObjectId(input.actorId);
    lockedPayment.rawMetadata = {
      ...(lockedPayment.rawMetadata as Record<string, unknown>),
      latestRefund: refund,
    };
    await lockedPayment.save();

    if (lockedPayment.status === "refunded") {
      await Order.updateOne(
        { _id: lockedPayment.orderId },
        {
          $set: {
            paymentStatus: "refunded",
            updatedBy: new Types.ObjectId(input.actorId),
          },
        },
      );
    }

    publishPaymentUpdated({
      paymentId: lockedPayment.id,
      orderId: lockedPayment.orderId.toString(),
      status: lockedPayment.status,
      actorId: input.actorId,
    });

    return lockedPayment;
  } catch (error) {
    await Payment.updateOne(
      { _id: lockedPayment._id, status: "refund_pending" },
      { $set: { status: previousStatus } },
    );
    throw error;
  }
}

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        amount_refunded?: number;
        status?: string;
        method?: string;
        email?: string;
        contact?: string | number;
        error_code?: string;
        error_description?: string;
      };
    };
    refund?: {
      entity?: {
        id?: string;
        payment_id?: string;
        amount?: number;
        status?: string;
      };
    };
  };
};

export async function processRazorpayWebhook(input: {
  eventId: string;
  payload: RazorpayWebhookPayload;
}) {
  const previous = await PaymentWebhookEvent.findOne({
    eventId: input.eventId,
  });

  if (previous?.processed) {
    return { duplicate: true };
  }

  const record =
    previous ??
    (await PaymentWebhookEvent.create({
      eventId: input.eventId,
      eventName: input.payload.event ?? "unknown",
      provider: "razorpay",
      payload: input.payload,
    }));

  try {
    const eventName = input.payload.event ?? "";
    const paymentEntity = input.payload.payload?.payment?.entity;
    const refundEntity = input.payload.payload?.refund?.entity;

    if (paymentEntity?.order_id) {
      const payment = await Payment.findOne({
        providerOrderId: paymentEntity.order_id,
      });

      if (payment) {
        payment.providerPaymentId =
          paymentEntity.id ?? payment.providerPaymentId;
        payment.method = paymentEntity.method ?? payment.method;
        payment.email = paymentEntity.email ?? payment.email;
        payment.contact = paymentEntity.contact
          ? String(paymentEntity.contact)
          : payment.contact;
        payment.rawMetadata = input.payload;

        if (
          eventName === "payment.captured" ||
          eventName === "order.paid"
        ) {
          if (
            paymentEntity.amount !== undefined &&
            Number(paymentEntity.amount) !== toPaise(payment.amount)
          ) {
            throw new AppError("Webhook payment amount mismatch.", 400);
          }

          payment.status = "captured";
          payment.capturedAt = payment.capturedAt ?? new Date();
        } else if (eventName === "payment.authorized") {
          if (payment.status !== "captured") payment.status = "authorized";
        } else if (eventName === "payment.failed") {
          if (payment.status !== "captured") {
            payment.status = "failed";
            payment.failureCode = paymentEntity.error_code ?? "";
            payment.failureDescription =
              paymentEntity.error_description ?? "";
          }
        }

        await payment.save();

        if (payment.status === "captured") {
          await finalizeCapturedOrder({
            orderId: payment.orderId.toString(),
            actorId: payment.customerId.toString(),
          });
        }

        publishPaymentUpdated({
          paymentId: payment.id,
          orderId: payment.orderId.toString(),
          status: payment.status,
          actorId: payment.customerId.toString(),
        });
      }
    }

    if (refundEntity?.payment_id) {
      const payment = await Payment.findOne({
        providerPaymentId: refundEntity.payment_id,
      });

      if (payment) {
        const refundId = refundEntity.id ?? "";
        const knownRefundIds = new Set([
          ...(payment.providerRefundIds ?? []),
          ...(payment.providerRefundId ? [payment.providerRefundId] : []),
        ]);
        const isAlreadyRecorded = refundId
          ? knownRefundIds.has(refundId)
          : false;

        const providerCumulativeAmount = paymentEntity?.amount_refunded;
        const webhookRefundAmount = fromPaise(
          Number(refundEntity.amount ?? 0),
        );
        const nextRefundedAmount = Math.min(
          payment.amount,
          providerCumulativeAmount !== undefined
            ? fromPaise(Number(providerCumulativeAmount))
            : isAlreadyRecorded
              ? payment.amountRefunded
              : Number(
                  (payment.amountRefunded + webhookRefundAmount).toFixed(2),
                ),
        );

        if (refundId) {
          payment.providerRefundId = refundId;
          payment.providerRefundIds = Array.from(
            new Set([...(payment.providerRefundIds ?? []), refundId]),
          );
        }
        payment.amountRefunded = nextRefundedAmount;
        payment.status =
          nextRefundedAmount >= payment.amount
            ? "refunded"
            : "partially_refunded";
        payment.refundedAt = new Date();
        payment.rawMetadata = input.payload;
        await payment.save();

        if (payment.status === "refunded") {
          await Order.updateOne(
            { _id: payment.orderId },
            { $set: { paymentStatus: "refunded" } },
          );
        }
        publishPaymentUpdated({
          paymentId: payment.id,
          orderId: payment.orderId.toString(),
          status: payment.status,
          actorId: payment.customerId.toString(),
        });
      }
    }

    record.processed = true;
    record.processedAt = new Date();
    record.processingError = "";
    await record.save();

    return { duplicate: false };
  } catch (error) {
    record.processingError =
      error instanceof Error ? error.message : "Unknown processing error.";
    await record.save();
    throw error;
  }
}
export async function getCustomerPaymentStatus(input: {
  orderId: string;
  customerId: string;
}) {
  const order = await Order.findOne({
    _id: input.orderId,
    customerId: input.customerId,
  }).lean();

  if (!order) throw new AppError("Order not found.", 404);

  const payment = await Payment.findOne({
    orderId: order._id,
    customerId: input.customerId,
  })
    .sort({ createdAt: -1 })
    .lean();

  return {
    order: {
      id: String(order._id),
      orderNumber: order.orderNumber,
      items: order.items,
      itemCount: order.itemCount,
      subtotal: order.subtotal,
      taxTotal: order.taxTotal,
      couponDiscount: order.couponDiscount,
      coinDiscount: order.coinDiscount,
      discountTotal: order.discountTotal,
      grandTotal: order.grandTotal,
      orderMode: order.orderMode,
      requestedPickupAt: order.requestedPickupAt,
      estimatedReadyAt: order.estimatedReadyAt,
      status: order.status,
      paymentStatus: order.paymentStatus,
      customerSnapshot: order.customerSnapshot,
    },
    payment: payment
      ? {
          status: payment.status,
          providerOrderId: payment.providerOrderId,
          providerPaymentId: payment.providerPaymentId,
          amount: payment.amount,
          currency: payment.currency,
          failureDescription: payment.failureDescription,
        }
      : null,
  };
}
