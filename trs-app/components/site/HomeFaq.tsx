import Link from "next/link";

import { ArrowIcon } from "@/components/icons/BrandIcons";
import { SectionHeading } from "@/components/ui/SectionHeading";

const faqs = [
  {
    question: "Is The Rolling Stove a restaurant?",
    answer:
      "No. TRS is a premium vegetarian food truck in Jodhpur, focused on freshly prepared pickup and quick-bite experiences.",
  },
  {
    question: "Is the menu completely vegetarian?",
    answer:
      "Yes. The menu is 100% vegetarian, and Jain pizza options are available.",
  },
  {
    question: "Can I order online?",
    answer:
      "Yes. Orders can be placed through supported online channels and direct pickup ordering once the ordering flow is enabled.",
  },
  {
    question: "How do TRS Coins work?",
    answer:
      "Eligible customers earn 5 TRS Coins for every ₹100 spent. Full eligibility, expiry and redemption rules are available in the rewards terms.",
  },
];

export function HomeFaq() {
  return (
    <section className="section faq-section">
      <div className="container faq-layout">
        <div>
          <SectionHeading
            eyebrow="Frequently asked"
            title="Everything you need before you order."
            description="Quick answers about the truck, menu, ordering and TRS Rewards."
          />
          <Link className="text-link" href="/faq">
            View all questions
            <ArrowIcon />
          </Link>
        </div>

        <div className="faq-list">
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
