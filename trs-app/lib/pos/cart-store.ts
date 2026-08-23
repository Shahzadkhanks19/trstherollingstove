"use client";

import { useSyncExternalStore } from "react";
import {
  EMPTY_POS_CART,
  POS_CART_STORAGE_KEY,
  addCatalogItemToCart,
  changeCartLineQuantity,
  clearPosCart,
  parseStoredPosCart,
  removeCartLine,
  setCartLineQuantity,
  setOrderNote,
  setCustomer,
  setInternalConsumption,
  setOrderType,
  updateCartLineNote,
  updateCartAdjustments,
} from "@/lib/pos/cart";
import type { PosCartAdjustments, PosCartState, PosCatalogItem, PosCustomer, PosInternalConsumption, PosOrderType } from "@/types/pos";

type Listener = () => void;

let state: PosCartState = EMPTY_POS_CART;
let initialized = false;
const listeners = new Set<Listener>();

function initializeFromStorage() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  state = parseStoredPosCart(window.localStorage.getItem(POS_CART_STORAGE_KEY));
}

function persist(nextState: PosCartState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(POS_CART_STORAGE_KEY, JSON.stringify(nextState));
  } catch {
    // The cart remains usable even when storage is blocked or full.
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(updater: (current: PosCartState) => PosCartState) {
  initializeFromStorage();
  const nextState = updater(state);
  if (nextState === state) return;
  state = nextState;
  persist(state);
  emit();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  initializeFromStorage();
  return state;
}

function getServerSnapshot() {
  return EMPTY_POS_CART;
}

export function usePosCart(): PosCartState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const posCartActions = {
  addItem(item: PosCatalogItem, configuration?: import("@/types/pos").PosConfiguredItem) {
    setState((current) => addCatalogItemToCart(current, item, configuration));
  },
  changeQuantity(lineId: string, change: number) {
    setState((current) => changeCartLineQuantity(current, lineId, change));
  },
  setQuantity(lineId: string, quantity: number) {
    setState((current) => setCartLineQuantity(current, lineId, quantity));
  },
  removeItem(lineId: string) {
    setState((current) => removeCartLine(current, lineId));
  },
  setLineNote(lineId: string, note: string) {
    setState((current) => updateCartLineNote(current, lineId, note));
  },
  setOrderType(orderType: PosOrderType) {
    setState((current) => setOrderType(current, orderType));
  },
  setInternalConsumption(value: PosInternalConsumption) {
    setState((current) => setInternalConsumption(current, value));
  },
  setCustomer(customer: PosCustomer) {
    setState((current) => setCustomer(current, customer));
  },
  setOrderNote(note: string) {
    setState((current) => setOrderNote(current, note));
  },
  updateAdjustments(patch: Partial<PosCartAdjustments>) {
    setState((current) => updateCartAdjustments(current, patch));
  },
  replace(cart: PosCartState) {
    setState(() => parseStoredPosCart(JSON.stringify(cart)));
  },
  clear() {
    setState(clearPosCart);
  },
};
