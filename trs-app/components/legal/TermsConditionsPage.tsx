import { CmsHeroMedia } from "@/components/site/CmsHeroMedia";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faBagShopping,
  faBan,
  faBriefcase,
  faBuildingColumns,
  faCircleCheck,
  faCoins,
  faCookieBite,
  faEnvelope,
  faFileContract,
  faGift,
  faGlobe,
  faIdCard,
  faIndianRupeeSign,
  faLink,
  faLock,
  faLocationDot,
  faPhone,
  faReceipt,
  faScaleBalanced,
  faShieldHeart,
  faStore,
  faTags,
  faTriangleExclamation,
  faUserShield,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

type TermsSection = {
  number: number;
  title: string;
  icon: IconDefinition;
  paragraphs: string[];
  bullets?: string[];
};

type Highlight = {
  icon: IconDefinition;
  title: string;
  text: string;
};

const effectiveDate = "23 July 2026";
const lastUpdated = "23 July 2026";

const termsSections: TermsSection[] = [
  {
    number: 1,
    title: "Acceptance of Terms",
    icon: faFileContract,
    paragraphs: [
      "By accessing or using the TRS website, creating an account, placing an order, using TRS Coins, applying a coupon or interacting with any related digital service, you agree to these Terms & Conditions and the policies referenced on this website.",
      "If you do not agree with these terms, you should not use the website or its services.",
    ],
  },
  {
    number: 2,
    title: "Eligibility and Accurate Information",
    icon: faIdCard,
    paragraphs: [
      "You must provide accurate, current and complete information when creating an account, placing an order or submitting a request.",
      "Users below the age legally required to enter into a contract should use the service only with the involvement and supervision of a parent or lawful guardian.",
    ],
  },
  {
    number: 3,
    title: "Customer Accounts",
    icon: faUserShield,
    paragraphs: [
      "You are responsible for maintaining the confidentiality of your login credentials, OTPs and account activity.",
    ],
    bullets: [
      "Do not share passwords, OTPs or access tokens with other people.",
      "Notify TRS promptly if you suspect unauthorised account access.",
      "TRS may suspend or restrict accounts involved in fraud, misuse, repeated chargebacks, abuse or policy violations.",
      "Account access may require mobile-number or email verification.",
    ],
  },
  {
    number: 4,
    title: "Ordering and Service Model",
    icon: faBagShopping,
    paragraphs: [
      "TRS currently operates as a food truck serving dine-in and takeaway customers. Direct home delivery is not offered through the TRS website.",
    ],
    bullets: [
      "Dine-in and takeaway availability may depend on operating hours, item availability and current demand.",
      "Orders are accepted only after successful confirmation by the website or staff.",
      "TRS may refuse or cancel an order where an item is unavailable, information is incorrect, payment fails or misuse is suspected.",
      "Orders placed through third-party platforms, if available, are also governed by that platform's own terms.",
    ],
  },
  {
    number: 5,
    title: "Pricing, Taxes and Availability",
    icon: faIndianRupeeSign,
    paragraphs: [
      "Prices, item availability, portion options, packaging charges, taxes and promotional offers may change without prior notice.",
    ],
    bullets: [
      "The amount payable is the amount displayed and confirmed during checkout.",
      "Menu images and visual representations are illustrative and actual presentation may vary.",
      "Items may become unavailable due to stock, ingredient or operational limitations.",
      "TRS may correct obvious pricing or listing errors before fulfilment.",
    ],
  },
  {
    number: 6,
    title: "Payments",
    icon: faLock,
    paragraphs: [
      "Payments may be processed through authorised payment gateways and banking partners. Available payment methods are shown during checkout.",
    ],
    bullets: [
      "Customers are responsible for using valid and authorised payment methods.",
      "TRS does not request or store UPI PINs, CVVs or full sensitive card credentials.",
      "A failed or pending payment does not automatically confirm an order.",
      "Duplicate or reversed transactions will be handled according to the payment provider's settlement and refund process.",
    ],
  },
  {
    number: 7,
    title: "Order Changes and Cancellation",
    icon: faBan,
    paragraphs: [
      "Customers should contact TRS immediately if they need to change or cancel an order. Changes are possible only while operationally feasible.",
    ],
    bullets: [
      "An order may be cancelled before preparation begins, subject to confirmation.",
      "Once preparation has started, cancellation or modification may not be available.",
      "TRS may cancel orders because of item unavailability, technical failure, incorrect details, unsafe conditions or circumstances beyond reasonable control.",
      "Any eligible refund will follow the Refund & Cancellation Policy.",
    ],
  },
  {
    number: 8,
    title: "Refunds",
    icon: faReceipt,
    paragraphs: [
      "Refund eligibility depends on the reason for cancellation, order status, payment status and the applicable Refund & Cancellation Policy.",
      "Approved refunds are generally returned to the original payment method and may take additional time to appear depending on the bank or payment provider.",
    ],
  },
  {
    number: 9,
    title: "Dine-In, Takeaway and Seating",
    icon: faStore,
    paragraphs: [
      "TRS is a food truck with limited seating. Seating is available on a first-come, first-served basis and cannot be reserved.",
    ],
    bullets: [
      "TRS does not guarantee seating availability, especially during busy evenings and weekends.",
      "Customers should collect takeaway orders within a reasonable period after the order is marked ready.",
      "Customers should verify the order and report visible issues promptly.",
      "TRS may manage seating and customer flow for safety, cleanliness and smooth operations.",
    ],
  },
  {
    number: 10,
    title: "TRS Coins and Rewards",
    icon: faCoins,
    paragraphs: [
      "TRS Coins are promotional loyalty units and do not represent money, stored value, a bank balance or legal tender.",
    ],
    bullets: [
      "Coins are earned only on eligible transactions and according to the active rewards rules.",
      "Coins may expire and may be subject to minimum-order values, redemption limits and account verification.",
      "Coins cannot be transferred, sold, exchanged for cash or combined where an offer prohibits it.",
      "TRS may amend, pause or discontinue the rewards programme while honouring applicable legal obligations.",
      "Fraudulent earning or redemption may result in reversal of coins and account restriction.",
    ],
  },
  {
    number: 11,
    title: "Coupons and Promotional Offers",
    icon: faTags,
    paragraphs: [
      "Coupons and offers are subject to their displayed validity, eligibility, item restrictions and minimum-order conditions.",
    ],
    bullets: [
      "Only one coupon may be used per order unless expressly stated otherwise.",
      "Coupons may not be combined with TRS Coins or other promotions where the offer rules prohibit it.",
      "Expired, altered, duplicated, transferred or fraudulently obtained codes may be rejected.",
      "TRS may withdraw or correct an offer affected by an obvious technical or publishing error.",
    ],
  },
  {
    number: 12,
    title: "Food Allergies and Dietary Information",
    icon: faTriangleExclamation,
    paragraphs: [
      "TRS serves a vegetarian menu, but customers with allergies or intolerances should inform staff before ordering.",
      "Products may contain or come into contact with milk, cheese, wheat, gluten, soy, nuts, spices or other allergens. While reasonable care is taken, TRS cannot guarantee a completely allergen-free preparation environment.",
    ],
  },
  {
    number: 13,
    title: "Intellectual Property",
    icon: faShieldHeart,
    paragraphs: [
      "The TRS name, logo, brand identity, website design, text, menu presentation, graphics, photography, code and related material are owned by or licensed to The Rolling Stove and are protected by applicable intellectual-property laws.",
    ],
    bullets: [
      "Do not copy, reproduce, publish, sell or commercially exploit TRS content without written permission.",
      "Do not falsely represent an association, partnership or endorsement by TRS.",
    ],
  },
  {
    number: 14,
    title: "Acceptable Website Use",
    icon: faGlobe,
    paragraphs: [
      "You may use the website only for lawful personal purposes and in a manner that does not interfere with other users or TRS operations.",
    ],
    bullets: [
      "Do not attempt unauthorised access, scraping, reverse engineering or security testing.",
      "Do not use bots, scripts or automated methods to exploit coupons, rewards or ordering limits.",
      "Do not upload malicious content, spam, abusive material or false information.",
      "Do not harass staff or misuse support channels.",
    ],
  },
  {
    number: 15,
    title: "Careers and Applications",
    icon: faBriefcase,
    paragraphs: [
      "Submitting a job application does not guarantee an interview or employment. TRS may verify information, contact references and close or pause a vacancy without notice.",
      "Applicants must submit truthful information and should not include unnecessary sensitive personal information in resumes or application messages.",
    ],
  },
  {
    number: 16,
    title: "Third-Party Services",
    icon: faLink,
    paragraphs: [
      "The website may connect to third-party services such as payment gateways, Google Maps, WhatsApp, Instagram, Facebook, analytics tools and hosting providers.",
      "Those services are governed by their own terms and policies. TRS is not responsible for independent third-party systems, outages or content beyond its reasonable control.",
    ],
  },
  {
    number: 17,
    title: "Service Availability",
    icon: faCookieBite,
    paragraphs: [
      "TRS aims to keep the website and ordering services available, but uninterrupted or error-free operation is not guaranteed.",
      "Access may be limited for maintenance, upgrades, network issues, security incidents, force majeure or other operational reasons.",
    ],
  },
  {
    number: 18,
    title: "Limitation of Liability",
    icon: faScaleBalanced,
    paragraphs: [
      "To the maximum extent permitted by applicable law, TRS will not be liable for indirect, incidental, special or consequential losses arising from website use, delayed access, third-party services or events beyond reasonable control.",
      "Nothing in these Terms excludes liability that cannot lawfully be excluded.",
    ],
  },
  {
    number: 19,
    title: "Changes to These Terms",
    icon: faFileContract,
    paragraphs: [
      "TRS may update these Terms & Conditions to reflect operational, legal, technical or service changes. The revised version becomes effective when published with an updated date.",
      "Continued use of the website after an update constitutes acceptance of the revised terms.",
    ],
  },
  {
    number: 20,
    title: "Governing Law and Jurisdiction",
    icon: faBuildingColumns,
    paragraphs: [
      "These Terms are governed by the laws of India. Subject to applicable consumer rights and mandatory law, disputes will be subject to the jurisdiction of the competent courts in Jodhpur, Rajasthan.",
    ],
  },
  {
    number: 21,
    title: "Contact",
    icon: faEnvelope,
    paragraphs: [
      "Questions about these Terms may be sent to TRS through the contact details provided on this page or through the Contact page.",
    ],
  },
];

const highlights: Highlight[] = [
  {
    icon: faCircleCheck,
    title: "Fair & Transparent",
    text: "Ordering, pricing and rewards rules are displayed clearly.",
  },
  {
    icon: faLock,
    title: "Secure Transactions",
    text: "Payments are processed through authorised providers.",
  },
  {
    icon: faUtensils,
    title: "Fresh Preparation",
    text: "Orders are prepared according to current demand and availability.",
  },
  {
    icon: faGift,
    title: "Responsible Rewards",
    text: "TRS Coins and coupons follow defined eligibility rules.",
  },
  {
    icon: faStore,
    title: "First-Come Seating",
    text: "Limited seating is not reservable and depends on availability.",
  },
];

const trustItems: Highlight[] = [
  {
    icon: faUtensils,
    title: "100% Vegetarian",
    text: "Pure vegetarian menu",
  },
  {
    icon: faStore,
    title: "Dine-in or Takeaway",
    text: "No direct home delivery",
  },
  {
    icon: faLock,
    title: "Secure Payments",
    text: "Protected checkout",
  },
  {
    icon: faCoins,
    title: "TRS Rewards",
    text: "Eligibility rules apply",
  },
];

export function TermsConditionsPage() {
  return (
    <main className="overflow-x-hidden bg-[#FFFDF9] text-[#172536]">
      <section className="relative overflow-hidden border-b border-[#EDE3D8] bg-[linear-gradient(135deg,#FFFDF9,#FFF6EC)]">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(#E8A53A_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="relative mx-auto grid min-h-[440px] w-[min(100%-2rem,1320px)] min-w-0 items-center gap-10 py-12 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:py-14">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-3 text-sm font-black italic text-[#C8102E]">
              <span className="h-px w-10 bg-[#E8A53A]" />
              Know Before You Order
              <span className="h-px w-10 bg-[#E8A53A]" />
            </div>

            <h1 className="mt-6 break-words text-[clamp(3rem,8vw,5.9rem)] font-black uppercase leading-[.88] tracking-[-0.055em] text-[#14283B]">
              Terms &amp;
              <br />
              <span className="text-[#C8102E]">Conditions</span>
            </h1>

            <p className="mt-6 max-w-[620px] text-base leading-8 text-[#4F4943] sm:text-lg">
              Clear rules for accounts, ordering, dine-in, takeaway, payments,
              coupons, TRS Coins and use of the TRS website.
            </p>

            <div className="mt-7 flex flex-wrap gap-3 text-[9px] font-black uppercase">
              <span className="rounded-full border border-[#E8D8C9] bg-white px-4 py-2">
                Effective: {effectiveDate}
              </span>
              <span className="rounded-full border border-[#E8D8C9] bg-white px-4 py-2">
                Updated: {lastUpdated}
              </span>
            </div>
          </div>

          <div className="relative min-h-[280px] min-w-0 sm:min-h-[360px]">
            <CmsHeroMedia
              pageKey="terms-and-conditions"
              label="TRS terms and conditions hero image"
              className="absolute inset-0 rounded-[2rem] border-[#E8D8C9] bg-[linear-gradient(135deg,#FFF4E3,#F5D5B3)] shadow-[0_28px_70px_rgba(88,56,24,.14)]"
            />
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto grid w-[min(100%-2rem,1240px)] min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="min-w-0">
            <section className="rounded-3xl border border-[#EDE3D8] bg-white p-5 shadow-[0_18px_42px_rgba(50,30,15,.06)] sm:p-7">
              <div className="flex items-start gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#FFF1E5] text-[#C8102E]">
                  <FontAwesomeIcon icon={faFileContract} className="h-6" />
                </span>

                <div className="min-w-0">
                  <h2 className="text-lg font-black uppercase">
                    About These Terms
                  </h2>
                  <p className="mt-3 text-[11px] leading-6 text-[#625B55]">
                    These Terms &amp; Conditions apply to The Rolling Stove
                    website and related customer-facing digital services. They
                    should be read with the Privacy Policy, Refund &amp;
                    Cancellation Policy and offer-specific rules.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[9px] font-semibold text-[#655E57]">
                    <span>
                      <strong className="text-[#172536]">Effective date:</strong>{" "}
                      {effectiveDate}
                    </span>
                    <span>
                      <strong className="text-[#172536]">Last updated:</strong>{" "}
                      {lastUpdated}
                    </span>
                    <span>
                      <strong className="text-[#172536]">Jurisdiction:</strong>{" "}
                      Jodhpur, Rajasthan
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <div className="mt-6 divide-y divide-[#EDE3D8]">
              {termsSections.map(
                ({ number, title, icon, paragraphs, bullets }) => (
                  <section
                    key={title}
                    className="grid min-w-0 gap-4 py-7 sm:grid-cols-[64px_minmax(0,1fr)]"
                  >
                    <span className="grid h-14 w-14 place-items-center rounded-full border border-[#E8D8C9] bg-[#FFF7EE] text-[#C8102E]">
                      <FontAwesomeIcon icon={icon} className="h-5" />
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#C8102E] text-[9px] font-black text-white">
                          {number}
                        </span>
                        <h2 className="text-sm font-black uppercase sm:text-base">
                          {title}
                        </h2>
                      </div>

                      <div className="mt-3 grid gap-3">
                        {paragraphs.map((paragraph) => (
                          <p
                            key={paragraph}
                            className="text-[11px] leading-6 text-[#625B55]"
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>

                      {bullets && (
                        <div className="mt-4 grid gap-2">
                          {bullets.map((bullet) => (
                            <p
                              key={bullet}
                              className="flex gap-3 text-[10px] leading-5 text-[#625B55]"
                            >
                              <FontAwesomeIcon
                                icon={faCircleCheck}
                                className="mt-1 h-3 shrink-0 text-[#D99219]"
                              />
                              {bullet}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                ),
              )}
            </div>
          </div>

          <aside className="min-w-0 space-y-5 lg:sticky lg:top-[104px] lg:self-start">
            <section className="rounded-3xl border border-[#EDE3D8] bg-white p-5 shadow-[0_18px_42px_rgba(50,30,15,.06)] sm:p-6">
              <h2 className="text-lg font-black uppercase">Key Points</h2>
              <div className="mt-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-[#E8A53A]" />
                <span className="text-[#E8A53A]">★</span>
                <span className="h-px flex-1 bg-[#E8A53A]" />
              </div>

              <div className="mt-6 grid gap-5">
                {highlights.map(({ icon, title, text }) => (
                  <article key={title} className="flex min-w-0 items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#E8D8C9] bg-[#FFF7EE] text-[#D99219]">
                      <FontAwesomeIcon icon={icon} className="h-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[10px] font-black">{title}</h3>
                      <p className="mt-1 text-[9px] leading-4 text-[#655E57]">
                        {text}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-[#F0DFC8] bg-[#FFF7EA] p-6 text-center">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#C8102E]">
                Our Promise to You
              </p>
              <div className="mx-auto mt-4 flex max-w-[160px] items-center gap-3">
                <span className="h-px flex-1 bg-[#E8A53A]" />
                <span className="text-[#E8A53A]">★</span>
                <span className="h-px flex-1 bg-[#E8A53A]" />
              </div>
              <p className="mt-5 text-sm font-black leading-7 text-[#172536]">
                Fresh vegetarian food prepared with care, clear pricing and
                transparent service.
              </p>
              <FontAwesomeIcon
                icon={faShieldHeart}
                className="mt-6 h-10 text-[#D99219]"
              />
            </section>

            <section className="rounded-3xl bg-[#112536] p-5 text-white shadow-[0_18px_42px_rgba(17,37,54,.16)]">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#F5C84B]">
                Need Help?
              </p>
              <h2 className="mt-2 text-xl font-black uppercase">
                Contact the TRS Team
              </h2>

              <div className="mt-5 grid gap-3 text-[10px]">
                <a href="tel:+919166694786" className="flex items-center gap-3">
                  <FontAwesomeIcon icon={faPhone} className="h-4 text-[#F5C84B]" />
                  +91 91666 94786
                </a>
                <a
                  href="mailto:hello@therollingstove.in"
                  className="flex min-w-0 items-center gap-3"
                >
                  <FontAwesomeIcon
                    icon={faEnvelope}
                    className="h-4 shrink-0 text-[#F5C84B]"
                  />
                  <span className="min-w-0 break-all">
                    hello@therollingstove.in
                  </span>
                </a>
                <p className="flex items-start gap-3">
                  <FontAwesomeIcon
                    icon={faLocationDot}
                    className="mt-0.5 h-4 shrink-0 text-[#F5C84B]"
                  />
                  Shastri Circle, Sector-H, Jodhpur, Rajasthan 342003
                </p>
              </div>

              <Link
                href="/contact"
                className="mt-6 inline-flex h-11 items-center gap-3 rounded-xl bg-[#C8102E] px-5 text-[9px] font-black uppercase text-white"
              >
                Contact Us
                <FontAwesomeIcon icon={faArrowRight} className="h-3" />
              </Link>
            </section>

            <section className="rounded-3xl border border-[#EDE3D8] bg-white p-5">
              <h2 className="text-sm font-black uppercase">Related Policies</h2>
              <div className="mt-4 grid gap-2">
                {[
                  ["/privacy", "Privacy Policy"],
                  ["/refund-policy", "Refund & Cancellation Policy"],
                  ["/faq", "Frequently Asked Questions"],
                  ["/contact", "Contact Us"],
                ].map(([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex h-11 items-center justify-between rounded-xl border border-[#EDE3D8] px-4 text-[9px] font-black uppercase transition hover:border-[#C8102E] hover:text-[#C8102E]"
                  >
                    {label}
                    <FontAwesomeIcon icon={faArrowRight} className="h-3" />
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
