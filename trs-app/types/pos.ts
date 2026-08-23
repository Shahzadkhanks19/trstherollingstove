export type PosCategory = {
  id: string;
  name: string;
  slug: string;
};

export type PosVariant = {
  id: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  isDefault: boolean;
  isAvailable: boolean;
};

export type PosModifierOption = {
  id: string;
  name: string;
  price: number;
  variantPrices: Array<{ variantLabel: string; price: number }>;
  isDefault: boolean;
  isAvailable: boolean;
  maxQuantity: number;
};

export type PosModifierGroup = {
  id: string;
  name: string;
  selectionType: "single" | "multiple" | "quantity";
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: PosModifierOption[];
};

export type PosCombinationPricing = {
  enabled: boolean;
  modifierGroupId: string | null;
  entries: Array<{
    variantLabel: string;
    optionId: string;
    optionName: string;
    price: number;
  }>;
};

export type PosCatalogItem = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  imageUrl: string;
  categoryId: string;
  categoryName: string;
  price: number;
  compareAtPrice: number | null;
  isAvailable: boolean;
  isFeatured: boolean;
  isBestseller: boolean;
  source: "menu" | "pos";
  variants: PosVariant[];
  modifierGroups: PosModifierGroup[];
  combinationPricing: PosCombinationPricing | null;
  mixedNaanOptions?: Array<{
    menuItemId: string;
    name: string;
    prices: PosCombinationPricing["entries"];
  }>;
  pizzaConfiguration?: { thinCrustAvailable: boolean };
};

export type PosSelectedModifier = {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  quantity: number;
  unitPrice: number;
};

export type PosConfiguredItem = {
  variantId: string | null;
  variantName: string | null;
  basePrice: number;
  modifiers: PosSelectedModifier[];
  specialInstructions: string;
};

export type PosOrderType = "dine_in" | "takeaway";

export type PosSaleType =
  | "customer"
  | "staff_meal"
  | "family_meal"
  | "complimentary"
  | "food_wastage"
  | "kitchen_test";

export type PosInternalConsumption = {
  saleType: PosSaleType;
  referenceId: string | null;
  personName: string;
  reason: string;
  notes: string;
  managerApprovalEmail: string;
  managerApprovalPassword: string;
  managerApprovalReason: string;
};

export type PosCustomer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  isWalkIn: boolean;
};

export type PosDiscountType = "none" | "fixed" | "percentage";
export type PosTaxMode = "exclusive" | "inclusive";

export type PosCartAdjustments = {
  discountType: PosDiscountType;
  discountValue: number;
  discountReason: string;
  packingCharge: number;
  serviceCharge: number;
  additionalCharge: number;
  additionalChargeLabel: string;
  taxRate: number;
  taxMode: PosTaxMode;
};

export type PosCartLine = {
  lineId: string;
  itemId: string;
  source: PosCatalogItem["source"];
  name: string;
  slug: string;
  imageUrl: string;
  categoryName: string;
  basePrice: number;
  unitPrice: number;
  quantity: number;
  note: string;
  variantId: string | null;
  variantName: string | null;
  modifiers: PosSelectedModifier[];
  modifierSignature: string;
};

export type PosCartState = {
  version: 4;
  orderType: PosOrderType;
  internalConsumption: PosInternalConsumption;
  lines: PosCartLine[];
  orderNote: string;
  customer: PosCustomer;
  adjustments: PosCartAdjustments;
};

export type PosCartTotals = {
  itemCount: number;
  distinctItemCount: number;
  subtotal: number;
  discountAmount: number;
  netSubtotal: number;
  packingCharge: number;
  serviceCharge: number;
  additionalCharge: number;
  chargesTotal: number;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
  savings: number;
};
