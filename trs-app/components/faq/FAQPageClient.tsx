"use client";

import { CmsHeroMedia } from "@/components/site/CmsHeroMedia";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faBagShopping,
  faClock,
  faCoins,
  faEnvelope,
  faLocationDot,
  faMinus,
  faPhone,
  faPlus,
  faQuestion,
  faReceipt,
  faShieldHeart,
  faStore,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import Link from "next/link";
import { useRef, useState } from "react";
import { MediaPlaceholder } from "@/components/site/MediaPlaceholder";

type FAQItem = {
  question: string;
  answer: string;
};

type FAQSection = {
  id: string;
  title: string;
  icon: IconDefinition;
  items: FAQItem[];
};

type QuickInfoItem = {
  icon: IconDefinition;
  title: string;
  text: string;
};

const faqSections: FAQSection[] = [
  {
    id: "orders",
    title: "Orders & Service",
    icon: faBagShopping,
    items: [
      {
        question: "Do you offer home delivery?",
        answer:
          "TRS currently focuses on dine-in and takeaway. Online orders can be placed for collection, but direct home delivery is not offered through the website.",
      },
      {
        question: "How can I place an order?",
        answer:
          "Open the Menu page, choose your items, customise them where available, add them to your cart and continue to checkout. You can then select dine-in or takeaway.",
      },
      {
        question: "How long does an order take to prepare?",
        answer:
          "Preparation time depends on the items ordered and the current rush. An estimated time is shown during checkout and on the Track Order page.",
      },
      {
        question: "Can I modify or cancel my order after placing it?",
        answer:
          "Contact TRS immediately by phone or WhatsApp. Changes are possible only before preparation has started. Once preparation begins, cancellation or modification may not be available.",
      },
      {
        question: "How do I track my order?",
        answer:
          "Use the Track Order page and enter your order ID with the registered mobile number. The status automatically adapts for dine-in and takeaway orders.",
      },
    ],
  },
  {
    id: "payments",
    title: "Payments, Coupons & TRS Coins",
    icon: faReceipt,
    items: [
      {
        question: "Which payment methods are accepted?",
        answer:
          "Available payment methods may include UPI, cards and other supported online options. The final list is shown securely during checkout.",
      },
      {
        question: "What are TRS Coins?",
        answer:
          "TRS Coins are loyalty rewards earned on eligible purchases. Customers earn 5 coins for every eligible ₹100 spent, subject to the current rewards rules.",
      },
      {
        question: "How can I redeem TRS Coins?",
        answer:
          "Eligible coins can be redeemed from your account or during checkout when a qualifying reward is available. Minimum order values and redemption limits may apply.",
      },
      {
        question: "Do TRS Coins expire?",
        answer:
          "Yes, coins may have an expiry date. Your current balance and any upcoming expiry information should be visible in the Rewards section of your account.",
      },
      {
        question: "Can I use a coupon and TRS Coins together?",
        answer:
          "This depends on the selected offer. Some coupons can be combined with coins, while others cannot. The checkout page will show whether the combination is eligible.",
      },
      {
        question: "Why was my coupon not accepted?",
        answer:
          "The coupon may be expired, limited to selected items, restricted to new users or require a minimum order value. Check the coupon terms shown on the Offers page.",
      },
    ],
  },
  {
    id: "account",
    title: "Account & Order History",
    icon: faCoins,
    items: [
      {
        question: "Do I need an account to place an order?",
        answer:
          "Guest checkout may be available, but creating an account makes it easier to track orders, earn TRS Coins, access rewards and view your order history.",
      },
      {
        question: "What should I do if I forget my password?",
        answer:
          "Use the Forgot Password option on the Login page and follow the verification steps sent to your registered email or mobile number.",
      },
      {
        question: "Where can I see my previous orders?",
        answer:
          "Logged-in customers can view their previous orders inside the customer dashboard or order history section.",
      },
      {
        question: "Can I change my registered phone number or email?",
        answer:
          "Profile details can be updated from account settings. Some changes may require verification for account security.",
      },
    ],
  },
  {
    id: "general",
    title: "Location, Timings & General Information",
    icon: faQuestion,
    items: [
      {
        question: "What are your opening hours?",
        answer:
          "TRS is open daily from 5:30 PM to 11:30 PM. Timings may occasionally change on special days, so check the website or social pages before visiting.",
      },
      {
        question: "Where is The Rolling Stove located?",
        answer:
          "TRS is located at Shastri Circle, Sector-H, Jodhpur, Rajasthan 342003. Use the Contact page for the map and directions.",
      },
      {
        question: "Is seating guaranteed?",
        answer:
          "No. TRS is a food truck with limited seating, and seats are available on a first-come, first-served basis, especially during busy evenings and weekends.",
      },
      {
        question: "Do you accept reservations?",
        answer:
          "No. TRS does not currently accept seating reservations because seating is limited and works on a first-come, first-served basis.",
      },
      {
        question: "Is the menu completely vegetarian?",
        answer:
          "Yes. TRS serves a 100% vegetarian menu.",
      },
      {
        question: "Can I request arrangements for birthdays or small celebrations?",
        answer:
          "You can contact the TRS team in advance to discuss a request, but decorations, reserved seating and special arrangements are not guaranteed and depend on operational feasibility.",
      },
      {
        question: "How can I share feedback or report an issue?",
        answer:
          "Use the Contact page, WhatsApp TRS or call the team. For order-related issues, keep your order ID ready so the team can help faster.",
      },
    ],
  },
];

const quickInfo: QuickInfoItem[] = [
  {
    icon: faClock,
    title: "Opening Hours",
    text: "Daily · 5:30 PM – 11:30 PM",
  },
  {
    icon: faLocationDot,
    title: "Location",
    text: "Shastri Circle, Sector-H, Jodhpur",
  },
  {
    icon: faPhone,
    title: "Call TRS",
    text: "+91 91666 94786",
  },
  {
    icon: faUtensils,
    title: "Cuisine",
    text: "100% Vegetarian",
  },
];

const trustItems: QuickInfoItem[] = [
  {
    icon: faUtensils,
    title: "100% Vegetarian",
    text: "Pure vegetarian menu",
  },
  {
    icon: faStore,
    title: "Dine-in or Takeaway",
    text: "Choose your order type",
  },
  {
    icon: faShieldHeart,
    title: "Secure Payments",
    text: "Protected checkout",
  },
  {
    icon: faClock,
    title: "Fresh Preparation",
    text: "Prepared after ordering",
  },
];

function FAQAccordion({
  section,
  startIndex,
}: {
  section: FAQSection;
  startIndex: number;
}) {
  const [openQuestion, setOpenQuestion] = useState<number | null>(
    section.id === "orders" ? 0 : null,
  );
  const questionRefs = useRef<Array<HTMLElement | null>>([]);

  const toggleQuestion = (index: number, isOpen: boolean): void => {
    const nextQuestion = isOpen ? null : index;
    setOpenQuestion(nextQuestion);

    if (
      nextQuestion !== null &&
      typeof window !== "undefined" &&
      window.innerWidth < 768
    ) {
      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          const targetQuestion = questionRefs.current[index];

          if (!targetQuestion) return;

          const stickyHeaderOffset = 92;
          const targetTop =
            targetQuestion.getBoundingClientRect().top +
            window.scrollY -
            stickyHeaderOffset;

          window.scrollTo({
            top: Math.max(targetTop, 0),
            behavior: "smooth",
          });
        }, 40);
      });
    }
  };

  return (
    <section className="min-w-0">
      <div className="mb-4 flex items-center gap-3">
        <span className="h-8 w-1 rounded-full bg-[#C8102E]" />
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FFF1E5] text-[#C8102E]">
          <FontAwesomeIcon icon={section.icon} className="h-5" />
        </span>
        <h2 className="text-lg font-black uppercase tracking-[-0.03em] text-[#172536] sm:text-xl">
          {section.title}
        </h2>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#EDE3D8] bg-white shadow-[0_12px_30px_rgba(50,30,15,.05)]">
        {section.items.map((item, index) => {
          const open = openQuestion === index;

          return (
            <article
              ref={(element) => {
                questionRefs.current[index] = element;
              }}
              key={item.question}
              className="scroll-mt-24 border-b border-[#EDE3D8] last:border-b-0"
            >
              <button
                type="button"
                onClick={() => toggleQuestion(index, open)}
                aria-expanded={open}
                className="flex w-full min-w-0 items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-[#FFF8F1] sm:px-5"
              >
                <span
                  className={`min-w-0 text-[11px] font-black leading-5 sm:text-xs ${
                    open ? "text-[#C8102E]" : "text-[#25211E]"
                  }`}
                >
                  {startIndex + index}. {item.question}
                </span>

                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${
                    open
                      ? "bg-[#C8102E] text-white"
                      : "bg-[#FFF1E5] text-[#172536]"
                  }`}
                >
                  <FontAwesomeIcon
                    icon={open ? faMinus : faPlus}
                    className="h-3"
                  />
                </span>
              </button>

              {open && (
                <div className="border-t border-[#F2E8DE] bg-[#FFFDF9] px-4 py-4 sm:px-5">
                  <p className="max-w-3xl text-[11px] leading-6 text-[#625B55]">
                    {item.answer}
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function FAQPageClient() {
  return (
    <main className="overflow-x-hidden bg-[#FFFDF9] text-[#172536]">
      <section className="relative overflow-hidden border-b border-[#EDE3D8] bg-[linear-gradient(135deg,#FFFDF9,#FFF6EC)]">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(#E8A53A_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="relative mx-auto grid min-h-[500px] w-[min(100%-2rem,1320px)] min-w-0 items-center gap-10 py-12 lg:grid-cols-[minmax(0,.84fr)_minmax(0,1.16fr)] lg:py-16">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-3 text-sm font-black italic text-[#C8102E]">
              <span className="h-px w-10 bg-[#E8A53A]" />
              Got Questions? We&apos;ve Got Answers!
              <span className="h-px w-10 bg-[#E8A53A]" />
            </div>

            <h1 className="mt-6 max-w-[720px] break-words text-[clamp(3rem,8vw,6rem)] font-black uppercase leading-[.88] tracking-[-0.055em] text-[#14283B]">
              Frequently
              <br />
              <span className="text-[#C8102E]">Asked Questions</span>
            </h1>

            <p className="mt-6 max-w-[620px] text-base leading-8 text-[#4F4943] sm:text-lg">
              Find clear answers about ordering, dine-in, takeaway, payments,
              TRS Coins, account access, opening hours and customer support.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: faBagShopping,
                  title: "Ordering Help",
                  text: "Cart, checkout and tracking",
                },
                {
                  icon: faCoins,
                  title: "Rewards Help",
                  text: "Coins, coupons and offers",
                },
                {
                  icon: faQuestion,
                  title: "General Help",
                  text: "Timings, location and service",
                },
              ].map(({ icon, title, text }) => (
                <article
                  key={title}
                  className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#EDE3D8] bg-white/90 p-4 shadow-[0_12px_30px_rgba(44,28,14,.06)]"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FFF1E5] text-[#C8102E]">
                    <FontAwesomeIcon icon={icon} className="h-4" />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-[10px] font-black uppercase">
                      {title}
                    </strong>
                    <span className="mt-1 block text-[9px] leading-4 text-[#6D655E]">
                      {text}
                    </span>
                  </span>
                </article>
              ))}
            </div>
          </div>

          <div className="relative min-h-[330px] min-w-0 sm:min-h-[430px]">
            <CmsHeroMedia
              pageKey="faq"
              label="TRS FAQ hero image"
              className="absolute inset-0 rounded-[2rem] border-[#E8D8C9] bg-[linear-gradient(135deg,#FFF4E3,#F5D5B3)] shadow-[0_28px_70px_rgba(88,56,24,.14)]"
            />
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto grid w-[min(100%-2rem,1240px)] min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="min-w-0 space-y-8">
            {faqSections.map((section, sectionIndex) => {
              const startIndex =
                faqSections
                  .slice(0, sectionIndex)
                  .reduce(
                    (total, previousSection) =>
                      total + previousSection.items.length,
                    0,
                  ) + 1;

              return (
                <FAQAccordion
                  key={section.id}
                  section={section}
                  startIndex={startIndex}
                />
              );
            })}
          </div>

          <aside className="min-w-0 space-y-5 lg:sticky lg:top-[104px] lg:self-start">
            <section className="rounded-3xl border border-[#EDE3D8] bg-white p-5 shadow-[0_18px_42px_rgba(50,30,15,.06)] sm:p-6">
              <h2 className="text-lg font-black uppercase">
                Still Have Questions?
              </h2>
              <p className="mt-2 text-[10px] leading-5 text-[#655E57]">
                Reach out to the TRS team using your preferred option.
              </p>

              <div className="mt-5 grid gap-3">
                <a
                  href="tel:+919166694786"
                  className="flex h-12 items-center gap-3 rounded-xl border border-[#C8102E] px-4 text-xs font-black text-[#172536] transition hover:bg-[#C8102E] hover:text-white"
                >
                  <FontAwesomeIcon icon={faPhone} className="h-4" />
                  +91 91666 94786
                </a>

                <a
                  href="https://wa.me/919166694786"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 items-center gap-3 rounded-xl border border-[#25D366] px-4 text-xs font-black text-[#172536] transition hover:bg-[#25D366] hover:text-white"
                >
                  <FontAwesomeIcon icon={faWhatsapp} className="h-5" />
                  WhatsApp Us
                </a>

                <a
                  href="mailto:hello@therollingstove.in"
                  className="flex h-12 items-center gap-3 rounded-xl border border-[#E5D9CD] px-4 text-[11px] font-black text-[#172536] transition hover:border-[#C8102E] hover:text-[#C8102E]"
                >
                  <FontAwesomeIcon icon={faEnvelope} className="h-4" />
                  hello@therollingstove.in
                </a>
              </div>
            </section>

            <section className="rounded-3xl border border-[#EDE3D8] bg-[linear-gradient(135deg,#FFF8ED,#FFF1E2)] p-5 shadow-[0_18px_42px_rgba(50,30,15,.06)] sm:p-6">
              <h2 className="text-lg font-black uppercase">Quick Info</h2>

              <div className="mt-5 grid gap-4">
                {quickInfo.map(({ icon, title, text }) => (
                  <div key={title} className="flex min-w-0 items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#D99219]">
                      <FontAwesomeIcon icon={icon} className="h-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[9px] font-black uppercase">
                        {title}
                      </h3>
                      <p className="mt-1 text-[9px] leading-4 text-[#655E57]">
                        {text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <a
                href="https://maps.app.goo.gl/uBCTJ5VkTXGJUgLg7"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex h-10 items-center gap-3 rounded-xl border border-[#C8102E] px-4 text-[9px] font-black uppercase text-[#C8102E] transition hover:bg-[#C8102E] hover:text-white"
              >
                Get Directions
                <FontAwesomeIcon icon={faArrowRight} className="h-3" />
              </a>
            </section>

            <section className="grid min-w-0 items-center gap-4 rounded-3xl border border-[#F0DFC8] bg-[#FFF7EA] p-5 sm:grid-cols-[minmax(0,1fr)_110px] lg:grid-cols-1">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#C8102E]">
                  Earn TRS Coins
                </p>
                <p className="mt-2 text-[10px] leading-5 text-[#655E57]">
                  Earn 5 coins for every eligible ₹100 spent.
                </p>
                <Link
                  href="/rewards"
                  className="mt-4 inline-flex h-10 items-center gap-3 rounded-xl bg-[#C8102E] px-4 text-[9px] font-black uppercase text-white"
                >
                  Know More
                  <FontAwesomeIcon icon={faArrowRight} className="h-3" />
                </Link>
              </div>

              <MediaPlaceholder
                label="TRS Coins FAQ image"
                className="aspect-square w-full rounded-2xl bg-white/65"
              />
            </section>

            <section className="rounded-3xl border border-[#EDE3D8] bg-white p-5 shadow-[0_18px_42px_rgba(50,30,15,.06)] sm:p-6">
              <h2 className="text-lg font-black uppercase">
                Helpful Policies
              </h2>
              <p className="mt-2 text-[10px] leading-5 text-[#655E57]">
                Review the website policies for further details.
              </p>

              <div className="mt-5 grid gap-2">
                {[
                  ["/terms", "Terms & Conditions"],
                  ["/privacy", "Privacy Policy"],
                  ["/refund-policy", "Refund & Cancellation Policy"],
                ].map(([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex h-11 items-center justify-between rounded-xl border border-[#EDE3D8] px-4 text-[9px] font-black uppercase text-[#172536] transition hover:border-[#C8102E] hover:text-[#C8102E]"
                  >
                    {label}
                    <FontAwesomeIcon
                      icon={faArrowRight}
                      className="h-3"
                    />
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>

      <section className="pb-14">
        <div className="mx-auto grid w-[min(100%-2rem,1240px)] grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#EDE3D8] bg-[#EDE3D8] shadow-[0_14px_32px_rgba(50,30,15,.05)] lg:grid-cols-4">
          {trustItems.map(({ icon, title, text }) => (
            <article
              key={title}
              className="flex min-w-0 items-center gap-2.5 bg-white p-3 sm:gap-3 sm:p-5"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FFF1E5] text-[#D99219] sm:h-11 sm:w-11">
                <FontAwesomeIcon icon={icon} className="h-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[8px] font-black uppercase text-[#172536] sm:text-[9px]">
                  {title}
                </h2>
                <p className="mt-1 text-[7px] leading-3 text-[#655E57] sm:text-[8px]">
                  {text}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
