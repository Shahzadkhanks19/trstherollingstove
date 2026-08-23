import { Types } from "mongoose";

import { AppError } from "@/lib/errors/AppError";
import { KitchenRoutingRule } from "@/models/KitchenRoutingRule";
import { KitchenStation } from "@/models/KitchenStation";
import { KitchenTicket } from "@/models/KitchenTicket";
import { Order } from "@/models/Order";
import {
  publishKdsQueueUpdated,
  publishKdsTicketCreated,
  publishKdsTicketUpdated,
  publishOrderStatusChanged,
} from "@/services/realtimeEvents.service";


const ORDER_STATUS_RANK: Record<string, number> = {
  placed: 0,
  accepted: 1,
  preparing: 2,
  ready: 3,
  completed: 4,
  cancelled: 5,
  rejected: 5,
};

export async function syncOrderStatusFromKitchen(orderId: string, actorId?: string) {
  const [order, tickets] = await Promise.all([
    Order.findById(orderId),
    KitchenTicket.find({ orderId: new Types.ObjectId(orderId) })
      .select("status")
      .lean(),
  ]);

  if (!order || tickets.length === 0) return;
  if (["completed", "cancelled", "rejected"].includes(order.status)) return;

  const statuses = tickets.map((ticket) => ticket.status);
  let nextStatus: "accepted" | "preparing" | "ready" | "completed" | "cancelled" | null = null;

  if (statuses.every((status) => status === "cancelled")) nextStatus = "cancelled";
  else if (statuses.every((status) => ["served", "cancelled"].includes(status))) nextStatus = "completed";
  else if (statuses.every((status) => ["ready", "served", "cancelled"].includes(status))) nextStatus = "ready";
  else if (statuses.some((status) => status === "preparing")) nextStatus = "preparing";
  else if (statuses.some((status) => status === "accepted")) nextStatus = "accepted";

  if (!nextStatus || nextStatus === order.status) return;

  // Kitchen activity must not accidentally move an order backwards.
  if ((ORDER_STATUS_RANK[nextStatus] ?? -1) < (ORDER_STATUS_RANK[order.status] ?? -1)) return;

  const previousStatus = order.status;
  const now = new Date();
  order.status = nextStatus;
  order.statusHistory.push({
    status: nextStatus,
    note: "Status synchronized from the kitchen display system.",
    changedBy: actorId ? new Types.ObjectId(actorId) : order.updatedBy,
    changedAt: now,
  });

  if (actorId) order.updatedBy = new Types.ObjectId(actorId);
  if (nextStatus === "accepted") order.acceptedAt = order.acceptedAt ?? now;
  if (nextStatus === "preparing") order.preparingAt = order.preparingAt ?? now;
  if (nextStatus === "ready") order.readyAt = order.readyAt ?? now;
  if (nextStatus === "completed") order.completedAt = order.completedAt ?? now;
  if (nextStatus === "cancelled") {
    order.cancelledAt = order.cancelledAt ?? now;
    order.cancellationReason ||= "All kitchen tickets were cancelled.";
  }

  await order.save();

  publishOrderStatusChanged({
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId?.toString(),
    previousStatus,
    status: order.status,
    actorId: actorId ?? order.updatedBy.toString(),
  });
}

type OrderItemInput = {
  orderItemId: string;
  menuItemId: string;
  categoryId?: string | null;
  name: string;
  variantName?: string;
  quantity: number;
  notes?: string;
  modifiers?: Array<{
    name: string;
    value: string;
  }>;
};

type CreateTicketsFromOrderInput = {
  orderId: string;
  orderNumber: string;
  source: "website" | "pos" | "admin";
  actorId: string;
  fulfilmentType: "dine_in" | "pickup";
  tableLabel?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  orderTakerName?: string;
  estimatedReadyAt?: Date | string | null;
  items: OrderItemInput[];
};

export async function createKitchenTicketsFromOrder(
  input: CreateTicketsFromOrderInput,
) {
  const createdAt = new Date();
  const initialStatus = input.source === "pos" ? "preparing" : "queued";
  const rules = await KitchenRoutingRule.find({
    isActive: true,
    $or: [
      {
        menuItemId: {
          $in: input.items.map(
            (item) => new Types.ObjectId(item.menuItemId),
          ),
        },
      },
      {
        categoryId: {
          $in: input.items
            .map((item) => item.categoryId)
            .filter(Boolean)
            .map(
              (id) =>
                new Types.ObjectId(String(id)),
            ),
        },
      },
    ],
  })
    .sort({ priority: -1 })
    .lean();

  let activeStationIds = (
    await KitchenStation.find({
      isActive: true,
    })
      .select("_id")
      .sort({ sortOrder: 1, name: 1 })
      .lean()
  ).map((station) => String(station._id));

  if (activeStationIds.length === 0) {
    const defaultStation = await KitchenStation.findOneAndUpdate(
      { code: "MAIN-KITCHEN" },
      {
        $set: {
          name: "Main Kitchen",
          description: "Default kitchen station created automatically for incoming orders.",
          isActive: true,
          sortOrder: 0,
          targetPreparationMinutes: 15,
          updatedBy: new Types.ObjectId(input.actorId),
        },
        $setOnInsert: {
          code: "MAIN-KITCHEN",
          colorLabel: "",
          createdBy: new Types.ObjectId(input.actorId),
        },
      },
      { upsert: true, returnDocument: "after" },
    ).lean();

    activeStationIds = defaultStation ? [String(defaultStation._id)] : [];
  }

  if (activeStationIds.length === 0) {
    throw new AppError("No active kitchen station is available.", 409);
  }

  const activeStationIdSet = new Set(activeStationIds);
  const fallbackStationId = activeStationIds[0];

  const stationMap = new Map<string, OrderItemInput[]>();

  for (const item of input.items) {
    const matchingRule = rules.find((rule) => {
      const stationIsActive = activeStationIdSet.has(String(rule.stationId));
      if (!stationIsActive) return false;

      const menuMatches =
        rule.menuItemId &&
        String(rule.menuItemId) === item.menuItemId;

      const categoryMatches =
        rule.categoryId &&
        item.categoryId &&
        String(rule.categoryId) === item.categoryId;

      return Boolean(menuMatches || categoryMatches);
    });

    const stationId = matchingRule
      ? String(matchingRule.stationId)
      : fallbackStationId;
    const stationItems = stationMap.get(stationId) ?? [];

    stationItems.push(item);
    stationMap.set(stationId, stationItems);
  }

  const ticketWrites = [...stationMap.entries()]
    .filter(([stationId]) =>
      activeStationIdSet.has(stationId),
    )
    .map(([stationId, items]) =>
      KitchenTicket.updateOne(
        {
          orderId: new Types.ObjectId(input.orderId),
          stationId: new Types.ObjectId(stationId),
        },
        {
          $setOnInsert: {
            orderId: new Types.ObjectId(
              input.orderId,
            ),
            orderNumber: input.orderNumber,
            stationId: new Types.ObjectId(stationId),
            source: input.source,
            fulfilmentType: input.fulfilmentType,
            tableLabel: input.tableLabel ?? "",
            customerName: input.customerName ?? "",
            customerPhone: input.customerPhone ?? "",
            customerEmail: input.customerEmail ?? "",
            orderTakerName: input.orderTakerName ?? "",
            estimatedReadyAt: input.estimatedReadyAt ? new Date(input.estimatedReadyAt) : null,
            status: initialStatus,
            acceptedBy:
              input.source === "pos"
                ? new Types.ObjectId(input.actorId)
                : null,
            acceptedAt: input.source === "pos" ? createdAt : null,
            startedAt: input.source === "pos" ? createdAt : null,
            items: items.map((item) => ({
              orderItemId: new Types.ObjectId(
                item.orderItemId,
              ),
              menuItemId: new Types.ObjectId(
                item.menuItemId,
              ),
              name: item.name,
              variantName:
                item.variantName?.trim() ||
                item.modifiers?.find((modifier) =>
                  /portion|plate|size/i.test(modifier.name) ||
                  /half\s*plate|full\s*plate|\bsmall\b|\bmedium\b|\blarge\b/i.test(modifier.value),
                )?.value ||
                "",
              quantity: item.quantity,
              notes: item.notes ?? "",
              modifiers: item.modifiers ?? [],
              status: initialStatus,
              acceptedAt: input.source === "pos" ? createdAt : null,
              startedAt: input.source === "pos" ? createdAt : null,
              readyAt: null,
              servedAt: null,
              cancelledAt: null,
            })),
          },
        },
        {
          upsert: true,
        },
      ),
    );

  if (ticketWrites.length === 0) {
    return [];
  }

  await Promise.all(ticketWrites);

  const tickets = await KitchenTicket.find({
    orderId: new Types.ObjectId(input.orderId),
  })
    .populate("stationId", "name code")
    .sort({ createdAt: 1 })
    .lean();

  for (const ticket of tickets) {
    const populatedStation = ticket.stationId as unknown as {
      _id?: unknown;
    };

    publishKdsTicketCreated({
      ticketId: String(ticket._id),
      orderId: String(ticket.orderId),
      orderNumber: ticket.orderNumber,
      stationId: String(populatedStation._id ?? ticket.stationId),
      status: ticket.status,
      priority: ticket.priority,
    });
  }

  publishKdsQueueUpdated("tickets.created");

  return tickets;
}

export async function updateKitchenTicketStatus(
  ticketId: string,
  status:
    | "accepted"
    | "preparing"
    | "ready"
    | "served"
    | "cancelled",
  actorId: string,
) {
  const ticket =
    await KitchenTicket.findById(ticketId);

  if (!ticket) {
    throw new AppError(
      "Kitchen ticket not found.",
      404,
    );
  }

  const now = new Date();
  ticket.status = status;

  if (status === "accepted") {
    ticket.acceptedBy =
      new Types.ObjectId(actorId);
    ticket.acceptedAt = now;
  }

  if (status === "preparing") {
    ticket.startedAt =
      ticket.startedAt ?? now;
  }

  if (status === "ready") {
    ticket.readyAt = now;
  }

  if (status === "served") {
    ticket.servedAt = now;
  }

  if (status === "cancelled") {
    ticket.cancelledAt = now;
  }

  for (const item of ticket.items) {
    if (item.status !== "cancelled") {
      item.status = status;
    }
  }

  await ticket.save();

  publishKdsTicketUpdated({
    ticketId: String(ticket._id),
    orderId: String(ticket.orderId),
    orderNumber: ticket.orderNumber,
    stationId: String(ticket.stationId),
    status: ticket.status,
    priority: ticket.priority,
    actorId,
  });
  publishKdsQueueUpdated("ticket.status_updated");
  await syncOrderStatusFromKitchen(String(ticket.orderId), actorId);

  return ticket;
}

export async function recalculateKitchenTicketStatus(
  ticketId: string,
  actorId?: string,
) {
  const ticket =
    await KitchenTicket.findById(ticketId);

  if (!ticket) {
    throw new AppError(
      "Kitchen ticket not found.",
      404,
    );
  }

  const statuses = ticket.items.map(
    (item) => item.status,
  );

  if (
    statuses.every(
      (status) => status === "cancelled",
    )
  ) {
    ticket.status = "cancelled";
    ticket.cancelledAt =
      ticket.cancelledAt ?? new Date();
  } else if (
    statuses.every((status) =>
      ["ready", "served", "cancelled"].includes(
        status,
      ),
    )
  ) {
    ticket.status = statuses.some(
      (status) => status === "served",
    )
      ? "served"
      : "ready";

    if (ticket.status === "ready") {
      ticket.readyAt =
        ticket.readyAt ?? new Date();
    }

    if (ticket.status === "served") {
      ticket.servedAt =
        ticket.servedAt ?? new Date();
    }
  } else if (
    statuses.some(
      (status) => status === "preparing",
    )
  ) {
    ticket.status = "preparing";
    ticket.startedAt =
      ticket.startedAt ?? new Date();
  } else if (
    statuses.some(
      (status) => status === "accepted",
    )
  ) {
    ticket.status = "accepted";
  } else {
    ticket.status = "queued";
  }

  await ticket.save();

  publishKdsTicketUpdated({
    ticketId: String(ticket._id),
    orderId: String(ticket.orderId),
    orderNumber: ticket.orderNumber,
    stationId: String(ticket.stationId),
    status: ticket.status,
    priority: ticket.priority,
  });
  publishKdsQueueUpdated("ticket.items_updated");
  await syncOrderStatusFromKitchen(String(ticket.orderId), actorId);

  return ticket;
}
export async function completeKitchenTicketsForOrder(
  orderId: string,
  actorId: string,
) {
  if (!Types.ObjectId.isValid(orderId)) {
    throw new AppError("Invalid order identifier.", 422);
  }

  const now = new Date();
  const tickets = await KitchenTicket.find({
    orderId: new Types.ObjectId(orderId),
    status: { $nin: ["served", "cancelled"] },
  });

  if (tickets.length === 0) return [];

  for (const ticket of tickets) {
    ticket.status = "served";
    ticket.servedAt = ticket.servedAt ?? now;

    for (const item of ticket.items) {
      if (item.status !== "cancelled") {
        item.status = "served";
        item.servedAt = item.servedAt ?? now;
      }
    }

    await ticket.save();

    publishKdsTicketUpdated({
      ticketId: String(ticket._id),
      orderId: String(ticket.orderId),
      orderNumber: ticket.orderNumber,
      stationId: String(ticket.stationId),
      status: ticket.status,
      priority: ticket.priority,
      actorId,
    });
  }

  publishKdsQueueUpdated("order.completed");
  return tickets;
}

export async function autoCompleteOverdueKitchenTickets(input?: {
  thresholdMinutes?: number;
}) {
  const configuredMinutes = Number(
    input?.thresholdMinutes ??
      process.env.KDS_AUTO_COMPLETE_MINUTES ??
      30,
  );
  const thresholdMinutes = Number.isFinite(configuredMinutes)
    ? Math.min(180, Math.max(5, Math.round(configuredMinutes)))
    : 30;
  const now = new Date();
  const cutoff = new Date(
    now.getTime() - thresholdMinutes * 60 * 1000,
  );

  const candidates = await KitchenTicket.find({
    status: { $nin: ["served", "cancelled"] },
    autoCompletedAt: null,
    $or: [
      { createdFromOrderAt: { $lte: cutoff } },
      {
        createdFromOrderAt: { $in: [null] },
        createdAt: { $lte: cutoff },
      },
      {
        createdFromOrderAt: { $exists: false },
        createdAt: { $lte: cutoff },
      },
    ],
  })
    .select("_id orderId orderNumber stationId status priority items createdFromOrderAt")
    .lean();

  if (candidates.length === 0) {
    return { checked: 0, completedTickets: 0, completedOrders: 0, thresholdMinutes };
  }

  const orderIds = [...new Set(candidates.map((ticket) => String(ticket.orderId)))];
  const eligibleOrders = await Order.find({
    _id: { $in: orderIds.map((id) => new Types.ObjectId(id)) },
    status: { $nin: ["cancelled", "rejected"] },
    paymentStatus: { $ne: "refunded" },
  })
    .select("_id")
    .lean();
  const eligibleOrderIds = new Set(eligibleOrders.map((order) => String(order._id)));

  let completedTickets = 0;
  const touchedOrderIds = new Set<string>();

  for (const candidate of candidates) {
    const orderId = String(candidate.orderId);
    if (!eligibleOrderIds.has(orderId)) continue;

    const claim = await KitchenTicket.findOneAndUpdate(
      {
        _id: candidate._id,
        status: { $nin: ["served", "cancelled"] },
        autoCompletedAt: null,
      },
      {
        $set: {
          status: "served",
          servedAt: now,
          autoCompletedAt: now,
          autoCompletionReason: `Automatically completed after ${thresholdMinutes} minutes without a kitchen status update.`,
          "items.$[active].status": "served",
          "items.$[active].servedAt": now,
        },
      },
      {
        arrayFilters: [{ "active.status": { $ne: "cancelled" } }],
        returnDocument: "after",
      },
    );

    if (!claim) continue;
    completedTickets += 1;
    touchedOrderIds.add(orderId);

    publishKdsTicketUpdated({
      ticketId: String(claim._id),
      orderId,
      orderNumber: claim.orderNumber,
      stationId: String(claim.stationId),
      status: claim.status,
      priority: claim.priority,
    });
  }

  for (const orderId of touchedOrderIds) {
    await syncOrderStatusFromKitchen(orderId);
  }

  if (completedTickets > 0) {
    publishKdsQueueUpdated("tickets.auto_completed");
  }

  return {
    checked: candidates.length,
    completedTickets,
    completedOrders: touchedOrderIds.size,
    thresholdMinutes,
    cutoff,
  };
}

