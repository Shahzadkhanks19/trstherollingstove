import { Types } from "mongoose";

import { AppError } from "@/lib/errors/AppError";
import {
  MIXED_NAAN_GROUP_ID,
  MIXED_NAAN_GROUP_NAME,
  findMixedNaanPrice,
  isFullPortion,
} from "@/lib/mixed-naan";
import {
  isMediumPizzaVariant,
  isThinCrustEnabled,
  thinCrustGroupId,
  thinCrustOptionId,
} from "@/lib/menu-special-config";
import { MenuItem } from "@/models/MenuItem";
import { ModifierGroup } from "@/models/ModifierGroup";
import { POSItem } from "@/models/POSItem";
import type { CreatePosOrderInput, ResolvedPosLine } from "@/services/pos-order.types";
import {
  money,
  normalizeMenuLabel,
  resolveModifiers,
  validateRequiredGroups,
} from "@/services/pos-order.utils";

export async function resolvePosOrderLines(
  input: Pick<CreatePosOrderInput, "items" | "orderMode">,
): Promise<ResolvedPosLine[]> {
  const primaryMenuIds = input.items
    .filter((item) => item.sourceType === "menu")
    .map((item) => item.itemId);
  const mixedNaanMenuIds = input.items.flatMap((item) =>
    item.modifiers
      .filter((modifier) => modifier.groupId === MIXED_NAAN_GROUP_ID)
      .map((modifier) => modifier.optionId),
  );
  const menuIds = [...new Set([...primaryMenuIds, ...mixedNaanMenuIds])];
  const posIds = input.items
    .filter((item) => item.sourceType === "pos")
    .map((item) => item.itemId);
  const menuItemIds = new Set(menuIds);
  const syntheticThinCrustGroupIds = new Set(
    [...menuItemIds].map(thinCrustGroupId),
  );
  const modifierGroupIds = [
    ...new Set(
      input.items
        .flatMap((item) => item.modifiers.map((modifier) => modifier.groupId))
        .filter(
          (groupId) =>
            !syntheticThinCrustGroupIds.has(groupId) &&
            groupId !== MIXED_NAAN_GROUP_ID,
        ),
    ),
  ];

  const [menuItems, posItems, modifierGroups] = await Promise.all([
    MenuItem.find({
      _id: { $in: menuIds },
      isActive: true,
      isAvailable: true,
      deletedAt: null,
    }).lean(),
    POSItem.find({ _id: { $in: posIds }, isActive: true }).lean(),
    ModifierGroup.find({
      _id: { $in: modifierGroupIds },
      isActive: true,
    }).lean(),
  ]);
  const menuMap = new Map(menuItems.map((item) => [String(item._id), item]));
  const posMap = new Map(posItems.map((item) => [String(item._id), item]));
  const groupMap = new Map(
    modifierGroups.map((group) => [String(group._id), group]),
  );

  const orderLines: ResolvedPosLine[] = input.items.map((line) => {
    if (line.sourceType === "menu") {
      const item = menuMap.get(line.itemId);
      if (!item)
        throw new AppError("A selected menu item is no longer available.", 409);
      if (input.orderMode === "dine_in" && item.availableForDineIn === false)
        throw new AppError(`${item.name} is not available for dine-in.`, 409);
      if (input.orderMode === "takeaway" && item.availableForTakeaway === false)
        throw new AppError(`${item.name} is not available for takeaway.`, 409);

      const variant = line.variantId
        ? item.variants.find(
            (entry) => String(entry._id) === line.variantId && entry.isActive,
          )
        : (item.variants.find((entry) => entry.isDefault && entry.isActive) ??
          item.variants.find((entry) => entry.isActive));
      if (line.variantId && !variant)
        throw new AppError(
          `The selected variant for ${item.name} is unavailable.`,
          409,
        );
      const variantName = variant?.name ?? "";
      let baseUnitPrice = money(variant?.price ?? item.basePrice);
      const specialThinCrustGroupId = thinCrustGroupId(line.itemId);
      const specialThinCrustOptionId = thinCrustOptionId(line.itemId);
      const thinCrustSelections = line.modifiers.filter(
        (modifier) => modifier.groupId === specialThinCrustGroupId,
      );
      const mixedNaanSelections = line.modifiers.filter(
        (modifier) => modifier.groupId === MIXED_NAAN_GROUP_ID,
      );
      const regularSelections = line.modifiers.filter(
        (modifier) =>
          modifier.groupId !== specialThinCrustGroupId &&
          modifier.groupId !== MIXED_NAAN_GROUP_ID,
      );

      if (thinCrustSelections.length > 0) {
        const configuration = item.pizzaConfiguration as
          { thinCrustAvailable?: boolean } | undefined;
        if (
          !isThinCrustEnabled(item.name, configuration) ||
          !isMediumPizzaVariant(variantName) ||
          thinCrustSelections.length !== 1 ||
          thinCrustSelections[0]?.optionId !== specialThinCrustOptionId ||
          thinCrustSelections[0]?.quantity !== 1
        ) {
          throw new AppError(
            "Thin Crust is available only for eligible Medium pizzas.",
            422,
          );
        }
      }

      const allowedGroups = new Set(item.modifierGroupIds.map(String));
      const combinationPricing = item.combinationPricing;
      const combinationGroupId = combinationPricing?.enabled
        ? combinationPricing.modifierGroupId?.toString()
        : undefined;
      const combinationSelections = combinationGroupId
        ? regularSelections.filter(
            (selection) => selection.groupId === combinationGroupId,
          )
        : [];
      const standardSelections = combinationGroupId
        ? regularSelections.filter(
            (selection) => selection.groupId !== combinationGroupId,
          )
        : regularSelections;

      const resolvedModifiers = resolveModifiers(
        standardSelections,
        allowedGroups,
        groupMap,
        variantName,
      );

      if (combinationPricing?.enabled) {
        if (
          !combinationGroupId ||
          combinationSelections.length !== 1 ||
          combinationSelections[0]?.quantity !== 1
        ) {
          throw new AppError("Select one platter option.", 422);
        }

        const selectedCombination = combinationSelections[0];
        const entry = (combinationPricing.entries ?? []).find(
          (candidate) =>
            (candidate.optionId?.toString() === selectedCombination.optionId ||
              normalizeMenuLabel(candidate.optionName ?? "") ===
                normalizeMenuLabel(selectedCombination.optionName ?? "")) &&
            normalizeMenuLabel(candidate.variantLabel) ===
              normalizeMenuLabel(variantName),
        );
        if (!entry)
          throw new AppError(
            "The selected platter combination has no configured price.",
            422,
          );

        const group = groupMap.get(combinationGroupId);
        if (!group)
          throw new AppError(
            "The configured platter group is no longer available.",
            409,
          );
        const currentOption = group.options.find(
          (option) =>
            option.isActive &&
            option.isAvailable &&
            (String(option._id) === selectedCombination.optionId ||
              normalizeMenuLabel(option.name) ===
                normalizeMenuLabel(selectedCombination.optionName ?? "") ||
              normalizeMenuLabel(option.name) ===
                normalizeMenuLabel(entry.optionName ?? "")),
        );

        resolvedModifiers.push({
          groupId: group._id,
          groupName: group.name,
          optionId: currentOption?._id ?? new Types.ObjectId(entry.optionId),
          optionName: currentOption?.name ?? entry.optionName,
          unitPrice: money(entry.price),
          quantity: 1,
        });
        baseUnitPrice = 0;
      }

      if (mixedNaanSelections.length > 0) {
        if (!combinationPricing?.enabled || !isFullPortion(variantName)) {
          throw new AppError(
            "A different second naan is available only with a Full Chur Chur Naan platter.",
            422,
          );
        }
        if (
          mixedNaanSelections.length !== 1 ||
          mixedNaanSelections[0]?.quantity !== 1
        ) {
          throw new AppError("Select only one different second naan.", 422);
        }
        const selectedCombination = combinationSelections[0];
        const currentEntry = (combinationPricing.entries ?? []).find(
          (candidate) =>
            candidate.optionId?.toString() === selectedCombination?.optionId &&
            normalizeMenuLabel(candidate.variantLabel) ===
              normalizeMenuLabel(variantName),
        );
        if (!selectedCombination || !currentEntry) {
          throw new AppError(
            "Select the platter sabji before choosing a second naan.",
            422,
          );
        }
        const alternateId = mixedNaanSelections[0].optionId;
        if (alternateId === line.itemId) {
          throw new AppError(
            "Choose a different naan for the second naan.",
            422,
          );
        }
        const alternate = menuMap.get(alternateId);
        if (
          !alternate ||
          String(alternate.categoryId) !== String(item.categoryId) ||
          !alternate.combinationPricing?.enabled
        ) {
          throw new AppError("The selected second naan is unavailable.", 409);
        }
        const alternatePrice = findMixedNaanPrice(
          (alternate.combinationPricing.entries ?? []).map((candidate) => ({
            variantLabel: candidate.variantLabel,
            optionId: candidate.optionId?.toString() ?? "",
            optionName: candidate.optionName,
            price: candidate.price,
          })),
          variantName,
          selectedCombination.optionId,
          currentEntry.optionName,
        );
        if (alternatePrice == null) {
          throw new AppError(
            "The selected second naan has no Full price for this platter.",
            422,
          );
        }
        const adjustment = money(
          Math.max(Number(currentEntry.price), alternatePrice) -
            Number(currentEntry.price),
        );
        resolvedModifiers.push({
          groupId: new Types.ObjectId(MIXED_NAAN_GROUP_ID),
          groupName: MIXED_NAAN_GROUP_NAME,
          optionId: new Types.ObjectId(alternateId),
          optionName: alternate.name,
          unitPrice: adjustment,
          quantity: 1,
        });
      }

      validateRequiredGroups(
        item.modifierGroupIds.map(String),
        resolvedModifiers,
        groupMap,
      );

      if (thinCrustSelections.length === 1) {
        resolvedModifiers.push({
          groupId: new Types.ObjectId(specialThinCrustGroupId),
          groupName: "Crust",
          optionId: new Types.ObjectId(specialThinCrustOptionId),
          optionName: "Thin Crust",
          unitPrice: 0,
          quantity: 1,
        });
      }

      const modifierUnitTotal = resolvedModifiers.reduce(
        (sum, modifier) => sum + modifier.unitPrice * modifier.quantity,
        0,
      );
      const lineUnitPrice = money(baseUnitPrice + modifierUnitTotal);

      return {
        sourceType: "menu",
        menuItemId: item._id,
        posItemId: null,
        categoryId: item.categoryId,
        name: item.name,
        imageUrl: item.imageUrl,
        variantId: variant?._id ?? null,
        variantName: variant?.name ?? "",
        baseUnitPrice,
        modifiers: resolvedModifiers,
        quantity: line.quantity,
        specialInstructions: line.specialInstructions,
        lineUnitPrice,
        lineTotal: money(lineUnitPrice * line.quantity),
        sendToKds: true,
        stationId: null,
      };
    }

    const item = posMap.get(line.itemId);
    if (!item)
      throw new AppError("A selected POS item is no longer available.", 409);
    const customPrice =
      item.allowCustomPrice && typeof line.unitPrice === "number"
        ? line.unitPrice
        : item.sellingPrice;
    const unitPrice = money(customPrice);
    return {
      sourceType: "pos",
      menuItemId: null,
      posItemId: item._id,
      categoryId: null,
      name: item.name,
      imageUrl: item.imageUrl,
      variantId: null,
      variantName: "",
      baseUnitPrice: unitPrice,
      modifiers: [],
      quantity: line.quantity,
      specialInstructions: line.specialInstructions,
      lineUnitPrice: unitPrice,
      lineTotal: money(unitPrice * line.quantity),
      sendToKds: item.sendToKds,
      stationId: item.kitchenStationId ?? null,
    };
  });

  return orderLines;
}
