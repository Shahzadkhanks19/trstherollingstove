export const REALTIME_EVENTS = [
  "order.created",
  "order.updated",
  "order.status_changed",
  "order.cancelled",
  "order.payment_updated",
  "kds.ticket_created",
  "kds.ticket_updated",
  "kds.ticket_completed",
  "kds.queue_updated",
  "pos.shift_opened",
  "pos.shift_closed",
  "pos.cash_movement",
  "pos.order_created",
  "pos.refund_created",
  "pos.order_voided",
  "pos.receipt_printed",
  "pos.offline_sync_completed",
  "pos.shift_reconciled",
  "pos.cart_created",
  "pos.cart_updated",
  "pos.cart_deleted",
  "pos.cart_recalled",
  "pos.customer_created",
  "pos.customer_selected",
  "inventory.stock_changed",
  "inventory.low_stock",
  "inventory.out_of_stock",
  "inventory.alert_created",
  "inventory.alert_updated",
  "inventory.report_completed",
  "inventory.report_cache_invalidated",
  "reservation.created",
  "reservation.updated",
  "reservation.status_changed",
  "notification.created",
  "notification.read",
  "notification.deleted",
  "dashboard.metrics_updated",
  "menu.availability_changed",
  "menu.updated",
  "enquiry.created",
  "enquiry.updated",
  "payment.updated",
  "content.updated",
  "settings.updated",
  "user.updated",
  "user.deactivated",
  "review.created",
  "review.updated",
] as const;

export type RealtimeEventName =
  (typeof REALTIME_EVENTS)[number];

export type RealtimeEventTarget = {
  rooms?: string[];
  userIds?: string[];
  roleKeys?: string[];
  broadcast?: boolean;
};

export type RealtimePublishInput = {
  event: RealtimeEventName;
  data: Record<string, unknown>;
  target: RealtimeEventTarget;
  actorId?: string;
  entityId?: string;
};

export type RealtimePublishResult = {
  delivered: boolean;
  skipped: boolean;
  status?: number;
  eventId?: string;
  reason?: string;
};
