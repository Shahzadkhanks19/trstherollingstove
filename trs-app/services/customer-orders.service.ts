import { isValidObjectId } from "mongoose";

import { AppError } from "@/lib/errors/AppError";
import { Cart } from "@/models/Cart";
import { Order } from "@/models/Order";
import { getOrCreateCart, recalculateCart, resolveCartLine } from "@/services/cart.service";

const ACTIVE_STATUSES = ["placed", "accepted", "preparing", "ready"] as const;

export async function reorderCustomerOrder(input: {
  customerId: string;
  orderId: string;
}) {
  if (!isValidObjectId(input.orderId)) {
    throw new AppError("Order not found.", 404);
  }

  const order = await Order.findOne({
    _id: input.orderId,
    customerId: input.customerId,
  }).lean();

  if (!order) throw new AppError("Order not found.", 404);
  if (order.status !== "completed") {
    throw new AppError("Only completed orders can be reordered.", 409);
  }

  const cart = await getOrCreateCart(input.customerId);
  let addedItems = 0;
  let unavailableItems = 0;

  for (const item of order.items) {
    if (!item.menuItemId) {
      unavailableItems += item.quantity;
      continue;
    }

    try {
      const line = await resolveCartLine({
        menuItemId: item.menuItemId.toString(),
        variantId: item.variantId?.toString() ?? null,
        modifiers: item.modifiers.map((modifier) => ({
          groupId: modifier.groupId.toString(),
          optionId: modifier.optionId.toString(),
        })),
        quantity: item.quantity,
        specialInstructions: item.specialInstructions,
      });

      const modifierKey = line.modifiers
        .map((entry) => `${entry.groupId.toString()}:${entry.optionId.toString()}`)
        .sort()
        .join("|");

      const existing = cart.items.find((entry) => {
        const existingModifierKey = entry.modifiers
          .map((modifier) => `${modifier.groupId.toString()}:${modifier.optionId.toString()}`)
          .sort()
          .join("|");

        return (
          entry.menuItemId.toString() === line.menuItemId.toString() &&
          (entry.variantId?.toString() ?? "") === (line.variantId?.toString() ?? "") &&
          existingModifierKey === modifierKey &&
          entry.specialInstructions === line.specialInstructions
        );
      });

      if (existing) {
        const nextQuantity = existing.quantity + line.quantity;
        if (nextQuantity > 50) {
          unavailableItems += item.quantity;
          continue;
        }
        existing.quantity = nextQuantity;
        existing.lineTotal = Math.round(existing.lineUnitPrice * nextQuantity * 100) / 100;
      } else {
        cart.items.push(line);
      }

      addedItems += item.quantity;
    } catch {
      unavailableItems += item.quantity;
    }
  }

  if (addedItems === 0) {
    throw new AppError("The items from this order are no longer available.", 409);
  }

  cart.orderMode = order.orderMode;
  cart.tableNumber = order.orderMode === "dine_in" ? order.tableNumber : "";
  cart.requestedPickupAt = null;
  cart.customerNote = "";
  await cart.save();

  const updatedCart = await recalculateCart(input.customerId);
  if (!updatedCart) {
    await Cart.deleteOne({ customerId: input.customerId });
    throw new AppError("Unable to rebuild your cart.", 500);
  }

  return {
    cart: updatedCart,
    addedItems,
    unavailableItems,
  };
}

export function isCustomerOrderActive(status: string) {
  return ACTIVE_STATUSES.includes(status as (typeof ACTIVE_STATUSES)[number]);
}
