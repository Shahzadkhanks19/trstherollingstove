"use client";

import { useEffect, useState } from "react";
import { flushPosSaleQueue, queuedPosSaleCount } from "@/lib/pos/sale-offline-queue";
import { posCartActions } from "@/lib/pos/cart-store";
import type { PosCartState } from "@/types/pos";
import type { EditingRunningOrder } from "@/components/admin/pos/useRunningOrder";

export function usePosWorkspaceRecovery({
  cart,
  setEditingRunningOrder,
  setStatusMessage,
}: {
  cart: PosCartState;
  setEditingRunningOrder: (order: EditingRunningOrder) => void;
  setStatusMessage: (message: string) => void;
}) {
  const [queuedSales, setQueuedSales] = useState(0);

  useEffect(() => {
    let active = true;
    const updateCount = () => {
      if (active) setQueuedSales(queuedPosSaleCount());
    };
    const sync = async () => {
      const completed = await flushPosSaleQueue();
      if (!active) return;
      updateCount();
      if (completed.length) {
        setStatusMessage(
          `${completed.length} offline sale${completed.length === 1 ? "" : "s"} synced. Open Bill History to print KOT and invoice.`,
        );
      }
    };
    const timer = window.setTimeout(() => {
      updateCount();
      void sync();
    }, 0);
    const interval = window.setInterval(() => void sync(), 30000);
    window.addEventListener("online", sync);
    window.addEventListener("trs-pos-offline-sales-changed", updateCount);
    return () => {
      active = false;
      window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener("online", sync);
      window.removeEventListener("trs-pos-offline-sales-changed", updateCount);
    };
  }, [setStatusMessage]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const runningRaw = window.localStorage.getItem("trs-pos-edit-running-order");
      if (runningRaw) {
        try {
          const parsed = JSON.parse(runningRaw) as EditingRunningOrder;
          if (!parsed.id || !parsed.ticketNumber || !parsed.cart?.lines?.length) {
            throw new Error("Invalid running order edit payload.");
          }
          posCartActions.replace(parsed.cart);
          setEditingRunningOrder(parsed);
          setStatusMessage(
            `${parsed.ticketNumber} loaded for modification. Save changes to regenerate the kitchen KOT.`,
          );
          return;
        } catch {
          window.localStorage.removeItem("trs-pos-edit-running-order");
          setStatusMessage("Unable to load the running order for modification.");
          return;
        }
      }

      const rebillRaw = window.localStorage.getItem("trs-pos-rebill-order");
      if (!rebillRaw) return;
      try {
        const parsed = JSON.parse(rebillRaw) as { cart: PosCartState; orderNumber: string };
        if (!parsed.orderNumber || !parsed.cart?.lines?.length) throw new Error("Invalid rebill payload.");
        posCartActions.replace(parsed.cart);
        window.localStorage.removeItem("trs-pos-rebill-order");
        setStatusMessage(
          `${parsed.orderNumber} copied for correction. Review the cart and complete a new corrected bill; cancel/refund the original from Bill History if required.`,
        );
      } catch {
        window.localStorage.removeItem("trs-pos-rebill-order");
        setStatusMessage("Unable to load the previous order for correction.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [setEditingRunningOrder, setStatusMessage]);

  useEffect(() => {
    if (!cart.lines.length) return;
    const timer = window.setTimeout(async () => {
      try {
        await fetch("/api/v1/pos/cart-records/draft", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cart }),
        });
      } catch {
        // Local storage remains the immediate crash-recovery fallback.
      }
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [cart]);

  return { queuedSales };
}
