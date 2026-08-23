import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { Expense } from "@/models/Expense";
import { ExpenseSnapshot } from "@/models/ExpenseSnapshot";
import type { z } from "zod";
import type { expenseCreateSchema, expenseUpdateSchema } from "@/validators/expense-management";

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const dayKey = (value: Date) => value.toISOString().slice(0, 10);
export const getExpenseRange = (days: number) => {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - Math.max(1, days) + 1);
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end, days };
};

function totals(input: { subtotal: number; taxAmount: number; discountAmount: number; paidAmount: number }) {
  const totalAmount = round(Math.max(0, input.subtotal + input.taxAmount - input.discountAmount));
  const paidAmount = round(Math.min(totalAmount, input.paidAmount));
  const outstandingAmount = round(Math.max(0, totalAmount - paidAmount));
  const paymentStatus = totalAmount === 0 || paidAmount >= totalAmount ? "paid" : paidAmount > 0 ? "partially_paid" : "unpaid";
  return { totalAmount, paidAmount, outstandingAmount, paymentStatus } as const;
}

async function nextExpenseNumber() {
  const prefix = `EXP-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`;
  const count = await Expense.countDocuments({ expenseNumber: { $regex: `^${prefix}-` } });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

export async function createExpense(input: z.infer<typeof expenseCreateSchema>, actorId: string) {
  await connectToDatabase();
  const calculated = totals(input);
  const actorObjectId = new Types.ObjectId(actorId);
  const expense = new Expense({
    ...input,
    vendorId: input.vendorId ? new Types.ObjectId(input.vendorId) : null,
    purchaseOrderId: input.purchaseOrderId ? new Types.ObjectId(input.purchaseOrderId) : null,
    expenseNumber: await nextExpenseNumber(),
    ...calculated,
    approvedBy: input.approvalStatus === "approved" ? actorObjectId : null,
    approvedAt: input.approvalStatus === "approved" ? new Date() : null,
    createdBy: actorObjectId,
    updatedBy: actorObjectId,
  });
  await expense.save();
  return expense;
}

export async function updateExpense(expenseId: string, input: z.infer<typeof expenseUpdateSchema>, actorId: string) {
  await connectToDatabase();
  const expense = await Expense.findById(expenseId);
  if (!expense) throw new AppError("Expense not found.", 404);
  const actorObjectId = new Types.ObjectId(actorId);
  const merged = {
    subtotal: input.subtotal ?? expense.subtotal,
    taxAmount: input.taxAmount ?? expense.taxAmount,
    discountAmount: input.discountAmount ?? expense.discountAmount,
    paidAmount: input.paidAmount ?? expense.paidAmount,
  };
  Object.assign(expense, input, totals(merged), {
    vendorId: input.vendorId === undefined ? expense.vendorId : input.vendorId ? new Types.ObjectId(input.vendorId) : null,
    purchaseOrderId: input.purchaseOrderId === undefined ? expense.purchaseOrderId : input.purchaseOrderId ? new Types.ObjectId(input.purchaseOrderId) : null,
    updatedBy: actorObjectId,
  });
  if (input.approvalStatus === "approved") {
    expense.approvedBy = actorObjectId;
    expense.approvedAt = new Date();
    expense.rejectedBy = null;
    expense.rejectedAt = null;
    expense.rejectionReason = "";
  }
  if (input.approvalStatus === "rejected") {
    expense.rejectedBy = actorObjectId;
    expense.rejectedAt = new Date();
    expense.rejectionReason = input.rejectionReason ?? "";
  }
  await expense.save();
  return expense;
}

type Breakdown = { count: number; total: number; paid: number; outstanding: number; tax: number };
function add(map: Map<string, Breakdown>, key: string, values: Omit<Breakdown, "count">) {
  const row = map.get(key) ?? { count: 0, total: 0, paid: 0, outstanding: 0, tax: 0 };
  row.count += 1;
  row.total += values.total;
  row.paid += values.paid;
  row.outstanding += values.outstanding;
  row.tax += values.tax;
  map.set(key, row);
}
function finalize(map: Map<string, Breakdown>) {
  return [...map.entries()].map(([key, row]) => ({ key, count: row.count, total: round(row.total), paid: round(row.paid), outstanding: round(row.outstanding), tax: round(row.tax) }));
}

export async function buildExpenseSnapshot(input: { days: number; source: "manual" | "scheduled" | "system"; generatedBy?: string | null }) {
  await connectToDatabase();
  const range = getExpenseRange(input.days);
  const expenses = await Expense.find({ expenseDate: { $gte: range.start, $lte: range.end }, approvalStatus: { $ne: "void" }, paymentStatus: { $ne: "void" } }).lean();
  const byDay = new Map<string, Breakdown>();
  const byCategory = new Map<string, Breakdown>();
  const byDepartment = new Map<string, Breakdown>();
  const byPaymentMethod = new Map<string, Breakdown>();
  let approvedCount = 0; let pendingCount = 0; let totalExpenses = 0; let approvedExpenses = 0; let paidExpenses = 0; let outstandingExpenses = 0; let taxPaid = 0; let recurringCommitments = 0;
  for (const expense of expenses) {
    const values = { total: Number(expense.totalAmount), paid: Number(expense.paidAmount), outstanding: Number(expense.outstandingAmount), tax: Number(expense.taxAmount) };
    totalExpenses += values.total; paidExpenses += values.paid; outstandingExpenses += values.outstanding; taxPaid += values.tax;
    if (expense.approvalStatus === "approved") { approvedCount += 1; approvedExpenses += values.total; }
    if (expense.approvalStatus === "pending") pendingCount += 1;
    if (expense.recurring?.enabled) recurringCommitments += values.outstanding || values.total;
    add(byDay, dayKey(new Date(expense.expenseDate)), values);
    add(byCategory, expense.category, values);
    add(byDepartment, expense.department, values);
    add(byPaymentMethod, expense.paymentMethod, values);
  }
  const metrics = {
    expenseCount: expenses.length, approvedCount, pendingCount,
    totalExpenses: round(totalExpenses), approvedExpenses: round(approvedExpenses), paidExpenses: round(paidExpenses), outstandingExpenses: round(outstandingExpenses), taxPaid: round(taxPaid), recurringCommitments: round(recurringCommitments), averageExpense: expenses.length ? round(totalExpenses / expenses.length) : 0,
  };
  const periodKey = `${dayKey(range.start)}_${dayKey(range.end)}`;
  return ExpenseSnapshot.findOneAndUpdate(
    { periodKey },
    { $set: { periodStart: range.start, periodEnd: range.end, currency: "INR", metrics, byDay: finalize(byDay).sort((a,b)=>a.key.localeCompare(b.key)), byCategory: finalize(byCategory).sort((a,b)=>b.total-a.total), byDepartment: finalize(byDepartment).sort((a,b)=>b.total-a.total), byPaymentMethod: finalize(byPaymentMethod).sort((a,b)=>b.total-a.total), generatedAt: new Date(), generatedBy: input.generatedBy ? new Types.ObjectId(input.generatedBy) : null, source: input.source } },
    { upsert: true, returnDocument: "after", runValidators: true },
  ).lean();
}

export async function getExpenseSummary(days: number) {
  await connectToDatabase();
  const range = getExpenseRange(days);
  const periodKey = `${dayKey(range.start)}_${dayKey(range.end)}`;
  const [snapshot, recentExpenses] = await Promise.all([
    ExpenseSnapshot.findOne({ periodKey }).lean(),
    Expense.find({ expenseDate: { $gte: range.start, $lte: range.end }, approvalStatus: { $ne: "void" } }).sort({ expenseDate: -1 }).limit(20).lean(),
  ]);
  return { snapshot: snapshot ?? await buildExpenseSnapshot({ days, source: "system" }), recentExpenses };
}
