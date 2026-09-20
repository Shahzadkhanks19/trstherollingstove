import type { PosRunningOrderView, PosTableView } from "@/types/pos-operations";
import { readPosPrintSettings } from "@/lib/pos/print-settings";
import { buildInvoicePrintUrl } from "@/lib/pos/print-links";
import { posMutation } from "@/lib/pos/offline-queue";

type ApiResponse<T> = { success: boolean; message: string; data: T };

export type PosSettlementInput = {
  paymentMethod: "cash" | "upi" | "split";
  paymentBreakdown: Array<{
    method: "cash" | "upi";
    amount: number;
    reference: string;
  }>;
  amountTendered: number;
  upiReference: string;
  tipAmount: number;
  tipMethod: "none" | "cash" | "upi";
  tipCollection: "none" | "waiter_direct" | "restaurant";
  orderTakerName: string;
};

export type CreatePosTableInput = {
  name: string;
  code: string;
  section: string;
  capacity: number;
};

export async function fetchPosOperationsData() {
  const [tableResponse, orderResponse] = await Promise.all([
    fetch("/api/v1/pos/tables", { cache: "no-store" }),
    fetch("/api/v1/pos/running-orders", { cache: "no-store" }),
  ]);
  const tableJson = (await tableResponse.json()) as ApiResponse<PosTableView[]>;
  const orderJson = (await orderResponse.json()) as ApiResponse<
    PosRunningOrderView[]
  >;

  if (!tableResponse.ok) throw new Error(tableJson.message);
  if (!orderResponse.ok) throw new Error(orderJson.message);

  return { tables: tableJson.data, orders: orderJson.data };
}

export async function sendRunningOrderToKitchen(
  order: PosRunningOrderView,
  printWindow: Window | null,
) {
  const printSettings = readPosPrintSettings();
  const response = await fetch(`/api/v1/pos/running-orders/${order.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      cart: order.cart,
      guestCount: order.guestCount,
      sendToKitchen: true,
    }),
  });
  const json = (await response.json()) as ApiResponse<{
    kotRevision: { revision: number } | null;
  }>;

  if (!response.ok) throw new Error(json.message);

  const revision = json.data.kotRevision?.revision ?? order.kitchenRevision;
  const query = new URLSearchParams({
    paper: printSettings.kotPaper,
    copies: String(printSettings.kotCopies),
    customer: String(printSettings.showCustomerOnKot),
    prices: String(printSettings.showPricesOnKot),
  });

  if (revision > 0) query.set("revision", String(revision));
  if (printWindow) {
    printWindow.location.href = `/api/v1/pos/running-orders/${order.id}/kot?${query.toString()}`;
  }

  return json.data.kotRevision
    ? `Revision KOT #${revision} printed.`
    : `Latest KOT #${revision} reprinted. No new kitchen changes detected.`;
}

export async function settleRunningOrder(
  orderId: string,
  input: PosSettlementInput,
  printWindow: Window | null,
) {
  const response = await fetch(`/api/v1/pos/running-orders/${orderId}/settle`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await response.json()) as ApiResponse<{
    invoice: { _id: string };
    order: { orderNumber: string };
  }>;

  if (!response.ok) throw new Error(json.message);

  if (printWindow) {
    printWindow.opener = null;
    printWindow.location.href = buildInvoicePrintUrl(json.data.invoice._id);
    return `${json.data.order.orderNumber} settled. Invoice opened for printing.`;
  }

  return `${json.data.order.orderNumber} settled. Your browser blocked the invoice print tab; use Bill History to print it.`;
}

export async function createPosTable(
  input: CreatePosTableInput,
  sortOrder: number,
) {
  const response = await fetch("/api/v1/pos/tables", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...input, sortOrder }),
  });
  const json = (await response.json()) as ApiResponse<unknown>;

  if (!response.ok) throw new Error(json.message);
}

export async function runPosOperationMutation(
  path: string,
  body: Record<string, unknown>,
) {
  const result = await posMutation(path, body);
  if (result.queued) return { queued: true as const };

  const response = result.response;
  if (!response) throw new Error("No response received.");

  const json = (await response.json()) as ApiResponse<unknown>;
  if (!response.ok) throw new Error(json.message);

  return { queued: false as const };
}

export function parseSplitLineQuantities(
  order: PosRunningOrderView,
  raw: string,
) {
  const lineQuantities: Record<string, number> = {};

  for (const token of raw.split(",")) {
    const [indexText, quantityText] = token.trim().split(":");
    const line = order.cart.lines[Number(indexText) - 1];
    const quantity = Number(quantityText);

    if (line && Number.isInteger(quantity) && quantity > 0) {
      lineQuantities[line.lineId] = quantity;
    }
  }

  if (!Object.keys(lineQuantities).length) {
    throw new Error(
      "Enter at least one valid line and quantity, for example 1:1.",
    );
  }

  return lineQuantities;
}
