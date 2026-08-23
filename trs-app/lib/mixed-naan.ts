export const MIXED_NAAN_GROUP_NAME = "Second Naan";
export const MIXED_NAAN_GROUP_ID = "0000000000000000000000a2";

export type MixedNaanPriceEntry = {
  variantLabel: string;
  optionId: string;
  optionName: string;
  price: number;
};

export type MixedNaanOption = {
  menuItemId: string;
  name: string;
  prices: MixedNaanPriceEntry[];
};

export function isFullPortion(value: string): boolean {
  return value.trim().toLowerCase().includes("full");
}

export function canonicalNaanLabel(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function findMixedNaanPrice(
  entries: MixedNaanPriceEntry[],
  variantLabel: string,
  platterOptionId: string,
  platterOptionName?: string,
): number | null {
  const variant = canonicalNaanLabel(variantLabel);
  const platterName = canonicalNaanLabel(platterOptionName ?? "");
  const entry = entries.find((candidate) =>
    canonicalNaanLabel(candidate.variantLabel) === variant &&
    (candidate.optionId === platterOptionId ||
      (platterName && canonicalNaanLabel(candidate.optionName) === platterName)),
  );
  return entry ? Number(entry.price) : null;
}
