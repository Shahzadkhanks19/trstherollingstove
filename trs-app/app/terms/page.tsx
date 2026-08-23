import type { Metadata } from "next";
import { TermsConditionsPage } from "@/components/legal/TermsConditionsPage";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Read the Terms and Conditions governing TRS accounts, online ordering, dine-in, takeaway, payments, coupons, rewards and website use.",
};

export default function TermsPage() {
  return <TermsConditionsPage />;
}
