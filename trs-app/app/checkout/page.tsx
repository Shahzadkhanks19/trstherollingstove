import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutPageClient } from "@/components/checkout/CheckoutPageClient";
import { getPublicOrderingAvailability } from "@/lib/public-ordering";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: "Checkout",
  description: "Complete your same-day TRS order securely with Razorpay.",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const availability = await getPublicOrderingAvailability();
  if (!availability.enabled) redirect("/ordering-coming-soon");
  return <CheckoutPageClient />;
}
