import {
  publishRealtimeEventSafely,
} from "@/services/realtimePublisher.service";

export function publishDashboardRefresh(
  source: string,
  actorId?: string,
) {
  publishRealtimeEventSafely({
    event: "dashboard.metrics_updated",
    data: {
      source,
    },
    target: {
      roleKeys: [
        "super_admin",
        "admin",
        "manager",
      ],
    },
    ...(actorId ? { actorId } : {}),
  });
}

export function publishOrderCreated(input: {
  orderId: string;
  orderNumber: string;
  customerId?: string;
  status: string;
  paymentStatus: string;
  grandTotal: number;
  orderMode: string;
  actorId: string;
}) {
  publishRealtimeEventSafely({
    event: "order.created",
    entityId: input.orderId,
    actorId: input.actorId,
    data: {
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      ...(input.customerId ? { customerId: input.customerId } : {}),
      status: input.status,
      paymentStatus: input.paymentStatus,
      grandTotal: input.grandTotal,
      orderMode: input.orderMode,
    },
    target: {
      ...(input.customerId ? { userIds: [input.customerId] } : {}),
      roleKeys: [
        "super_admin",
        "admin",
        "manager",
        "cashier",
        "kitchen",
      ],
    },
  });

  publishDashboardRefresh(
    "order.created",
    input.actorId,
  );
}

export function publishReservationCreated(input: {
  reservationId: string;
  reservationNumber: string;
  customerId: string;
  status: string;
  reservationDate: Date;
  startTime: string;
  guestCount: number;
  actorId: string;
}) {
  publishRealtimeEventSafely({
    event: "reservation.created",
    entityId: input.reservationId,
    actorId: input.actorId,
    data: {
      reservationId: input.reservationId,
      reservationNumber:
        input.reservationNumber,
      customerId: input.customerId,
      status: input.status,
      reservationDate:
        input.reservationDate.toISOString(),
      startTime: input.startTime,
      guestCount: input.guestCount,
    },
    target: {
      userIds: [input.customerId],
      roleKeys: [
        "super_admin",
        "admin",
        "manager",
        "cashier",
      ],
    },
  });

  publishDashboardRefresh(
    "reservation.created",
    input.actorId,
  );
}

export function publishReservationStatusChanged(
  input: {
    reservationId: string;
    reservationNumber: string;
    customerId: string;
    status: string;
    note: string;
    actorId: string;
  },
) {
  publishRealtimeEventSafely({
    event: "reservation.status_changed",
    entityId: input.reservationId,
    actorId: input.actorId,
    data: {
      reservationId: input.reservationId,
      reservationNumber:
        input.reservationNumber,
      customerId: input.customerId,
      status: input.status,
      note: input.note,
    },
    target: {
      userIds: [input.customerId],
      roleKeys: [
        "super_admin",
        "admin",
        "manager",
        "cashier",
      ],
    },
  });

  publishDashboardRefresh(
    "reservation.status_changed",
    input.actorId,
  );
}

export function publishNotificationCreated(input: {
  notificationId: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string;
  actorId?: string;
}) {
  publishRealtimeEventSafely({
    event: "notification.created",
    entityId: input.notificationId,
    data: {
      notificationId:
        input.notificationId,
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl,
    },
    target: {
      userIds: [input.recipientId],
    },
    ...(input.actorId
      ? { actorId: input.actorId }
      : {}),
  });
}

export function publishKdsTicketCreated(input: {
  ticketId: string;
  orderId: string;
  orderNumber: string;
  stationId: string;
  status: string;
  priority: string;
}) {
  publishRealtimeEventSafely({
    event: "kds.ticket_created",
    entityId: input.ticketId,
    data: input,
    target: {
      rooms: ["domain:kds"],
    },
  });
}

export function publishKdsTicketUpdated(input: {
  ticketId: string;
  orderId: string;
  orderNumber: string;
  stationId: string;
  status: string;
  priority: string;
  actorId?: string;
}) {
  publishRealtimeEventSafely({
    event:
      input.status === "ready" ||
      input.status === "served" ||
      input.status === "cancelled"
        ? "kds.ticket_completed"
        : "kds.ticket_updated",
    entityId: input.ticketId,
    data: input,
    target: {
      rooms: ["domain:kds"],
    },
    ...(input.actorId ? { actorId: input.actorId } : {}),
  });
}

export function publishKdsQueueUpdated(source: string) {
  publishRealtimeEventSafely({
    event: "kds.queue_updated",
    data: { source },
    target: {
      rooms: ["domain:kds"],
    },
  });
}

export function publishMenuUpdated(input: {
  action: "created" | "updated" | "deleted" | "availability_changed";
  itemId?: string;
  categoryId?: string;
  actorId?: string;
}) {
  publishRealtimeEventSafely({
    event: "menu.updated",
    entityId: input.itemId ?? input.categoryId,
    data: input,
    target: { broadcast: true },
    ...(input.actorId ? { actorId: input.actorId } : {}),
  });
  publishDashboardRefresh(`menu.${input.action}`, input.actorId);
}

export function publishEnquiryEvent(input: {
  action: "created" | "updated";
  enquiryId: string;
  actorId?: string;
  status?: string;
}) {
  publishRealtimeEventSafely({
    event: input.action === "created" ? "enquiry.created" : "enquiry.updated",
    entityId: input.enquiryId,
    data: input,
    target: { rooms: ["domain:enquiries"] },
    ...(input.actorId ? { actorId: input.actorId } : {}),
  });
  publishDashboardRefresh(`enquiry.${input.action}`, input.actorId);
}

export function publishPaymentUpdated(input: {
  paymentId: string;
  orderId?: string;
  status: string;
  actorId?: string;
}) {
  publishRealtimeEventSafely({
    event: "payment.updated",
    entityId: input.paymentId,
    data: input,
    target: { rooms: ["domain:payments", "domain:orders"] },
    ...(input.actorId ? { actorId: input.actorId } : {}),
  });
  publishDashboardRefresh("payment.updated", input.actorId);
}

export function publishContentUpdated(input: {
  contentType: string;
  entityId?: string;
  action: string;
  actorId?: string;
}) {
  publishRealtimeEventSafely({
    event: "content.updated",
    entityId: input.entityId,
    data: input,
    target: { rooms: ["domain:content"] },
    ...(input.actorId ? { actorId: input.actorId } : {}),
  });
}

export function publishOrderStatusChanged(input: {
  orderId: string;
  orderNumber: string;
  customerId?: string;
  previousStatus: string;
  status: string;
  actorId: string;
}) {
  publishRealtimeEventSafely({
    event: input.status === "cancelled" || input.status === "rejected" ? "order.cancelled" : "order.status_changed",
    entityId: input.orderId,
    actorId: input.actorId,
    data: input,
    target: {
      ...(input.customerId ? { userIds: [input.customerId] } : {}),
      roleKeys: ["super_admin", "admin", "manager", "cashier", "kitchen"],
    },
  });
  publishDashboardRefresh("order.status_changed", input.actorId);
}

export function publishReviewUpdated(input: {
  reviewId: string;
  customerId?: string;
  action: "moderated" | "replied";
  status?: string;
  actorId: string;
}) {
  publishRealtimeEventSafely({
    event: "review.updated",
    entityId: input.reviewId,
    actorId: input.actorId,
    data: input,
    target: {
      roleKeys: ["super_admin", "admin", "manager"],
      ...(input.customerId ? { userIds: [input.customerId] } : {}),
    },
  });

  publishDashboardRefresh(`review.${input.action}`, input.actorId);
}

export function publishCustomerUpdated(input: {
  customerId: string;
  action: "updated" | "activated" | "deactivated";
  actorId: string;
}) {
  publishRealtimeEventSafely({
    event: input.action === "deactivated" ? "user.deactivated" : "user.updated",
    entityId: input.customerId,
    actorId: input.actorId,
    data: input,
    target: {
      userIds: [input.customerId],
      roleKeys: ["super_admin", "admin", "manager"],
    },
  });

  publishDashboardRefresh(`customer.${input.action}`, input.actorId);
}

export function publishPosCartRecordChanged(input: {
  recordId: string;
  status: "draft" | "held";
  action: "created" | "updated" | "deleted" | "recalled";
  actorId: string;
}) {
  publishRealtimeEventSafely({
    event: `pos.cart_${input.action}`,
    entityId: input.recordId,
    actorId: input.actorId,
    data: input,
    target: { roleKeys: ["super_admin", "admin", "manager", "cashier"] },
  });
}

export function publishPosCustomerChanged(input: {
  customerId: string;
  action: "created" | "selected";
  actorId: string;
}) {
  publishRealtimeEventSafely({
    event: `pos.customer_${input.action}`,
    entityId: input.customerId,
    actorId: input.actorId,
    data: input,
    target: { roleKeys: ["super_admin", "admin", "manager", "cashier"] },
  });
}
