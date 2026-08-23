"use client";

const STORAGE_KEY = "trs-pos-offline-sales-v1";
const SYNCED_KEY = "trs-pos-synced-sales-v1";

export type QueuedPosSale = {
  operationId: string;
  payload: Record<string, unknown>;
  queuedAt: string;
  attempts: number;
  lastError: string;
};

export type SyncedPosSale = {
  operationId: string;
  orderNumber: string;
  invoiceId: string;
  syncedAt: string;
};

type SaleResponse = {
  success: boolean;
  message: string;
  data?: { order?: { orderNumber?: string }; invoice?: { _id?: string } };
};

function readQueue(): QueuedPosSale[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as QueuedPosSale[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeQueue(queue: QueuedPosSale[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent("trs-pos-offline-sales-changed", { detail: queue.length }));
}

export function queuedPosSaleCount() { return readQueue().length; }

export function queuePosSale(operationId: string, payload: Record<string, unknown>, error = "Network unavailable") {
  const queue = readQueue();
  if (!queue.some((item) => item.operationId === operationId)) {
    queue.push({ operationId, payload, queuedAt: new Date().toISOString(), attempts: 0, lastError: error });
    writeQueue(queue);
  }
}

function recordSynced(sale: SyncedPosSale) {
  try {
    const current = JSON.parse(window.localStorage.getItem(SYNCED_KEY) ?? "[]") as SyncedPosSale[];
    const next = [sale, ...(Array.isArray(current) ? current : []).filter((item) => item.operationId !== sale.operationId)].slice(0, 25);
    window.localStorage.setItem(SYNCED_KEY, JSON.stringify(next));
  } catch { window.localStorage.setItem(SYNCED_KEY, JSON.stringify([sale])); }
}

export async function flushPosSaleQueue(): Promise<SyncedPosSale[]> {
  if (typeof window === "undefined" || !navigator.onLine) return [];
  const queue = readQueue();
  if (!queue.length) return [];
  const remaining: QueuedPosSale[] = [];
  const synced: SyncedPosSale[] = [];

  for (const item of queue) {
    try {
      const response = await fetch("/api/v1/pos/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(item.payload),
      });
      const json = await response.json() as SaleResponse;
      if (!response.ok) {
        // Validation/business failures need cashier attention and must remain queued.
        remaining.push({ ...item, attempts: item.attempts + 1, lastError: json.message || "Sale sync failed." });
        continue;
      }
      const orderNumber = json.data?.order?.orderNumber ?? "POS order";
      const invoiceId = json.data?.invoice?._id ?? "";
      const completed = { operationId: item.operationId, orderNumber, invoiceId, syncedAt: new Date().toISOString() };
      synced.push(completed);
      recordSynced(completed);
    } catch (error) {
      remaining.push({ ...item, attempts: item.attempts + 1, lastError: error instanceof Error ? error.message : "Network unavailable" });
    }
  }
  writeQueue(remaining);
  return synced;
}
