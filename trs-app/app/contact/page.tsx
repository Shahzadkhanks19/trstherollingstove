import type { Metadata } from "next";
import { ContactPageClient } from "@/components/contact/ContactPageClient";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact The Rolling Stove at Shastri Circle, Sector-H, Jodhpur. Reach us by phone, WhatsApp, Instagram, Facebook or the contact form.",
};

export default function ContactPage() {
  return <ContactPageClient />;
}
