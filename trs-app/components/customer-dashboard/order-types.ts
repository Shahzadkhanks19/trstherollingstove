export type OrderStatus =
  | "placed"
  | "accepted"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled"
  | "rejected";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type CustomerOrder = {
  _id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  orderMode: "dine_in" | "takeaway";
  tableNumber?: string;
  requestedPickupAt?: string | null;
  estimatedReadyAt?: string | null;
  customerNote?: string;
  cancellationReason?: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  packingCharge?: number;
  serviceCharge?: number;
  additionalCharge?: number;
  additionalChargeLabel?: string;
  grandTotal: number;
  coinsRedeemed?: number;
  coinsEarned?: number;
  itemCount: number;
  createdAt: string;
  acceptedAt?: string | null;
  preparingAt?: string | null;
  readyAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  items: Array<{
    _id: string;
    name: string;
    imageUrl?: string;
    variantName?: string;
    quantity: number;
    lineUnitPrice: number;
    lineTotal: number;
    specialInstructions?: string;
    modifiers: Array<{
      groupName: string;
      optionName: string;
      unitPrice: number;
    }>;
  }>;
  statusHistory: Array<{
    status: OrderStatus;
    note?: string;
    changedAt: string;
  }>;
};

export type OrdersResponse = {
  orders: CustomerOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};
