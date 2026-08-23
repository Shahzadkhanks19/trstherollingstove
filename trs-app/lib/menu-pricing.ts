export type VariantModifierPrice = {
  variantLabel: string;
  price: number;
};

function normalizeVariantLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getCanonicalVariantKey(value: string): string {
  const normalized = normalizeVariantLabel(value);
  const words = new Set(normalized.split(" ").filter(Boolean));

  if (words.has("large") || words.has("lrg")) return "large";
  if (words.has("medium") || words.has("med")) return "medium";
  if (
    words.has("regular") ||
    words.has("reg") ||
    words.has("small") ||
    words.has("sm")
  ) {
    return "regular";
  }

  return normalized;
}

export function resolveVariantModifierPrice(
  fixedPrice: number,
  variantPrices: VariantModifierPrice[] | undefined,
  selectedVariantLabel: string | undefined,
): number {
  if (!selectedVariantLabel || !variantPrices?.length) return fixedPrice;

  const selectedKey = getCanonicalVariantKey(selectedVariantLabel);
  const matchingPrice = variantPrices.find(
    (entry) => getCanonicalVariantKey(entry.variantLabel) === selectedKey,
  );

  return matchingPrice?.price ?? fixedPrice;
}
