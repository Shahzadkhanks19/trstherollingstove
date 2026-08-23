import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Offer terms",
};

const sections = [
  {
    "title": "Eligibility",
    "paragraphs": [
      "Offers may be limited by customer, location, order value, item, date, time, ordering channel or redemption count."
    ]
  },
  {
    "title": "Redemption",
    "paragraphs": [
      "A valid coupon or promotional condition must be applied before checkout. Offers cannot be redeemed after an order is completed."
    ]
  },
  {
    "title": "Combinations",
    "paragraphs": [
      "Offers may not be combined with other coupons, TRS Coins or discounted bundles unless expressly permitted."
    ]
  },
  {
    "title": "Misuse and withdrawal",
    "paragraphs": [
      "TRS may refuse or withdraw an offer in cases of technical error, misuse, duplicate accounts, fraud or circumstances beyond reasonable control."
    ]
  }
];

export default function Page() {
  return (
    <LegalPage
      eyebrow="Offers"
      title="Offer terms"
      intro="These general conditions apply unless a specific TRS offer states otherwise."
      sections={sections}
    />
  );
}
