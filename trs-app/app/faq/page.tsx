import type { Metadata } from "next";
import { FAQPageClient } from "@/components/faq/FAQPageClient";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Find answers about TRS orders, takeaway, dine-in, payments, rewards, opening hours, location and customer support.",
};

export default function FAQPage() {
  return <FAQPageClient />;
}
