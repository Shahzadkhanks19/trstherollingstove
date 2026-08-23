/**
 * Call this once when an order reaches the status at which stock
 * should be consumed. For TRS, this is normally when the order is
 * confirmed or sent to the kitchen.
 *
 * Add an inventoryDeducted boolean on Order in the final integration
 * to guarantee idempotency and prevent duplicate deductions.
 */

import { deductInventoryForOrder } from "@/services/inventory.service";

export async function consumeOrderInventory(order: {
  id: string;
  inventoryDeducted: boolean;
  items: Array<{
    menuItemId: string;
    quantity: number;
  }>;
}, actorId: string) {
  if (order.inventoryDeducted) {
    return [];
  }

  return deductInventoryForOrder({
    orderId: order.id,
    actorId,
    items: order.items,
  });
}
