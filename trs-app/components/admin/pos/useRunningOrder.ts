"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { posCartActions } from "@/lib/pos/cart-store";
import { readPosPrintSettings } from "@/lib/pos/print-settings";
import type { PosCartState } from "@/types/pos";
import type { PosTableChoice } from "@/components/admin/pos/PayLaterOrderModal";

type ApiResponse<T> = { success: boolean; message: string; data: T };

export type EditingRunningOrder = {
  id: string;
  ticketNumber: string;
  cart: PosCartState;
  guestCount: number;
};

function kotQuery(revision: number) {
  const settings = readPosPrintSettings();
  return {
    settings,
    query: new URLSearchParams({
      revision: String(revision),
      paper: settings.kotPaper,
      copies: String(settings.kotCopies),
      customer: String(settings.showCustomerOnKot),
      prices: String(settings.showPricesOnKot),
    }),
  };
}

export function useRunningOrder({
  cart,
  setStatusMessage,
}: {
  cart: PosCartState;
  setStatusMessage: (message: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tables, setTables] = useState<PosTableChoice[]>([]);
  const [shiftId, setShiftId] = useState("");
  const [editing, setEditing] = useState<EditingRunningOrder | null>(null);

  function navigateToOperations() {
    window.setTimeout(() => router.push("/admin/pos/operations"), 350);
  }

  async function saveEdit(order: EditingRunningOrder) {
    setStatusMessage("Saving running order changes...");
    const { settings } = kotQuery(1);
    const printWindow = settings.autoPrintKot ? window.open("", "_blank") : null;
    try {
      const response = await fetch(`/api/v1/pos/running-orders/${order.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cart, guestCount: order.guestCount, sendToKitchen: true }),
      });
      const json = (await response.json()) as ApiResponse<{ kotRevision: { revision: number } | null }>;
      if (!response.ok) throw new Error(json.message || "Unable to update the running order.");
      if (printWindow) {
        if (json.data.kotRevision) {
          const { query } = kotQuery(json.data.kotRevision.revision);
          printWindow.location.href = `/api/v1/pos/running-orders/${order.id}/kot?${query.toString()}`;
        } else printWindow.close();
      }
      window.localStorage.removeItem("trs-pos-edit-running-order");
      setEditing(null);
      posCartActions.clear();
      setStatusMessage(json.data.kotRevision
        ? `${order.ticketNumber} updated. Revision KOT #${json.data.kotRevision.revision} contains only kitchen changes.`
        : `${order.ticketNumber} saved. No kitchen changes were detected.`);
      navigateToOperations();
    } catch (error) {
      printWindow?.close();
      setStatusMessage(error instanceof Error ? error.message : "Unable to update the running order.");
    }
  }

  async function begin() {
    if (!cart.lines.length) return;
    if (editing) {
      await saveEdit(editing);
      return;
    }
    setStatusMessage("Loading available tables...");
    try {
      const [shiftResponse, tablesResponse] = await Promise.all([
        fetch("/api/v1/pos/shifts/current", { cache: "no-store" }),
        fetch("/api/v1/pos/tables", { cache: "no-store" }),
      ]);
      const shiftJson = (await shiftResponse.json()) as ApiResponse<{ _id: string } | null>;
      const tablesJson = (await tablesResponse.json()) as ApiResponse<PosTableChoice[]>;
      if (!shiftResponse.ok || !shiftJson.data?._id) throw new Error("Open a POS shift before creating a pay-later order.");
      if (!tablesResponse.ok) throw new Error(tablesJson.message || "Unable to load tables.");
      setShiftId(shiftJson.data._id);
      setTables(tablesJson.data.filter((table) => table.status === "available" || table.status === "reserved"));
      setOpen(true);
      setStatusMessage("");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to open pay-later order.");
    }
  }

  async function create(input: { tableId: string | null; tableName: string; guestCount: number }) {
    const { settings } = kotQuery(1);
    const printWindow = settings.autoPrintKot ? window.open("", "_blank") : null;
    try {
      const response = await fetch("/api/v1/pos/running-orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shiftId, ...input, cart }),
      });
      const json = (await response.json()) as ApiResponse<{
        order: { _id: string; ticketNumber: string };
        kotRevision: { revision: number };
      }>;
      if (!response.ok) throw new Error(json.message || "Unable to open pay-later order.");
      if (printWindow) {
        const { query } = kotQuery(json.data.kotRevision.revision);
        printWindow.location.href = `/api/v1/pos/running-orders/${json.data.order._id}/kot?${query.toString()}`;
      }
      posCartActions.clear();
      setOpen(false);
      setStatusMessage(`${json.data.order.ticketNumber} opened as Pay Later and initial KOT printed.`);
      navigateToOperations();
    } catch (error) {
      printWindow?.close();
      throw error;
    }
  }

  function cancelEdit() {
    window.localStorage.removeItem("trs-pos-edit-running-order");
    setEditing(null);
    posCartActions.clear();
    setStatusMessage("Running order modification cancelled.");
    router.push("/admin/pos/operations");
  }

  return { open, setOpen, tables, editing, setEditing, begin, create, cancelEdit };
}
