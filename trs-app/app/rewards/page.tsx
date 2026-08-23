import type { Metadata } from "next";
import { RewardsPageClient } from "@/components/rewards/RewardsPageClient";

export const metadata: Metadata = {
  title: "Rewards",
  description:
    "Earn TRS Coins on eligible orders, spin daily for rewards and redeem coins for food discounts.",
};

export default function RewardsPage() {
  return <RewardsPageClient />;
}
