/**
 * Call this after an order becomes confirmed/paid and is ready
 * to enter kitchen production.
 *
 * Adapt field names to your existing Order model.
 */

import { createKitchenTicketsFromOrder } from "@/services/kds.service";

export async function sendOrderToKitchen(order: {
  id: string;
  orderNumber: string;
  source: "website" | "pos" | "admin";
  actorId: string;
  fulfilmentType: "dine_in" | "pickup";
  tableLabel?: string;
  customerName?: string;
  items: Array<{
    id: string;
    menuItemId: string;
    categoryId?: string | null;
    name: string;
    quantity: number;
    notes?: string;
    modifiers?: Array<{
      name: string;
      value: string;
    }>;
  }>;
}) {
  return createKitchenTicketsFromOrder({
    orderId: order.id,
    orderNumber: order.orderNumber,
    source: order.source,
    actorId: order.actorId,
    fulfilmentType: order.fulfilmentType,
    tableLabel: order.tableLabel,
    customerName: order.customerName,
    items: order.items.map((item) => ({
      orderItemId: item.id,
      menuItemId: item.menuItemId,
      categoryId: item.categoryId,
      name: item.name,
      quantity: item.quantity,
      notes: item.notes,
      modifiers: item.modifiers,
    })),
  });
}
