import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CartPageClient } from "@/components/cart/CartPageClient";
import { getPublicOrderingAvailability } from "@/lib/public-ordering";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: "Your Cart",
  description: "Review your TRS cart and continue to checkout.",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const availability = await getPublicOrderingAvailability();
  if (!availability.enabled) redirect("/ordering-coming-soon");
  return <CartPageClient />;
}
