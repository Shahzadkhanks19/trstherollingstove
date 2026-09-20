import type { CartData } from "@/components/checkout/checkout-utils";

export type CheckoutPricing = {
  subtotal: number;
  hasNonStackableDiscount: boolean;
  tax: number;
  packaging: number;
  applicableCouponDiscount: number;
  coinDiscount: number;
  total: number;
  coinsEarned: number;
};

export function calculateCheckoutPricing(
  cart: CartData | null,
  couponDiscount: number,
  coins: number,
): CheckoutPricing {
  const items = cart?.items ?? [];
  const subtotal = items.reduce(
    (sum, item) => sum + item.lineUnitPrice * item.quantity,
    0,
  );
  const hasNonStackableDiscount = items.some(
    (item) => item.isCombo || item.isDiscountedItem,
  );
  const tax = cart?.taxTotal ?? 0;
  const packaging = 0;
  const applicableCouponDiscount = hasNonStackableDiscount ? 0 : couponDiscount;
  const requestedCoins = hasNonStackableDiscount ? 0 : coins;
  const coinDiscount = Math.min(
    requestedCoins,
    Math.floor(subtotal * 0.5),
    150,
  );
  const total = Math.max(
    subtotal + tax + packaging - applicableCouponDiscount - coinDiscount,
    0,
  );
  const loyaltyEligibleAmount = Math.max(
    0,
    subtotal - applicableCouponDiscount,
  );
  const coinsEarned = Math.floor(loyaltyEligibleAmount / 100) * 5;

  return {
    subtotal,
    hasNonStackableDiscount,
    tax,
    packaging,
    applicableCouponDiscount,
    coinDiscount,
    total,
    coinsEarned,
  };
}
