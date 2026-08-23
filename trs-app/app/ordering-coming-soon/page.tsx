import type { Metadata } from "next";
import { PublicOrderingComingSoon } from "@/components/public-ordering/PublicOrderingComingSoon";
import { getPublicOrderingAvailability } from "@/lib/public-ordering";

export const metadata: Metadata = {
  title: "Online Ordering Coming Soon",
  description:
    "The Rolling Stove online ordering is currently being prepared.",
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function OrderingComingSoonPage() {
  const availability =
    await getPublicOrderingAvailability();

  return (
    <PublicOrderingComingSoon
      message={availability.message}
    />
  );
}
