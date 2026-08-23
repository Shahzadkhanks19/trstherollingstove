import { Types } from "mongoose";

import { AppError } from "@/lib/errors/AppError";
import { isMediumPizzaVariant, isThinCrustEnabled, thinCrustGroupId, thinCrustOptionId } from "@/lib/menu-special-config";
import {
  MIXED_NAAN_GROUP_ID,
  MIXED_NAAN_GROUP_NAME,
  findMixedNaanPrice,
  isFullPortion,
} from "@/lib/mixed-naan";
import { Cart } from "@/models/Cart";
import { MenuItem } from "@/models/MenuItem";
import { ModifierGroup } from "@/models/ModifierGroup";
import { TaxClass } from "@/models/TaxClass";

type SelectedModifierInput = {
  groupId: string;
  optionId: string;
};

type ResolvedCartLine = {
  menuItemId: Types.ObjectId;
  name: string;
  imageUrl: string;
  variantId: Types.ObjectId | null;
  variantName: string;
  baseUnitPrice: number;
  isDiscountedItem: boolean;
  originalUnitPrice: number | null;
  itemDiscountSavings: number | null;
  isCombo: boolean;
  comboId: Types.ObjectId | null;
  comboOriginalPrice: number | null;
  comboSellingPrice: number | null;
  comboSavings: number | null;
  comboItems: Array<{ menuItemId: Types.ObjectId | null; name: string; variantId: Types.ObjectId | null; variantName: string; quantity: number; unitPrice: number }>;
  modifiers: Array<{
    groupId: Types.ObjectId;
    groupName: string;
    optionId: Types.ObjectId;
    optionName: string;
    unitPrice: number;
  }>;
  quantity: number;
  specialInstructions: string;
  lineUnitPrice: number;
  lineTotal: number;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function canonicalVariantLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("small") || normalized.includes("regular")) return "regular";
  if (normalized.includes("medium")) return "medium";
  if (normalized.includes("large")) return "large";
  if (normalized.includes("half")) return "half";
  if (normalized.includes("full")) return "full";
  return normalized;
}

function resolveModifierPrice(
  option: {
    price: number;
    variantPrices?: Array<{ variantLabel: string; price: number }>;
  },
  variantName: string,
): number {
  if (!variantName || !Array.isArray(option.variantPrices)) return option.price;

  const normalizedVariant = canonicalVariantLabel(variantName);
  const matchingPrice = option.variantPrices.find(
    (entry) => canonicalVariantLabel(entry.variantLabel) === normalizedVariant,
  );

  return matchingPrice?.price ?? option.price;
}

export async function resolveCartLine(input: {
  menuItemId: string;
  variantId?: string | null;
  modifiers?: SelectedModifierInput[];
  quantity: number;
  specialInstructions?: string;
}): Promise<ResolvedCartLine> {
  const menuItem = await MenuItem.findOne({
    _id: input.menuItemId,
    deletedAt: null,
    isActive: true,
    isAvailable: true,
  }).lean();

  if (!menuItem) throw new AppError("Menu item is unavailable.", 404);

  let baseUnitPrice = menuItem.basePrice;
  let variantId: Types.ObjectId | null = null;
  let variantName = "";
  let compareAtUnitPrice = menuItem.compareAtPrice == null ? null : Number(menuItem.compareAtPrice);

  const activeVariants = (menuItem.variants ?? []).filter((entry) => entry.isActive);
  if (activeVariants.length > 0 && !input.variantId) {
    throw new AppError("Select an available size or portion.", 400);
  }

  if (input.variantId) {
    const variant = activeVariants.find(
      (entry) => entry._id?.toString() === input.variantId,
    );
    if (!variant) throw new AppError("Selected variant is unavailable.", 400);
    baseUnitPrice = variant.price;
    variantId = new Types.ObjectId(input.variantId);
    variantName = variant.name;
    compareAtUnitPrice = variant.compareAtPrice == null ? null : Number(variant.compareAtPrice);
  }

  const requestedModifiers = input.modifiers ?? [];
  const itemId = menuItem._id.toString();
  const specialThinCrustGroupId = thinCrustGroupId(itemId);
  const specialThinCrustOptionId = thinCrustOptionId(itemId);
  const thinCrustSelections = requestedModifiers.filter(
    (modifier) => modifier.groupId === specialThinCrustGroupId,
  );
  const mixedNaanSelections = requestedModifiers.filter(
    (modifier) => modifier.groupId === MIXED_NAAN_GROUP_ID,
  );
  const standardModifiers = requestedModifiers.filter(
    (modifier) =>
      modifier.groupId !== specialThinCrustGroupId &&
      modifier.groupId !== MIXED_NAAN_GROUP_ID,
  );

  const grouped = new Map<string, string[]>();
  for (const modifier of standardModifiers) {
    const optionIds = grouped.get(modifier.groupId) ?? [];
    optionIds.push(modifier.optionId);
    grouped.set(modifier.groupId, optionIds);
  }

  const resolvedModifiers: ResolvedCartLine["modifiers"] = [];

  if (thinCrustSelections.length > 0) {
    const pizzaConfiguration = menuItem.pizzaConfiguration;
    if (!isThinCrustEnabled(menuItem.name, pizzaConfiguration)) {
      throw new AppError("Thin crust is not available for this pizza.", 400);
    }
    if (!isMediumPizzaVariant(variantName)) {
      throw new AppError("Thin crust is available only with the Medium pizza size.", 400);
    }
    if (
      thinCrustSelections.length !== 1 ||
      thinCrustSelections[0]?.optionId !== specialThinCrustOptionId
    ) {
      throw new AppError("The selected crust option is invalid.", 400);
    }
    resolvedModifiers.push({
      groupId: new Types.ObjectId(specialThinCrustGroupId),
      groupName: "Crust",
      optionId: new Types.ObjectId(specialThinCrustOptionId),
      optionName: "Thin Crust",
      unitPrice: 0,
    });
  }

  const allowedGroupIds = new Set(
    (menuItem.modifierGroupIds ?? []).map((id) => id.toString()),
  );
  const groups = await ModifierGroup.find({
    _id: { $in: [...allowedGroupIds] },
    isActive: true,
  }).lean();

  for (const group of groups) {
    const selectedCount = (grouped.get(group._id.toString()) ?? []).length;
    const minimum = group.isRequired ? Math.max(1, group.minSelections) : group.minSelections;
    if (selectedCount < minimum) {
      throw new AppError(`${group.name} requires at least ${minimum} selection${minimum === 1 ? "" : "s"}.`, 400);
    }
    if (selectedCount > group.maxSelections) {
      throw new AppError(`${group.name} allows at most ${group.maxSelections} selection${group.maxSelections === 1 ? "" : "s"}.`, 400);
    }
  }

  if (grouped.size > 0) {

    for (const groupId of grouped.keys()) {
      if (!allowedGroupIds.has(groupId)) {
        throw new AppError("A selected modifier is not available for this item.", 400);
      }
    }

    for (const [groupId, optionIds] of grouped) {
      const group = groups.find((entry) => entry._id.toString() === groupId);
      if (!group) throw new AppError("Modifier group is unavailable.", 400);

      const uniqueOptionIds = [...new Set(optionIds)];
      if (group.selectionType === "single" && optionIds.length > 1) {
        throw new AppError(`${group.name} allows only one selection.`, 400);
      }
      if (optionIds.length < group.minSelections) {
        throw new AppError(`${group.name} requires more selections.`, 400);
      }
      if (optionIds.length > group.maxSelections) {
        throw new AppError(`${group.name} allows fewer selections.`, 400);
      }

      for (const optionId of uniqueOptionIds) {
        const option = group.options.find(
          (entry) =>
            entry._id?.toString() === optionId &&
            entry.isActive &&
            entry.isAvailable !== false,
        );
        if (!option) throw new AppError("Modifier option is unavailable.", 400);

        const selectedQuantity = optionIds.filter((id) => id === optionId).length;
        const maximumQuantity = option.maxQuantity ?? 1;
        if (selectedQuantity > maximumQuantity) {
          throw new AppError(
            `${option.name} allows a maximum quantity of ${maximumQuantity}.`,
            400,
          );
        }
        if (group.selectionType !== "quantity" && selectedQuantity > 1) {
          throw new AppError(`${option.name} may only be selected once.`, 400);
        }

        for (let index = 0; index < selectedQuantity; index += 1) {
          resolvedModifiers.push({
            groupId: new Types.ObjectId(groupId),
            groupName: group.name,
            optionId: new Types.ObjectId(optionId),
            optionName: option.name,
            unitPrice: resolveModifierPrice(option, variantName),
          });
        }
      }
    }
  }

  const combinationPricing = menuItem.combinationPricing;
  if (combinationPricing?.enabled) {
    const combinationGroupId = combinationPricing.modifierGroupId?.toString();
    if (!combinationGroupId || !allowedGroupIds.has(combinationGroupId)) {
      throw new AppError("Combination pricing is not configured correctly for this item.", 400);
    }
    const selectedCombinationOptions = grouped.get(combinationGroupId) ?? [];
    if (selectedCombinationOptions.length !== 1) {
      throw new AppError("Select one platter sabji option.", 400);
    }
    const selectedOptionId = selectedCombinationOptions[0];
    const normalizedVariant = variantName.trim().toLowerCase();
    const entry = (combinationPricing.entries ?? []).find(
      (candidate) =>
        candidate.optionId?.toString() === selectedOptionId &&
        candidate.variantLabel.trim().toLowerCase() === normalizedVariant,
    );
    if (!entry) {
      throw new AppError("The selected platter combination has no configured price.", 400);
    }
    baseUnitPrice = entry.price;
  }

  if (mixedNaanSelections.length > 0) {
    if (!combinationPricing?.enabled || !isFullPortion(variantName)) {
      throw new AppError(
        "A different second naan is available only with a Full Chur Chur Naan platter.",
        400,
      );
    }
    if (mixedNaanSelections.length !== 1) {
      throw new AppError("Select only one different second naan.", 400);
    }

    const platterGroupId = combinationPricing.modifierGroupId?.toString();
    const selectedPlatterId = platterGroupId
      ? (grouped.get(platterGroupId) ?? [])[0]
      : undefined;
    const currentEntry = (combinationPricing.entries ?? []).find(
      (candidate) =>
        candidate.optionId?.toString() === selectedPlatterId &&
        candidate.variantLabel.trim().toLowerCase() === variantName.trim().toLowerCase(),
    );
    if (!selectedPlatterId || !currentEntry) {
      throw new AppError("Select the platter sabji before choosing a second naan.", 400);
    }

    const alternateId = mixedNaanSelections[0].optionId;
    if (alternateId === itemId) {
      throw new AppError("Choose a different naan for the second naan.", 400);
    }
    const alternate = await MenuItem.findOne({
      _id: alternateId,
      categoryId: menuItem.categoryId,
      deletedAt: null,
      isActive: true,
      isAvailable: true,
      "combinationPricing.enabled": true,
    }).lean();
    if (!alternate?.combinationPricing?.enabled) {
      throw new AppError("The selected second naan is unavailable.", 400);
    }
    const alternatePrice = findMixedNaanPrice(
      (alternate.combinationPricing.entries ?? []).map((candidate) => ({
        variantLabel: candidate.variantLabel,
        optionId: candidate.optionId?.toString() ?? "",
        optionName: candidate.optionName,
        price: candidate.price,
      })),
      variantName,
      selectedPlatterId,
      currentEntry.optionName,
    );
    if (alternatePrice == null) {
      throw new AppError(
        "The selected second naan has no Full price for this platter.",
        400,
      );
    }
    const higherPrice = Math.max(Number(currentEntry.price), alternatePrice);
    const priceDifference = roundMoney(higherPrice - Number(currentEntry.price));
    resolvedModifiers.push({
      groupId: new Types.ObjectId(MIXED_NAAN_GROUP_ID),
      groupName: MIXED_NAAN_GROUP_NAME,
      optionId: new Types.ObjectId(alternateId),
      optionName: alternate.name,
      unitPrice: priceDifference,
    });
  }

  const comboItems = menuItem.isCombo
    ? (menuItem.comboComponents ?? []).map((entry) => ({
        menuItemId: entry.menuItemId ?? null,
        name: entry.currentName || "Missing Item",
        variantId: entry.variantId ?? null,
        variantName: entry.currentVariantName || "",
        quantity: entry.quantity,
        unitPrice: entry.currentUnitPrice,
      }))
    : [];

  const modifierTotal = resolvedModifiers.reduce(
    (sum, modifier) => sum + modifier.unitPrice,
    0,
  );
  const lineUnitPrice = roundMoney(baseUnitPrice + modifierTotal);
  const originalUnitPrice = !menuItem.isCombo && compareAtUnitPrice != null && compareAtUnitPrice > baseUnitPrice
    ? roundMoney(compareAtUnitPrice + modifierTotal)
    : null;
  const isDiscountedItem = originalUnitPrice != null && originalUnitPrice > lineUnitPrice;

  return {
    menuItemId: new Types.ObjectId(input.menuItemId),
    name: menuItem.name,
    imageUrl: menuItem.imageUrl,
    variantId,
    variantName,
    baseUnitPrice,
    isDiscountedItem,
    originalUnitPrice,
    itemDiscountSavings: isDiscountedItem ? roundMoney((originalUnitPrice ?? lineUnitPrice) - lineUnitPrice) : null,
    isCombo: menuItem.isCombo ?? false,
    comboId: menuItem.isCombo ? menuItem._id : null,
    comboOriginalPrice: menuItem.isCombo ? (menuItem.comboOriginalPrice ?? menuItem.compareAtPrice ?? null) : null,
    comboSellingPrice: menuItem.isCombo ? baseUnitPrice : null,
    comboSavings: menuItem.isCombo ? (menuItem.comboSavings ?? null) : null,
    comboItems,
    modifiers: resolvedModifiers,
    quantity: input.quantity,
    specialInstructions: input.specialInstructions ?? "",
    lineUnitPrice,
    lineTotal: roundMoney(lineUnitPrice * input.quantity),
  };
}

export async function recalculateCart(customerId: string) {
  const cart = await Cart.findOne({ customerId });
  if (!cart) return null;

  const taxClassIds = new Set<string>();
  const menuItemIds = cart.items.map((item) => item.menuItemId);
  const menuItems = await MenuItem.find({
    _id: { $in: menuItemIds },
  })
    .select("_id taxClassId")
    .lean();

  for (const item of menuItems) {
    if (item.taxClassId) taxClassIds.add(item.taxClassId.toString());
  }

  const taxClasses = await TaxClass.find({
    _id: { $in: [...taxClassIds] },
    isActive: true,
    deletedAt: null,
  }).lean();

  const subtotal = roundMoney(
    cart.items.reduce((sum, item) => sum + item.lineTotal, 0),
  );

  let taxTotal = 0;
  for (const cartItem of cart.items) {
    const menuItem = menuItems.find(
      (entry) => entry._id.toString() === cartItem.menuItemId.toString(),
    );
    if (!menuItem?.taxClassId) continue;
    const taxClass = taxClasses.find(
      (entry) => entry._id.toString() === menuItem.taxClassId?.toString(),
    );
    if (!taxClass || taxClass.isInclusive) continue;
    taxTotal += cartItem.lineTotal * (taxClass.percentage / 100);
  }

  cart.subtotal = subtotal;
  cart.taxTotal = roundMoney(taxTotal);
  cart.discountTotal = 0;
  cart.grandTotal = roundMoney(subtotal + cart.taxTotal);
  cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  await cart.save();
  return cart;
}

export async function getOrCreateCart(customerId: string) {
  let cart = await Cart.findOne({ customerId });
  if (!cart) cart = await Cart.create({ customerId });
  return cart;
}
