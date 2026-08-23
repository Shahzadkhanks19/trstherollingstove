export type PizzaConfiguration = {
  thinCrustAvailable?: boolean;
  thinCrustPriceAdjustment?: number;
};

function mutateObjectId(value: string, offset: number): string {
  if (!/^[a-f\d]{24}$/i.test(value)) return value;
  const next = (Number.parseInt(value[0], 16) + offset) % 16;
  return `${next.toString(16)}${value.slice(1)}`;
}

export function thinCrustGroupId(itemId: string): string {
  return mutateObjectId(itemId, 1);
}

export function thinCrustOptionId(itemId: string): string {
  return mutateObjectId(itemId, 2);
}

export function isMediumPizzaVariant(label: string): boolean {
  return label.trim().toLowerCase().includes("medium");
}

export function isThinCrustExcludedPizza(name: string): boolean {
  const normalized = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
  return normalized.includes("cheese burst");
}

export function isThinCrustEnabled(
  itemName: string,
  configuration?: PizzaConfiguration | null,
): boolean {
  if (isThinCrustExcludedPizza(itemName)) return false;
  return configuration?.thinCrustAvailable !== false;
}

export function isAllowedNaanModifierGroup(name: string, internalName = ""): boolean {
  const value = `${name} ${internalName}`.toLowerCase();
  return (
    value.includes("platter") ||
    value.includes("sabji") ||
    value.includes("sabzi") ||
    value.includes("chole") ||
    value.includes("paneer") ||
    value.includes("extra naan")
  );
}
