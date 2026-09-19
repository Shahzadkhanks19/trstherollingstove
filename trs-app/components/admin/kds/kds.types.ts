export type TicketStatus =
  "queued" | "accepted" | "preparing" | "ready" | "served" | "cancelled";
export type TicketPriority = "normal" | "high" | "urgent";
export type FilterKey =
  "all" | "new" | "preparing" | "ready" | "completed" | "priority";
export type RealtimeStatus =
  "connecting" | "connected" | "reconnecting" | "offline" | "unavailable";

export type KitchenTicketItem = {
  _id: string;
  name: string;
  variantName?: string;
  quantity: number;
  notes: string;
  modifiers: Array<{ name: string; value: string }>;
  status: TicketStatus;
};

export type KitchenTicket = {
  _id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  orderTakerName?: string;
  estimatedReadyAt?: string | null;
  fulfilmentType: "dine_in" | "pickup";
  tableLabel: string;
  priority: TicketPriority;
  status: TicketStatus;
  items: KitchenTicketItem[];
  stationId?: {
    _id: string;
    name: string;
    code: string;
    targetPreparationMinutes: number;
  };
  createdFromOrderAt: string;
  createdAt: string;
  startedAt?: string | null;
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type GroupedItem = {
  key: string;
  name: string;
  quantity: number;
  tickets: string[];
  modifiers: string[];
  notes: string[];
};

