"use client";

import { useState } from "react";
import { posCartActions } from "@/lib/pos/cart-store";
import type { PosCartState } from "@/types/pos";
import type { HeldOrder } from "@/components/admin/pos/HeldOrdersModal";

type ApiResponse<T> = { success: boolean; message: string; data: T };

export function useHeldOrders({
  cart,
  setStatusMessage,
}: {
  cart: PosCartState;
  setStatusMessage: (message: string) => void;
}) {
  const [orders, setOrders] = useState<HeldOrder[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setStatusMessage("");
    try {
      const response = await fetch("/api/v1/pos/cart-records", { cache: "no-store" });
      const json = (await response.json()) as ApiResponse<HeldOrder[]>;
      if (!response.ok) throw new Error(json.message || "Unable to load held orders.");
      setOrders(json.data);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to load held orders.");
    } finally {
      setLoading(false);
    }
  }

  async function show() {
    setOpen(true);
    await load();
  }

  async function hold(title: string) {
    if (!cart.lines.length) return;
    setStatusMessage("Holding order...");
    try {
      const response = await fetch("/api/v1/pos/cart-records", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, cart }),
      });
      const json = (await response.json()) as ApiResponse<{ id: string }>;
      if (!response.ok) throw new Error(json.message || "Unable to hold order.");
      posCartActions.clear();
      setStatusMessage("Order held successfully.");
      await load();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to hold order.");
    }
  }

  async function remove(id: string) {
    try {
      const response = await fetch(`/api/v1/pos/cart-records/${id}`, { method: "DELETE" });
      const json = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok) throw new Error(json.message || "Unable to delete held order.");
      setOrders((current) => current.filter((order) => order.id !== id));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to delete held order.");
    }
  }

  async function recall(order: HeldOrder) {
    posCartActions.replace(order.cart);
    await remove(order.id);
    setOpen(false);
    setStatusMessage(`Recalled ${order.title}.`);
  }

  return { orders, open, loading, setOpen, show, hold, remove, recall };
}
