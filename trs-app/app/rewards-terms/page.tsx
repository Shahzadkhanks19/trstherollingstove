import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Rewards terms",
};

const sections = [
  {
    "title": "Earning TRS Coins",
    "paragraphs": [
      "Eligible customers earn 5 TRS Coins for every ₹100 of qualifying spend unless a different promotional rate is stated.",
      "Coins may be credited only after an order is completed and may exclude taxes, fees, cancelled orders, refunded amounts or selected products."
    ]
  },
  {
    "title": "Using TRS Coins",
    "paragraphs": [
      "TRS Coins may be redeemed only through eligible TRS ordering channels and cannot be exchanged for cash.",
      "Minimum-order, maximum-redemption or product restrictions may apply."
    ]
  },
  {
    "title": "Expiry and adjustments",
    "paragraphs": [
      "TRS Coins may expire according to the validity shown in the customer account or applicable promotion.",
      "TRS may reverse coins earned through cancelled, refunded, duplicated, fraudulent or otherwise ineligible transactions."
    ]
  },
  {
    "title": "Program changes",
    "paragraphs": [
      "TRS may update, pause or end the rewards program with reasonable notice where practical."
    ]
  }
];

export default function Page() {
  return (
    <LegalPage
      eyebrow="TRS Rewards"
      title="Rewards terms"
      intro="These terms apply to TRS Coins, reward balances and related member benefits."
      sections={sections}
    />
  );
}
