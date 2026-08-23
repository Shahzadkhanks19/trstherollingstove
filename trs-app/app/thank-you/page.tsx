import type { Metadata } from "next";
import { PremiumThankYouClient } from "@/components/thank-you/PremiumThankYouClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: "Thank You",
  description: "Thanks for choosing The Rolling Stove. We look forward to serving you again.",
};

export default function ThankYouPage() {
  return <PremiumThankYouClient />;
}
