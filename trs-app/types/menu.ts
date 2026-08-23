export type MenuCategorySlug =
  | "pizzas"
  | "garlic-breads"
  | "chur-chur-naan"
  | "pastas"
  | "fries"
  | "brownies"
  | "mocktails"
  | string;

export type MenuPriceOption = {
  id: string;
  label: string;
  shortLabel?: string;
  price: number;
  compareAtPrice?: number | null;
  isDefault?: boolean;
  isAvailable?: boolean;
};

export type MenuOptionChoice = {
  id: string;
  name: string;
  price: number;
  variantPrices?: Array<{
    variantLabel: string;
    price: number;
  }>;
  description?: string;
  isDefault?: boolean;
  isAvailable?: boolean;
  maxQuantity?: number;
};

export type MenuOptionGroup = {
  id: string;
  name: string;
  code:
    | "crust"
    | "size"
    | "portion"
    | "cooking_instruction"
    | "spice_level"
    | "seasoning"
    | "sweetness"
    | "ice_preference"
    | "extra_cheese"
    | "extra_toppings"
    | "dips"
    | "extra_naan"
    | "sabji_choice"
    | "other";
  selectionType: "single" | "multiple" | "quantity";
  required?: boolean;
  minSelections?: number;
  maxSelections?: number;
  choices: MenuOptionChoice[];
};

export type MenuMedia = {
  id: string;
  url: string;
  alt: string;
  sortOrder?: number;
};

export type MenuReviewSummary = {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown?: Record<"1" | "2" | "3" | "4" | "5", number>;
};

export type MenuItemSummary = {
  id: string;
  slug: string;
  name: string;
  shortDescription?: string;
  category: {
    id: string;
    name: string;
    slug: MenuCategorySlug;
  };
  thumbnail?: MenuMedia | null;
  priceFrom: number;
  compareAtPriceFrom?: number | null;
  pricingOptions?: MenuPriceOption[];
  isVegetarian: boolean;
  isBestseller?: boolean;
  isNew?: boolean;
  isCombo?: boolean;
  comboComponents?: Array<{ menuItemId: string; name: string; variantId?: string | null; variantName?: string; quantity: number; unitPrice: number; isMissing?: boolean }>;
  comboOriginalPrice?: number | null;
  comboSavings?: number | null;
  comboDiscountPercent?: number | null;
  comboOfferType?: "permanent" | "limited";
  comboOfferStartsAt?: string | null;
  comboOfferExpiresAt?: string | null;
  publishComboOnMenuPage?: boolean;
  publishComboOnOffersPage?: boolean;
  comboOffersPageSection?: "permanent" | "todays";
  eligibleTierKeys?: Array<"bronze" | "silver" | "gold" | "platinum">;
  isTodaysSpecialOffer?: boolean;
  todaysSpecialOfferExpiresAt?: string | null;
  isAvailable: boolean;
};

export type MenuCombinationPricing = {
  enabled: boolean;
  modifierGroupId: string | null;
  entries: Array<{
    variantLabel: string;
    optionId: string;
    optionName: string;
    price: number;
  }>;
};

export type MenuMixedNaanOption = {
  menuItemId: string;
  name: string;
  prices: MenuCombinationPricing["entries"];
};

export type MenuItemDetails = MenuItemSummary & {
  description: string;
  ingredients?: string[];
  allergens?: string[];
  nutrition?: {
    calories?: number;
    protein?: number;
    carbohydrates?: number;
    fat?: number;
    servingSize?: string;
  } | null;
  media: MenuMedia[];
  optionGroups: MenuOptionGroup[];
  combinationPricing?: MenuCombinationPricing | null;
  mixedNaanOptions?: MenuMixedNaanOption[];
  pizzaConfiguration?: {
    thinCrustAvailable: boolean;
    thinCrustPriceAdjustment: number;
  } | null;
  reviewSummary?: MenuReviewSummary | null;
  relatedItems?: MenuItemSummary[];
  frequentlyOrderedWith?: MenuItemSummary[];
  preparationNote?: string | null;
  customerNotice?: string | null;
};

export type MenuListResponse = {
  items: MenuItemSummary[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type MenuItemResponse = {
  item: MenuItemDetails;
};

export type AddToCartPayload = {
  itemId: string;
  quantity: number;
  selectedPriceOptionId: string;
  selectedOptions: Array<{
    groupId: string;
    choiceId: string;
    quantity: number;
  }>;
  specialInstructions?: string;
};
