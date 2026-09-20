"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { PosRunningOrderView, PosTableView } from "@/types/pos-operations";
import {
  PosOperationsModal,
  type OperationDialog,
} from "@/components/admin/pos/PosOperationsModal";
import { PosOperationsWorkspace } from "@/components/admin/pos/PosOperationsWorkspace";
import {
  flushPosMutationQueue,
  posMutation,
  queuedPosMutationCount,
} from "@/lib/pos/offline-queue";
import { readPosPrintSettings } from "@/lib/pos/print-settings";
import { buildInvoicePrintUrl } from "@/lib/pos/print-links";

type ApiResponse<T> = { success: boolean; message: string; data: T };
export function PosOperationsClient({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const [tables, setTables] = useState<PosTableView[]>([]);
  const [orders, setOrders] = useState<PosRunningOrderView[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [operationDialog, setOperationDialog] = useState<OperationDialog>(null);
  const selected = useMemo(
    () => orders.find((order) => order.id === selectedId) ?? orders[0] ?? null,
    [orders, selectedId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tableResponse, orderResponse] = await Promise.all([
        fetch("/api/v1/pos/tables", { cache: "no-store" }),
        fetch("/api/v1/pos/running-orders", { cache: "no-store" }),
      ]);
      const tableJson = (await tableResponse.json()) as ApiResponse<
        PosTableView[]
      >;
      const orderJson = (await orderResponse.json()) as ApiResponse<
        PosRunningOrderView[]
      >;
      if (!tableResponse.ok) throw new Error(tableJson.message);
      if (!orderResponse.ok) throw new Error(orderJson.message);
      setTables(tableJson.data);
      setOrders(orderJson.data);
      setSelectedId((currentId) => currentId || orderJson.data[0]?.id || "");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load POS operations.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const sync = async () => {
      const count = await flushPosMutationQueue();
      if (!active || !count) return;

      setMessage(
        `${count} offline POS action${count === 1 ? "" : "s"} synced.`,
      );
      await load();
    };

    const initialLoadTimer = window.setTimeout(() => {
      if (!active) return;

      void load();
      const queuedCount = queuedPosMutationCount();
      if (queuedCount) {
        setMessage(`${queuedCount} POS action(s) waiting for connection.`);
      }
    }, 0);

    const refreshTimer = window.setInterval(() => {
      void load();
      void sync();
    }, 20000);

    window.addEventListener("online", sync);

    return () => {
      active = false;
      window.clearTimeout(initialLoadTimer);
      window.clearInterval(refreshTimer);
      window.removeEventListener("online", sync);
    };
  }, [load]);

  async function action(
    path: string,
    body: Record<string, unknown>,
    success: string,
  ) {
    setMessage("");
    try {
      const result = await posMutation(path, body);
      if (result.queued) {
        setMessage(
          "Offline: action safely queued and will sync when connection returns.",
        );
        return;
      }
      const response = result.response;
      if (!response) throw new Error("No response received.");
      const json = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok) throw new Error(json.message);
      setMessage(success);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    }
  }

  async function sendToKitchen() {
    if (!selected) return;
    const printSettings = readPosPrintSettings();
    const printWindow = window.open("", "_blank");
    try {
      const response = await fetch(
        `/api/v1/pos/running-orders/${selected.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            cart: selected.cart,
            guestCount: selected.guestCount,
            sendToKitchen: true,
          }),
        },
      );
      const json = (await response.json()) as ApiResponse<{
        kotRevision: { revision: number } | null;
      }>;
      if (!response.ok) throw new Error(json.message);
      const revision =
        json.data.kotRevision?.revision ?? selected.kitchenRevision;
      const query = new URLSearchParams({
        paper: printSettings.kotPaper,
        copies: String(printSettings.kotCopies),
        customer: String(printSettings.showCustomerOnKot),
        prices: String(printSettings.showPricesOnKot),
      });
      if (revision > 0) query.set("revision", String(revision));
      if (printWindow)
        printWindow.location.href = `/api/v1/pos/running-orders/${selected.id}/kot?${query.toString()}`;
      setMessage(
        json.data.kotRevision
          ? `Revision KOT #${revision} printed.`
          : `Latest KOT #${revision} reprinted. No new kitchen changes detected.`,
      );
      await load();
    } catch (error) {
      printWindow?.close();
      setMessage(
        error instanceof Error ? error.message : "Unable to print KOT.",
      );
    }
  }

  async function transfer(tableId: string) {
    if (!selected) return;
    const table = tables.find((entry) => entry.id === tableId);
    if (!table) throw new Error("Select a valid available table.");
    await action(
      `/api/v1/pos/running-orders/${selected.id}/transfer`,
      { tableId: table.id },
      `Transferred to ${table.name}.`,
    );
  }

  async function merge(sourceOrderId: string) {
    if (!selected) return;
    await action(
      `/api/v1/pos/running-orders/${selected.id}/merge`,
      { sourceOrderId },
      "Orders merged.",
    );
  }

  async function split(raw: string) {
    if (!selected) return;
    const lineQuantities: Record<string, number> = {};
    for (const token of raw.split(",")) {
      const [indexText, quantityText] = token.trim().split(":");
      const line = selected.cart.lines[Number(indexText) - 1];
      const quantity = Number(quantityText);
      if (line && Number.isInteger(quantity) && quantity > 0)
        lineQuantities[line.lineId] = quantity;
    }
    if (!Object.keys(lineQuantities).length)
      throw new Error(
        "Enter at least one valid line and quantity, for example 1:1.",
      );
    await action(
      `/api/v1/pos/running-orders/${selected.id}/split`,
      { lineQuantities, targetTableId: null },
      "Order split into a new running ticket.",
    );
  }

  async function voidItem(lineId: string, quantity: number, reason: string) {
    if (!selected || !canManage) return;
    await action(
      `/api/v1/pos/running-orders/${selected.id}/void-item`,
      { lineId, quantity, reason },
      "Item voided and audit event recorded.",
    );
  }

  function duplicateSelectedOrder() {
    if (!selected) return;
    window.localStorage.setItem(
      "trs-pos-rebill-order",
      JSON.stringify({
        cart: selected.cart,
        orderNumber: selected.ticketNumber,
      }),
    );
    router.push("/admin/pos");
  }

  function modifySelectedOrder() {
    if (!selected) return;
    window.localStorage.setItem(
      "trs-pos-edit-running-order",
      JSON.stringify({
        id: selected.id,
        ticketNumber: selected.ticketNumber,
        cart: selected.cart,
        guestCount: selected.guestCount,
      }),
    );
    router.push("/admin/pos");
  }

  async function cancelSelectedOrder(reason: string) {
    if (!selected || !canManage) return;
    await action(
      `/api/v1/pos/running-orders/${selected.id}/cancel`,
      { reason },
      `${selected.ticketNumber} cancelled. Kitchen ticket cancelled and table released.`,
    );
    setSelectedId("");
  }

  async function settle(input: {
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
  }) {
    if (!selected) return;

    // Open the print tab synchronously from the user's click so browsers do not
    // treat the invoice as an async popup after the settlement request finishes.
    const printWindow = window.open("", "_blank");
    setMessage("Settling order...");

    try {
      const response = await fetch(
        `/api/v1/pos/running-orders/${selected.id}/settle`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const json = (await response.json()) as ApiResponse<{
        invoice: { _id: string };
        order: { orderNumber: string };
      }>;
      if (!response.ok) throw new Error(json.message);

      if (printWindow) {
        printWindow.opener = null;
        printWindow.location.href = buildInvoicePrintUrl(json.data.invoice._id);
        setMessage(
          `${json.data.order.orderNumber} settled. Invoice opened for printing.`,
        );
      } else {
        setMessage(
          `${json.data.order.orderNumber} settled. Your browser blocked the invoice print tab; use Bill History to print it.`,
        );
      }

      setSelectedId("");
      await load();
    } catch (error) {
      printWindow?.close();
      throw error;
    }
  }

  async function createTable(input: {
    name: string;
    code: string;
    section: string;
    capacity: number;
  }) {
    if (!canManage) return;
    const response = await fetch("/api/v1/pos/tables", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...input, sortOrder: tables.length }),
    });
    const json = (await response.json()) as ApiResponse<unknown>;
    if (!response.ok) throw new Error(json.message);
    setMessage("Table created.");
    await load();
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-red-700">
            POS Phase 4
          </p>
          <h1 className="text-3xl font-black text-slate-950">
            Tables & running orders
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Live floor, transfers, merge, split, kitchen send, void and
            settlement.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/pos"
            className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
          >
            New order
          </Link>
          {canManage && (
            <button
              onClick={() => setOperationDialog("create-table")}
              className="rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white"
            >
              Add table
            </button>
          )}
        </div>
      </div>
      {message && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          {message}
        </p>
      )}
      <PosOperationsWorkspace
        tables={tables}
        orders={orders}
        selected={selected}
        loading={loading}
        canManage={canManage}
        onRefresh={() => void load()}
        onSelectOrder={setSelectedId}
        onModify={modifySelectedOrder}
        onDuplicate={duplicateSelectedOrder}
        onSendToKitchen={() => void sendToKitchen()}
        onOpenTransfer={() => setOperationDialog("transfer")}
        onOpenMerge={() => setOperationDialog("merge")}
        onOpenSplit={() => setOperationDialog("split")}
        onOpenVoid={() => setOperationDialog("void")}
        onOpenCancel={() => setOperationDialog("cancel-order")}
        onOpenSettle={() => setOperationDialog("settle")}
      />
      <PosOperationsModal
        key={`${operationDialog ?? "closed"}-${selected?.id ?? "none"}`}
        type={operationDialog}
        selected={selected}
        tables={tables}
        orders={orders}
        onClose={() => setOperationDialog(null)}
        onTransfer={transfer}
        onMerge={merge}
        onSplit={split}
        onVoid={voidItem}
        onCancelOrder={cancelSelectedOrder}
        onSettle={settle}
        onCreateTable={createTable}
      />
    </section>
  );
}
