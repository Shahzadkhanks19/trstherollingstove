"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PosRunningOrderView, PosTableView } from "@/types/pos-operations";
import {
  createPosTable,
  fetchPosOperationsData,
  parseSplitLineQuantities,
  runPosOperationMutation,
  sendRunningOrderToKitchen,
  settleRunningOrder,
  type CreatePosTableInput,
  type PosSettlementInput,
} from "@/components/admin/pos/pos-operations-api";
import {
  flushPosMutationQueue,
  queuedPosMutationCount,
} from "@/lib/pos/offline-queue";

export function usePosOperations(canManage: boolean) {
  const router = useRouter();
  const [tables, setTables] = useState<PosTableView[]>([]);
  const [orders, setOrders] = useState<PosRunningOrderView[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const selected = useMemo(
    () => orders.find((order) => order.id === selectedId) ?? orders[0] ?? null,
    [orders, selectedId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPosOperationsData();
      setTables(data.tables);
      setOrders(data.orders);
      setSelectedId((currentId) => currentId || data.orders[0]?.id || "");
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
      const result = await runPosOperationMutation(path, body);
      if (result.queued) {
        setMessage(
          "Offline: action safely queued and will sync when connection returns.",
        );
        return;
      }

      setMessage(success);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    }
  }

  async function sendToKitchen() {
    if (!selected) return;
    const printWindow = window.open("", "_blank");

    try {
      setMessage(await sendRunningOrderToKitchen(selected, printWindow));
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
    await action(
      `/api/v1/pos/running-orders/${selected.id}/split`,
      {
        lineQuantities: parseSplitLineQuantities(selected, raw),
        targetTableId: null,
      },
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

  async function settle(input: PosSettlementInput) {
    if (!selected) return;

    const printWindow = window.open("", "_blank");
    setMessage("Settling order...");

    try {
      setMessage(await settleRunningOrder(selected.id, input, printWindow));
      setSelectedId("");
      await load();
    } catch (error) {
      printWindow?.close();
      throw error;
    }
  }

  async function createTable(input: CreatePosTableInput) {
    if (!canManage) return;
    await createPosTable(input, tables.length);
    setMessage("Table created.");
    await load();
  }

  return {
    tables,
    orders,
    selected,
    message,
    loading,
    load,
    setSelectedId,
    sendToKitchen,
    transfer,
    merge,
    split,
    voidItem,
    duplicateSelectedOrder,
    modifySelectedOrder,
    cancelSelectedOrder,
    settle,
    createTable,
  };
}
