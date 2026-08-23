import { Types } from "mongoose";

import { AppError } from "@/lib/errors/AppError";
import { MenuItem } from "@/models/MenuItem";

export type ComboComponentInput = { menuItemId: string; variantId?: string | null; quantity: number };
export type ResolvedComboComponent = {
  menuItemId: Types.ObjectId;
  variantId: Types.ObjectId | null;
  quantity: number;
  currentName: string;
  currentVariantName: string;
  currentUnitPrice: number;
  isMissing: boolean;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export async function resolveComboComponents(
  components: ComboComponentInput[],
  comboSellingPrice: number,
  comboId?: string,
): Promise<{ components: ResolvedComboComponent[]; originalPrice: number; savings: number; discountPercent: number }> {
  if (components.length < 2) throw new AppError("A combo must contain at least two items.", 400);
  if (components.some((entry) => !Number.isInteger(entry.quantity) || entry.quantity <= 0 || entry.quantity > 50)) {
    throw new AppError("Combo quantities must be whole numbers between 1 and 50.", 400);
  }
  if (comboId && components.some((entry) => entry.menuItemId === comboId)) {
    throw new AppError("A combo cannot contain itself.", 400);
  }

  const keys = components.map((entry) => `${entry.menuItemId}:${entry.variantId ?? ""}`);
  if (new Set(keys).size !== keys.length) {
    throw new AppError("Duplicate item and variant combinations are not allowed in a combo.", 400);
  }

  const itemIds = [...new Set(components.map((entry) => entry.menuItemId))];
  if (itemIds.some((id) => !Types.ObjectId.isValid(id))) throw new AppError("One or more combo item IDs are invalid.", 400);

  const items = await MenuItem.find({ _id: { $in: itemIds }, deletedAt: null, isActive: true, isAvailable: true })
    .select("name basePrice variants categoryId")
    .lean();
  if (items.length !== itemIds.length) throw new AppError("One or more combo items are deleted, inactive or unavailable.", 400);

  const itemMap = new Map(items.map((item) => [item._id.toString(), item]));
  const resolved = components.map((entry) => {
    const item = itemMap.get(entry.menuItemId);
    if (!item) throw new AppError("Combo item is unavailable.", 400);
    let unitPrice = item.basePrice;
    let variantName = "";
    let variantId: Types.ObjectId | null = null;
    const activeVariants = (item.variants ?? []).filter((variant) => variant.isActive);
    if (activeVariants.length > 0) {
      if (!entry.variantId) throw new AppError(`Select a variant for ${item.name}.`, 400);
      const variant = activeVariants.find((candidate) => candidate._id?.toString() === entry.variantId);
      if (!variant) throw new AppError(`The selected variant for ${item.name} is unavailable.`, 400);
      unitPrice = variant.price;
      variantName = variant.name;
      variantId = new Types.ObjectId(entry.variantId);
    } else if (entry.variantId) {
      throw new AppError(`${item.name} does not support variants.`, 400);
    }
    return {
      menuItemId: new Types.ObjectId(entry.menuItemId),
      variantId,
      quantity: entry.quantity,
      currentName: item.name,
      currentVariantName: variantName,
      currentUnitPrice: unitPrice,
      isMissing: false,
    };
  });

  const originalPrice = roundMoney(resolved.reduce((sum, entry) => sum + entry.currentUnitPrice * entry.quantity, 0));
  if (!Number.isFinite(comboSellingPrice) || comboSellingPrice < 0) throw new AppError("Enter a valid combo selling price.", 400);
  if (comboSellingPrice >= originalPrice) throw new AppError("Combo selling price must be lower than the recalculated original price.", 400);
  const savings = roundMoney(originalPrice - comboSellingPrice);
  const discountPercent = roundMoney((savings / originalPrice) * 100);
  return { components: resolved, originalPrice, savings, discountPercent };
}
