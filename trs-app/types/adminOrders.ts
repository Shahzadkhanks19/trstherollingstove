export type AdminOrderStatus =
  | "placed"
  | "accepted"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled"
  | "rejected";

export type AdminPaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type AdminPaymentMethod = "cash" | "upi" | "card" | "online" | "split";
export type AdminOrderMode = "dine_in" | "takeaway";

export type AdminOrderModifier = {
  groupName: string;
  optionName: string;
  unitPrice: number;
};

export type AdminOrderItem = {
  _id: string;
  name: string;
  imageUrl?: string;
  variantName?: string;
  baseUnitPrice: number;
  modifiers: AdminOrderModifier[];
  quantity: number;
  specialInstructions?: string;
  lineUnitPrice: number;
  lineTotal: number;
};

export type AdminOrderHistoryItem = {
  status: AdminOrderStatus;
  note?: string;
  changedAt: string;
};

export type AdminOrder = {
  _id: string;
  orderNumber: string;
  customerSnapshot: { name: string; phone?: string; email?: string };
  items: AdminOrderItem[];
  orderMode: AdminOrderMode;
  tableNumber?: string;
  requestedPickupAt?: string | null;
  customerNote?: string;
  status: AdminOrderStatus;
  statusHistory: AdminOrderHistoryItem[];
  paymentStatus: AdminPaymentStatus;
  paymentMethod: AdminPaymentMethod;
  paymentBreakdown?: Array<{ method: "cash" | "upi" | "card" | "online"; amount: number; reference?: string }>;
  waivedAmount?: number;
  waivedReason?: string;
  tipAmount?: number;
  tipMethod?: "none" | "cash" | "upi";
  tipCollection?: "none" | "waiter_direct" | "restaurant";
  orderTakerName?: string;
  couponCode?: string;
  couponDiscount: number;
  coinsRedeemed: number;
  coinDiscount: number;
  coinsEarned: number;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  itemCount: number;
  estimatedReadyAt?: string | null;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  isRunningOrder?: boolean;
  runningOrderId?: string;
};

export type AdminOrderListPayload = {
  orders: AdminOrder[];
  pagination: { page: number; limit: number; total: number; pages: number };
  statusCounts: Record<string, number>;
};
