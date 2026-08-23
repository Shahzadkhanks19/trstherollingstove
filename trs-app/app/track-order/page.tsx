import type { Metadata } from "next";
import { TrackOrderPageClient } from "@/components/track-order/TrackOrderPageClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: "Track Order",
  description:
    "Track your TRS dine-in or takeaway order using your order ID and registered phone number.",
};

export default function TrackOrderPage() {
  return <TrackOrderPageClient />;
}
