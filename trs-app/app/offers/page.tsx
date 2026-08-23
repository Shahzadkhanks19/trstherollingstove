import type { Metadata } from "next";

import { OffersPageClient } from "@/components/offers/OffersPageClient";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getPublicMenuItems } from "@/lib/menu-public-data";
import { getPublicOffers } from "@/services/publicWebsite.service";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { LoyaltyMembership } from "@/models/LoyaltyMembership";

export const metadata: Metadata = {
  title: "Offers",
  description:
    "Explore current TRS combos, limited-time deals, first-order rewards and loyalty benefits.",
};

export const dynamic = "force-dynamic";

async function getCurrentTimestamp(): Promise<number> {
  return Date.now();
}

type RawCoupon = {
  _id?: unknown;
  code?: unknown;
  name?: unknown;
  description?: unknown;
  discountType?: unknown;
  discountValue?: unknown;
  freeMenuItemId?: unknown;
  maxDiscountAmount?: unknown;
  minimumOrderAmount?: unknown;
  startsAt?: unknown;
  expiresAt?: unknown;
  firstOrderOnly?: unknown;
  publicOfferPlacement?: unknown;
};

export default async function OffersPage() {
  await connectToDatabase();

  const [menuItems, rawCoupons, user] = await Promise.all([
    getPublicMenuItems(),
    getPublicOffers(),
    getAuthenticatedUser(),
  ]);
  const membership = user?.roleKey === "customer" ? await LoyaltyMembership.findOne({ customerId: user.id }).select("tierKey").lean() : null;
  const tierKey = (membership?.tierKey ?? "bronze") as "bronze" | "silver" | "gold" | "platinum";
  const now = await getCurrentTimestamp();
  const eligibleCombos = menuItems.filter((item) => {
    if (!item.isCombo || !item.publishComboOnOffersPage || !item.isAvailable) return false;
    if (!(item.eligibleTierKeys?.includes(tierKey) ?? true)) return false;
    if (item.comboOfferStartsAt && new Date(item.comboOfferStartsAt).getTime() > now) return false;
    if (item.comboOfferExpiresAt && new Date(item.comboOfferExpiresAt).getTime() <= now) return false;
    return true;
  });
  const combos = eligibleCombos.filter((item) => item.comboOffersPageSection === "todays");
  const permanentCombos = eligibleCombos.filter((item) => item.comboOffersPageSection !== "todays");

  const freeItemIds = (rawCoupons as RawCoupon[])
    .filter((coupon) => coupon.discountType === "free_item" && coupon.freeMenuItemId)
    .map((coupon) => String(coupon.freeMenuItemId));
  const freeItemNameById = new Map(
    menuItems
      .filter((item) => freeItemIds.includes(item.id))
      .map((item) => [item.id, item.name]),
  );

  const coupons = (rawCoupons as RawCoupon[]).map((coupon) => ({
    id: String(coupon._id ?? coupon.code ?? ""),
    code: String(coupon.code ?? ""),
    name: String(coupon.name ?? coupon.code ?? "TRS Offer"),
    description: String(coupon.description ?? ""),
    discountType:
      coupon.discountType === "fixed"
        ? ("fixed" as const)
        : coupon.discountType === "free_item"
          ? ("free_item" as const)
          : ("percentage" as const),
    freeItemName: coupon.freeMenuItemId
      ? freeItemNameById.get(String(coupon.freeMenuItemId)) ?? "selected menu item"
      : "",
    discountValue: Number(coupon.discountValue ?? 0),
    maxDiscountAmount:
      coupon.maxDiscountAmount == null
        ? null
        : Number(coupon.maxDiscountAmount),
    minimumOrderAmount: Number(coupon.minimumOrderAmount ?? 0),
    startsAt: new Date(String(coupon.startsAt)).toISOString(),
    expiresAt: new Date(String(coupon.expiresAt)).toISOString(),
    firstOrderOnly: Boolean(coupon.firstOrderOnly),
    publicOfferPlacement:
      coupon.publicOfferPlacement === "everyday"
        ? ("everyday" as const)
        : ("permanent" as const),
  }));

  const permanentCoupons = coupons.filter(
    (coupon) => coupon.publicOfferPlacement === "permanent",
  );
  const everydayCoupons = coupons.filter(
    (coupon) => coupon.publicOfferPlacement === "everyday",
  );

  return (
    <OffersPageClient
      combos={combos}
      permanentCombos={permanentCombos}
      permanentCoupons={permanentCoupons}
      everydayCoupons={everydayCoupons}
    />
  );
}
