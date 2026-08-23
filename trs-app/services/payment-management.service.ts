import { Types } from "mongoose";
import type { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { Payment } from "@/models/Payment";
import { PaymentManagementSnapshot } from "@/models/PaymentManagementSnapshot";
import { PaymentReconciliation } from "@/models/PaymentReconciliation";
import type {
  paymentReconciliationSchema,
  paymentRefundSchema,
  paymentReverseSchema,
} from "@/validators/payment-management";

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const dayKey = (date: Date) => date.toISOString().slice(0, 10);

export function getPaymentManagementRange(days: number) {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - Math.max(1, days) + 1);
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end, days };
}

type Breakdown = { count: number; amount: number };
function addBreakdown(map: Map<string, Breakdown>, key: string, amount: number) {
  const current = map.get(key) ?? { count: 0, amount: 0 };
  current.count += 1;
  current.amount += amount;
  map.set(key, current);
}
function finishBreakdown(map: Map<string, Breakdown>) {
  return [...map.entries()]
    .map(([key, value]) => ({ key, count: value.count, amount: round(value.amount) }))
    .sort((a, b) => b.amount - a.amount);
}

export async function refundManagedPayment(
  paymentId: string,
  input: z.infer<typeof paymentRefundSchema>,
  actorId: string,
) {
  await connectToDatabase();
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new AppError("Payment not found.", 404);
  if (!["captured", "partially_refunded"].includes(payment.status)) {
    throw new AppError("Only captured payments can be refunded.", 409);
  }
  const refundable = round(payment.amount - payment.amountRefunded);
  if (input.amount > refundable) throw new AppError("Refund amount exceeds the refundable balance.", 400);

  payment.amountRefunded = round(payment.amountRefunded + input.amount);
  payment.status = payment.amountRefunded >= payment.amount ? "refunded" : "partially_refunded";
  payment.refundedAt = new Date();
  payment.providerRefundId = input.providerRefundId;
  if (input.providerRefundId && !payment.providerRefundIds.includes(input.providerRefundId)) {
    payment.providerRefundIds.push(input.providerRefundId);
  }
  payment.rawMetadata = {
    ...(payment.rawMetadata && typeof payment.rawMetadata === "object" ? payment.rawMetadata : {}),
    lastFinanceRefund: {
      amount: input.amount,
      reason: input.reason,
      actorId,
      recordedAt: new Date().toISOString(),
    },
  };
  payment.updatedBy = new Types.ObjectId(actorId);
  await payment.save();
  return payment;
}

export async function reverseManagedPayment(
  paymentId: string,
  input: z.infer<typeof paymentReverseSchema>,
  actorId: string,
) {
  await connectToDatabase();
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new AppError("Payment not found.", 404);
  if (["refunded", "partially_refunded"].includes(payment.status)) {
    throw new AppError("Refunded payments cannot be reversed.", 409);
  }
  if (payment.status === "failed") throw new AppError("Payment is already marked as failed.", 409);

  payment.status = "failed";
  payment.failureCode = "finance_reversal";
  payment.failureDescription = input.reason;
  payment.rawMetadata = {
    ...(payment.rawMetadata && typeof payment.rawMetadata === "object" ? payment.rawMetadata : {}),
    financeReversal: { reason: input.reason, actorId, reversedAt: new Date().toISOString() },
  };
  payment.updatedBy = new Types.ObjectId(actorId);
  await payment.save();
  return payment;
}

export async function reconcileManagedPayment(
  input: z.infer<typeof paymentReconciliationSchema>,
  actorId: string,
) {
  await connectToDatabase();
  const payment = await Payment.findById(input.paymentId);
  if (!payment) throw new AppError("Payment not found.", 404);
  const expectedAmount = round(Math.max(0, payment.amount - payment.amountRefunded));
  const differenceAmount = round(input.settledAmount - expectedAmount);
  const status = Math.abs(differenceAmount) < 0.01 ? "matched" : input.settledAmount === 0 ? "unmatched" : "difference";

  return PaymentReconciliation.create({
    paymentId: payment._id,
    providerPaymentId: payment.providerPaymentId,
    reconciliationType: input.reconciliationType,
    status,
    expectedAmount,
    settledAmount: input.settledAmount,
    differenceAmount,
    settlementReference: input.settlementReference,
    settledAt: input.settledAt ?? null,
    notes: input.notes,
    reconciledBy: new Types.ObjectId(actorId),
    reconciledAt: new Date(),
  });
}

export async function buildPaymentManagementSnapshot(input: {
  days: number;
  source: "manual" | "scheduled" | "system";
  generatedBy?: string | null;
}) {
  await connectToDatabase();
  const range = getPaymentManagementRange(input.days);
  const [payments, reconciliations] = await Promise.all([
    Payment.find({ createdAt: { $gte: range.start, $lte: range.end } }).lean(),
    PaymentReconciliation.find({ reconciledAt: { $gte: range.start, $lte: range.end } }).lean(),
  ]);

  const byStatus = new Map<string, Breakdown>();
  const byMethod = new Map<string, Breakdown>();
  const byProvider = new Map<string, Breakdown>();
  const byDay = new Map<string, Breakdown>();
  let capturedCount = 0;
  let failedCount = 0;
  let pendingCount = 0;
  let refundedCount = 0;
  let grossAmount = 0;
  let capturedAmount = 0;
  let refundedAmount = 0;

  for (const payment of payments) {
    const amount = Number(payment.amount);
    const refunded = Number(payment.amountRefunded);
    grossAmount += amount;
    refundedAmount += refunded;
    if (["captured", "partially_refunded", "refunded"].includes(payment.status)) {
      capturedCount += 1;
      capturedAmount += amount;
    }
    if (payment.status === "failed") failedCount += 1;
    if (["created", "authorized", "refund_pending"].includes(payment.status)) pendingCount += 1;
    if (["partially_refunded", "refunded"].includes(payment.status)) refundedCount += 1;
    addBreakdown(byStatus, payment.status, amount);
    addBreakdown(byMethod, payment.method || "unknown", amount);
    addBreakdown(byProvider, payment.provider || "unknown", amount);
    addBreakdown(byDay, dayKey(new Date(payment.createdAt)), amount);
  }

  const matchedReconciliationCount = reconciliations.filter((row) => row.status === "matched").length;
  const unmatchedAmount = reconciliations
    .filter((row) => row.status !== "matched")
    .reduce((sum, row) => sum + Math.abs(Number(row.differenceAmount)), 0);
  const attemptedCount = capturedCount + failedCount;
  const metrics = {
    paymentCount: payments.length,
    capturedCount,
    failedCount,
    pendingCount,
    refundedCount,
    grossAmount: round(grossAmount),
    capturedAmount: round(capturedAmount),
    refundedAmount: round(refundedAmount),
    netCollectedAmount: round(capturedAmount - refundedAmount),
    successRate: attemptedCount ? round((capturedCount / attemptedCount) * 100) : 0,
    failureRate: attemptedCount ? round((failedCount / attemptedCount) * 100) : 0,
    reconciliationCount: reconciliations.length,
    matchedReconciliationCount,
    unmatchedAmount: round(unmatchedAmount),
  };
  const periodKey = `${dayKey(range.start)}_${dayKey(range.end)}`;

  return PaymentManagementSnapshot.findOneAndUpdate(
    { periodKey },
    {
      $set: {
        periodStart: range.start,
        periodEnd: range.end,
        currency: "INR",
        metrics,
        byStatus: finishBreakdown(byStatus),
        byMethod: finishBreakdown(byMethod),
        byProvider: finishBreakdown(byProvider),
        byDay: finishBreakdown(byDay).sort((a, b) => a.key.localeCompare(b.key)),
        generatedAt: new Date(),
        generatedBy: input.generatedBy ? new Types.ObjectId(input.generatedBy) : null,
        source: input.source,
      },
    },
    { upsert: true, returnDocument: "after", runValidators: true },
  ).lean();
}

export async function getPaymentManagementSummary(days: number) {
  await connectToDatabase();
  const range = getPaymentManagementRange(days);
  const periodKey = `${dayKey(range.start)}_${dayKey(range.end)}`;
  const [existingSnapshot, recentPayments, recentReconciliations] = await Promise.all([
    PaymentManagementSnapshot.findOne({ periodKey }).lean(),
    Payment.find({ createdAt: { $gte: range.start, $lte: range.end } })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean(),
    PaymentReconciliation.find({ reconciledAt: { $gte: range.start, $lte: range.end } })
      .sort({ reconciledAt: -1 })
      .limit(20)
      .lean(),
  ]);
  const snapshot = existingSnapshot ?? await buildPaymentManagementSnapshot({ days, source: "system" });
  return { snapshot, recentPayments, recentReconciliations };
}
