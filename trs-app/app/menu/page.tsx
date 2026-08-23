import type { Metadata } from "next";
import { MenuPageClient } from "@/components/menu/MenuPageClient";
import { getPublicMenuItems } from "@/lib/menu-public-data";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { LoyaltyMembership } from "@/models/LoyaltyMembership";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Explore The Rolling Stove's vegetarian pizzas, chur-chur naan, pastas, garlic breads, fries, brownies and mocktails.",
};

export const dynamic = "force-dynamic";

async function getCurrentTimestamp(): Promise<number> {
  return Date.now();
}

export default async function MenuPage() {
  const [items, user] = await Promise.all([getPublicMenuItems(), getAuthenticatedUser()]);
  await connectToDatabase();
  const membership = user?.roleKey === "customer" ? await LoyaltyMembership.findOne({ customerId: user.id }).select("tierKey").lean() : null;
  const tierKey = (membership?.tierKey ?? "bronze") as "bronze" | "silver" | "gold" | "platinum";
  const now = await getCurrentTimestamp();
  const visibleItems = items.filter((item) => {
    if (!item.isCombo) return true;
    const eligible = item.eligibleTierKeys?.includes(tierKey) ?? true;
    if (!eligible || item.publishComboOnMenuPage === false) return false;
    if (item.comboOfferType === "limited") {
      if (item.comboOfferStartsAt && new Date(item.comboOfferStartsAt).getTime() > now) return false;
      if (item.comboOfferExpiresAt && new Date(item.comboOfferExpiresAt).getTime() <= now) return false;
    }
    return true;
  });

  return <MenuPageClient items={visibleItems} />;
}
