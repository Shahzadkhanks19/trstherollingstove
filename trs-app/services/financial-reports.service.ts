import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { FinancialReportSnapshot } from "@/models/FinancialReportSnapshot";
import { buildRevenueSnapshot } from "@/services/revenue-management.service";
import { buildExpenseSnapshot } from "@/services/expense-management.service";
import { buildAccountsReceivableSnapshot } from "@/services/accounts-receivable.service";
import { buildAccountsPayableSnapshot } from "@/services/accounts-payable.service";
import { buildInvoiceReceiptSnapshot } from "@/services/invoice-receipt.service";
import { buildPaymentManagementSnapshot } from "@/services/payment-management.service";

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const dayKey = (value: Date) => value.toISOString().slice(0, 10);
export function getFinancialReportRange(days: number) {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - Math.max(1, days) + 1);
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end, days };
}

type Row = { key: string; label: string; amount: number; debit: number; credit: number };
const row = (key: string, label: string, amount: number, side: "debit" | "credit" = "debit"): Row => ({
  key, label, amount: round(amount), debit: side === "debit" ? round(Math.max(0, amount)) : 0,
  credit: side === "credit" ? round(Math.max(0, amount)) : 0,
});

export async function buildFinancialReportSnapshot(input: { days: number; source: "manual" | "scheduled" | "system"; generatedBy?: string | null }) {
  await connectToDatabase();
  const range = getFinancialReportRange(input.days);
  const [revenue, expenses, receivables, payables, documents, payments] = await Promise.all([
    buildRevenueSnapshot(input), buildExpenseSnapshot(input), buildAccountsReceivableSnapshot(input),
    buildAccountsPayableSnapshot(input), buildInvoiceReceiptSnapshot(input), buildPaymentManagementSnapshot(input),
  ]);
  if (!revenue?.metrics || !expenses?.metrics || !receivables?.metrics || !payables?.metrics || !documents?.metrics || !payments?.metrics) {
    throw new Error("One or more finance modules did not return report metrics.");
  }

  const grossRevenue = Number(revenue.metrics.grossRevenue);
  const netRevenue = Number(revenue.metrics.netRevenue);
  const operatingExpenses = Number(expenses.metrics.approvedExpenses);
  const grossProfit = round(netRevenue - operatingExpenses);
  const netProfit = grossProfit;
  const cashInflows = Number(payments.metrics.netCollectedAmount);
  const cashOutflows = Number(expenses.metrics.paidExpenses);
  const netCashFlow = round(cashInflows - cashOutflows);
  const accountsReceivable = Number(receivables.metrics.outstandingAmount);
  const accountsPayable = Number(payables.metrics.outstandingAmount);
  const outputTax = Number(revenue.metrics.taxCollected || documents.metrics.taxAmount);
  const inputTax = Number(expenses.metrics.taxPaid);
  const netTaxPayable = round(Math.max(0, outputTax - inputTax));
  const cashBalance = Math.max(0, netCashFlow);
  const currentAssets = round(cashBalance + accountsReceivable);
  const currentLiabilities = round(accountsPayable + netTaxPayable);
  const workingCapital = round(currentAssets - currentLiabilities);
  const metrics = {
    grossRevenue: round(grossRevenue), netRevenue: round(netRevenue), operatingExpenses: round(operatingExpenses),
    grossProfit, netProfit, profitMargin: netRevenue ? round((netProfit / netRevenue) * 100) : 0,
    cashInflows: round(cashInflows), cashOutflows: round(cashOutflows), netCashFlow,
    accountsReceivable: round(accountsReceivable), accountsPayable: round(accountsPayable),
    outputTax: round(outputTax), inputTax: round(inputTax), netTaxPayable,
    currentAssets, currentLiabilities, workingCapital,
  };

  const profitAndLoss = [
    row("gross_revenue", "Gross revenue", grossRevenue, "credit"),
    row("discounts_refunds", "Discounts and refunds", grossRevenue - netRevenue, "debit"),
    row("net_revenue", "Net recognized revenue", netRevenue, "credit"),
    row("operating_expenses", "Operating expenses", operatingExpenses, "debit"),
    row("net_profit", "Net profit / (loss)", Math.abs(netProfit), netProfit >= 0 ? "credit" : "debit"),
  ];
  const cashFlow = [
    row("collections", "Customer and gateway collections", cashInflows, "debit"),
    row("expense_payments", "Operating expense payments", cashOutflows, "credit"),
    row("net_cash_flow", "Net operating cash flow", Math.abs(netCashFlow), netCashFlow >= 0 ? "debit" : "credit"),
  ];
  const balanceSheet = [
    row("cash", "Cash and payment settlements", cashBalance, "debit"),
    row("receivables", "Accounts receivable", accountsReceivable, "debit"),
    row("payables", "Accounts payable", accountsPayable, "credit"),
    row("tax_payable", "Net GST / tax payable", netTaxPayable, "credit"),
    row("retained_earnings", "Current-period retained earnings", Math.abs(workingCapital), workingCapital >= 0 ? "credit" : "debit"),
  ];
  const trialBalance = [
    row("cash", "Cash / settlements", cashBalance, "debit"), row("accounts_receivable", "Accounts receivable", accountsReceivable, "debit"),
    row("operating_expense", "Operating expenses", operatingExpenses, "debit"), row("accounts_payable", "Accounts payable", accountsPayable, "credit"),
    row("sales_revenue", "Sales revenue", netRevenue, "credit"), row("output_tax", "Output tax", outputTax, "credit"),
    row("input_tax", "Input tax credit", inputTax, "debit"),
  ];
  const gstSummary = [
    row("taxable_sales", "Taxable sales", Number(revenue.metrics.taxableRevenue), "credit"),
    row("output_tax", "Output tax collected", outputTax, "credit"),
    row("input_tax", "Eligible input tax", inputTax, "debit"),
    row("net_tax", "Net tax payable", netTaxPayable, "credit"),
  ];

  const trendMap = new Map<string, { revenue: number; expenses: number }>();
  for (const item of revenue.byDay ?? []) trendMap.set(item.key, { revenue: Number(item.netRevenue), expenses: trendMap.get(item.key)?.expenses ?? 0 });
  for (const item of expenses.byDay ?? []) {
    const current = trendMap.get(item.key) ?? { revenue: 0, expenses: 0 };
    current.expenses = Number(item.total);
    trendMap.set(item.key, current);
  }
  const trend = [...trendMap.entries()].map(([date, values]) => ({ date, revenue: round(values.revenue), expenses: round(values.expenses), profit: round(values.revenue - values.expenses) })).sort((a, b) => a.date.localeCompare(b.date));
  const periodKey = `${dayKey(range.start)}_${dayKey(range.end)}`;
  return FinancialReportSnapshot.findOneAndUpdate({ periodKey }, { $set: {
    periodStart: range.start, periodEnd: range.end, currency: "INR", metrics, profitAndLoss, cashFlow, balanceSheet,
    trialBalance, gstSummary, trend, generatedAt: new Date(), generatedBy: input.generatedBy ? new Types.ObjectId(input.generatedBy) : null, source: input.source,
  } }, { upsert: true, returnDocument: "after", runValidators: true }).lean();
}

export async function getFinancialReportSummary(days: number) {
  await connectToDatabase();
  const range = getFinancialReportRange(days);
  const periodKey = `${dayKey(range.start)}_${dayKey(range.end)}`;
  return (await FinancialReportSnapshot.findOne({ periodKey }).lean()) ?? buildFinancialReportSnapshot({ days, source: "system" });
}
