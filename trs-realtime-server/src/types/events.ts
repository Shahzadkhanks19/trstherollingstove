export const REALTIME_EVENTS = [
  "order.created", "order.updated", "order.status_changed", "order.cancelled", "order.payment_updated",
  "kds.ticket_created", "kds.ticket_updated", "kds.ticket_completed", "kds.queue_updated",
  "pos.shift_opened", "pos.shift_closed", "pos.cash_movement", "pos.order_created",
  "inventory.stock_changed", "inventory.low_stock", "inventory.out_of_stock",
  "reservation.created", "reservation.updated", "reservation.status_changed",
  "notification.created", "notification.read", "notification.deleted",
  "dashboard.metrics_updated", "menu.availability_changed", "menu.updated", "enquiry.created", "enquiry.updated", "payment.updated", "content.updated", "settings.updated",
  "user.updated", "user.deactivated", "review.created", "review.updated"
] as const;

export type RealtimeEventName = (typeof REALTIME_EVENTS)[number];

export type EventEnvelope = {
  id: string;
  event: RealtimeEventName;
  occurredAt: string;
  actorId?: string;
  entityId?: string;
  data: Record<string, unknown>;
};

export type EventTarget = {
  rooms?: string[];
  userIds?: string[];
  roleKeys?: string[];
  broadcast?: boolean;
};

export type PublishRequest = {
  event: RealtimeEventName;
  data: Record<string, unknown>;
  target: EventTarget;
  actorId?: string;
  entityId?: string;
};
