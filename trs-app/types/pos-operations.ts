import type { PosCartState, PosCartTotals } from "@/types/pos";

export type PosTableStatus = "available" | "reserved" | "out_of_service";
export type PosRunningOrderStatus = "open" | "sent_to_kitchen" | "partially_paid" | "settled" | "voided";

export type PosTableView = {
  id: string;
  name: string;
  section: string;
  capacity: number;
  status: PosTableStatus | "occupied";
  reservationName: string;
  reservationTime: string | null;
  runningOrderId: string | null;
  elapsedMinutes: number;
  guestCount: number;
  total: number;
};

export type PosRunningOrderView = {
  id: string;
  ticketNumber: string;
  tableId: string | null;
  tableName: string;
  guestCount: number;
  status: PosRunningOrderStatus;
  cart: PosCartState;
  totals: PosCartTotals;
  kitchenSentAt: string | null;
  kitchenRevision: number;
  openedAt: string;
  updatedAt: string;
};
