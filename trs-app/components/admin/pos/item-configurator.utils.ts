import { resolveVariantModifierPrice } from "@/lib/menu-pricing";
import type { PosCatalogItem, PosModifierGroup, PosModifierOption, PosSelectedModifier, PosVariant } from "@/types/pos";

export function createDefaultSelections(
  groups: PosModifierGroup[],
): Record<string, Record<string, number>> {
  return groups.reduce<Record<string, Record<string, number>>>(
    (result, group) => {
      const defaults = group.options.filter(
        (option) => option.isDefault && option.isAvailable,
      );
      if (group.selectionType === "single") {
        const first = defaults[0];
        result[group.id] = first ? { [first.id]: 1 } : {};
      } else {
        result[group.id] = Object.fromEntries(
          defaults
            .slice(0, group.maxSelections)
            .map((option) => [option.id, 1]),
        );
      }
      return result;
    },
    {},
  );
}

export function validateModifierSelections(
  groups: PosModifierGroup[],
  selected: Record<string, Record<string, number>>,
): Array<{ groupId: string; message: string }> {
  return groups.flatMap((group) => {
    const count = Object.values(selected[group.id] ?? {}).filter(
      (quantity) => quantity > 0,
    ).length;
    const minimum = Math.max(group.required ? 1 : 0, group.minSelections);
    if (count < minimum) {
      return [
        {
          groupId: group.id,
          message: `Select at least ${minimum} option${minimum === 1 ? "" : "s"}.`,
        },
      ];
    }
    if (count > group.maxSelections) {
      return [
        {
          groupId: group.id,
          message: `Select no more than ${group.maxSelections} options.`,
        },
      ];
    }
    return [];
  });
}

export function buildSelectedModifiers(
  item: PosCatalogItem,
  variant: PosVariant | null,
  selected: Record<string, Record<string, number>>,
): PosSelectedModifier[] {
  return item.modifierGroups.flatMap((group) =>
    group.options.flatMap((option) => {
      const quantity = selected[group.id]?.[option.id] ?? 0;
      if (quantity <= 0) return [];
      return [
        {
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          optionName: option.name,
          quantity,
          unitPrice: resolveModifierPrice(item, group, option, variant),
        },
      ];
    }),
  );
}

export function resolveModifierPrice(
  item: PosCatalogItem,
  group: PosModifierGroup,
  option: PosModifierOption,
  variant: PosVariant | null,
): number {
  if (
    item.combinationPricing?.enabled &&
    item.combinationPricing.modifierGroupId === group.id &&
    variant
  ) {
    const combination = item.combinationPricing.entries.find(
      (entry) =>
        entry.variantLabel === variant.name && entry.optionId === option.id,
    );
    if (combination) return combination.price;
  }
  return resolveVariantModifierPrice(
    option.price,
    option.variantPrices,
    variant?.name,
  );
}

export function selectionHelper(group: PosModifierGroup): string {
  if (group.selectionType === "single") return "Choose one option";
  if (group.selectionType === "quantity")
    return `Choose quantities · up to ${group.maxSelections} option${group.maxSelections === 1 ? "" : "s"}`;
  if (group.minSelections > 0)
    return `Choose ${group.minSelections}–${group.maxSelections} options`;
  return `Choose up to ${group.maxSelections} option${group.maxSelections === 1 ? "" : "s"}`;
}
