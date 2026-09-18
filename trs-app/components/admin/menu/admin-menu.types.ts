export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: { page: number; limit: number; total: number; totalPages: number };
};

export type Category = { _id: string; name: string; slug: string; isActive: boolean };
export type ModifierOption = {
  _id?: string;
  name: string;
  price: number;
  isDefault: boolean;
  isActive: boolean;
  isAvailable: boolean;
  maxQuantity: number;
  sortOrder: number;
};
export type ComboComponentForm = {
  menuItemId: string;
  variantId: string;
  quantity: string;
};
export type CombinationPriceForm = {
  variantLabel: string;
  optionId: string;
  optionName: string;
  price: string;
};
export type ModifierGroup = {
  _id: string;
  name: string;
  internalName: string;
  selectionType: "single" | "multiple" | "quantity";
  isRequired: boolean;
  options: ModifierOption[];
  isActive: boolean;
};
export type MenuVariant = {
  _id?: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
};
export type VariantForm = {
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: string;
};
export type MenuItem = {
  _id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: Category | string;
  imageUrl: string;
  basePrice: number;
  compareAtPrice: number | null;
  variants: MenuVariant[];
  modifierGroupIds: Array<ModifierGroup | string>;
  frequentlyOrderedWithIds: Array<MenuItem | string>;
  spiceLevel: "none" | "mild" | "medium" | "hot";
  preparationTimeMinutes: number;
  tags: string[];
  allergens: string[];
  availableForDineIn: boolean;
  availableForTakeaway: boolean;
  isAvailable: boolean;
  isActive: boolean;
  isFeatured: boolean;
  isBestseller: boolean;
  isCombo: boolean;
  comboComponents: Array<{
    menuItemId: MenuItem | string;
    variantId?: string | null;
    quantity: number;
    currentName?: string;
    currentVariantName?: string;
    currentUnitPrice?: number;
    isMissing?: boolean;
  }>;
  comboOriginalPrice?: number | null;
  comboSavings?: number | null;
  comboDiscountPercent?: number | null;
  comboOfferType: "permanent" | "limited";
  comboOfferStartsAt: string | null;
  comboOfferExpiresAt: string | null;
  publishComboOnMenuPage: boolean;
  publishComboOnOffersPage: boolean;
  comboOffersPageSection: "permanent" | "todays";
  eligibleTierKeys: Array<"bronze" | "silver" | "gold" | "platinum">;
  isTodaysSpecialOffer: boolean;
  todaysSpecialOfferStartsAt: string | null;
  todaysSpecialOfferExpiresAt: string | null;
  trackInventory: boolean;
  sortOrder: number;
  updatedAt: string;
  combinationPricing?: {
    enabled: boolean;
    modifierGroupId: string | null;
    entries: Array<{
      variantLabel: string;
      optionId: string;
      optionName: string;
      price: number;
    }>;
  };
  pizzaConfiguration?: {
    thinCrustAvailable: boolean;
    thinCrustPriceAdjustment: number;
  };
};

export type ItemForm = {
  name: string;
  slug: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  imageUrl: string;
  basePrice: string;
  compareAtPrice: string;
  variants: VariantForm[];
  modifierGroupIds: string[];
  frequentlyOrderedWithIds: string[];
  combinationPricing: {
    enabled: boolean;
    modifierGroupId: string;
    entries: CombinationPriceForm[];
  };
  pizzaConfiguration: {
    thinCrustAvailable: boolean;
    thinCrustPriceAdjustment: string;
  };
  spiceLevel: MenuItem["spiceLevel"];
  preparationTimeMinutes: string;
  tags: string;
  allergens: string;
  availableForDineIn: boolean;
  availableForTakeaway: boolean;
  isAvailable: boolean;
  isActive: boolean;
  isFeatured: boolean;
  isBestseller: boolean;
  isCombo: boolean;
  comboComponents: ComboComponentForm[];
  comboOfferType: "permanent" | "limited";
  comboOfferStartsAt: string | null;
  comboOfferExpiresAt: string | null;
  publishComboOnMenuPage: boolean;
  publishComboOnOffersPage: boolean;
  comboOffersPageSection: "permanent" | "todays";
  eligibleTierKeys: Array<"bronze" | "silver" | "gold" | "platinum">;
  isTodaysSpecialOffer: boolean;
  todaysSpecialOfferStartsAt: string;
  trackInventory: boolean;
  sortOrder: string;
};

export const emptyForm: ItemForm = {
  name: "",
  slug: "",
  categoryId: "",
  shortDescription: "",
  description: "",
  imageUrl: "",
  basePrice: "",
  compareAtPrice: "",
  variants: [],
  modifierGroupIds: [],
  frequentlyOrderedWithIds: [],
  combinationPricing: { enabled: false, modifierGroupId: "", entries: [] },
  pizzaConfiguration: {
    thinCrustAvailable: true,
    thinCrustPriceAdjustment: "0",
  },
  spiceLevel: "none",
  preparationTimeMinutes: "15",
  tags: "",
  allergens: "",
  availableForDineIn: true,
  availableForTakeaway: true,
  isAvailable: true,
  isActive: true,
  isFeatured: false,
  isBestseller: false,
  isCombo: false,
  comboComponents: [],
  comboOfferType: "permanent",
  comboOfferStartsAt: "",
  comboOfferExpiresAt: "",
  publishComboOnMenuPage: true,
  publishComboOnOffersPage: false,
  comboOffersPageSection: "permanent",
  eligibleTierKeys: ["bronze", "silver", "gold", "platinum"],
  isTodaysSpecialOffer: false,
  todaysSpecialOfferStartsAt: "",
  trackInventory: false,
  sortOrder: "0",
};

export const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

