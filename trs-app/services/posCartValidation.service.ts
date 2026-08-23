import { Types } from "mongoose";

import { AppError } from "@/lib/errors/AppError";
import type { PosCartState } from "@/types/pos";
import { MenuItem } from "@/models/MenuItem";
import { POSItem } from "@/models/POSItem";
import { User } from "@/models/User";

export async function validatePersistedPosCart(cart: PosCartState) {
  if (!cart.lines.length) throw new AppError("Add at least one item before saving the order.", 422);
  if (cart.lines.length > 200) throw new AppError("A POS order cannot contain more than 200 separate lines.", 422);

  const menuIds = cart.lines.filter((line) => line.source === "menu").map((line) => line.itemId);
  const posIds = cart.lines.filter((line) => line.source === "pos").map((line) => line.itemId);
  if ([...menuIds, ...posIds].some((id) => !Types.ObjectId.isValid(id))) {
    throw new AppError("The cart contains an invalid product reference.", 422);
  }

  const [menuItems, posItems, customer] = await Promise.all([
    menuIds.length ? MenuItem.find({ _id: { $in: menuIds }, deletedAt: null, isActive: true, isAvailable: true }).select("_id").lean() : [],
    posIds.length ? POSItem.find({ _id: { $in: posIds }, isActive: true }).select("_id").lean() : [],
    cart.customer.id
      ? User.findOne({ _id: cart.customer.id, isActive: true }).select("_id").lean()
      : null,
  ]);

  const availableMenuIds = new Set(menuItems.map((item) => String(item._id)));
  const availablePosIds = new Set(posItems.map((item) => String(item._id)));
  const unavailable = cart.lines.find((line) =>
    line.source === "menu" ? !availableMenuIds.has(line.itemId) : !availablePosIds.has(line.itemId),
  );
  if (unavailable) throw new AppError(`${unavailable.name} is no longer available. Remove it before continuing.`, 409);
  if (cart.customer.id && !customer) throw new AppError("The selected customer is no longer active.", 409);

  if (cart.adjustments.discountType !== "none" && !cart.adjustments.discountReason.trim()) {
    throw new AppError("Enter a reason for the applied discount.", 422);
  }
}
