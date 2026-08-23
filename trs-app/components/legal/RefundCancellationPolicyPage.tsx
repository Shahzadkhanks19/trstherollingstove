import { CmsHeroMedia } from "@/components/site/CmsHeroMedia";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faBagShopping,
  faBan,
  faCalendarDays,
  faCircleCheck,
  faClock,
  faCoins,
  faCreditCard,
  faEnvelope,
  faIndianRupeeSign,
  faLocationDot,
  faMoneyBillTransfer,
  faPhone,
  faReceipt,
  faRotateLeft,
  faShieldHeart,
  faStore,
  faTriangleExclamation,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { MediaPlaceholder } from "@/components/site/MediaPlaceholder";

type PolicyItem = {
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

const refundItems: PolicyItem[] = [
  {
    number: 1,
    title: "When a Refund May Be Eligible",
    icon: faIndianRupeeSign,
    paragraphs: [
      "A refund may be considered after verification when the payment or order issue is attributable to TRS or the payment process.",
    ],
    bullets: [
      "Payment was deducted but no valid order was created.",
      "The same transaction was charged more than once.",
      "TRS cancelled the order because an item was unavailable or fulfilment was not possible.",
      "A confirmed item could not be supplied and the customer did not accept a replacement.",
      "The customer received a materially incorrect order and TRS could not reasonably replace or remake it.",
    ],
  },
  {
    number: 2,
    title: "Non-Refundable Situations",
    icon: faBan,
    paragraphs: [
      "Because TRS prepares fresh food after confirmation, refunds are generally not available in the following situations.",
    ],
    bullets: [
      "The customer changes their mind after preparation has started.",
      "The order has been collected, served or substantially consumed.",
      "The customer supplied incorrect order, contact or customisation details.",
      "The customer did not collect a takeaway order after it was prepared.",
      "A delay resulted from the customer arriving late or being unavailable.",
      "A promotional item, freebie or bonus reward is not separately refundable.",
    ],
  },
  {
    number: 3,
    title: "Failed or Pending Payments",
    icon: faCreditCard,
    paragraphs: [
      "If payment is deducted but the order is not confirmed, do not immediately pay again. First check the order status and allow a short period for the payment provider to update or reverse the transaction.",
      "If the payment remains unresolved, contact TRS with the transaction reference, amount, date, mobile number and screenshot where available.",
    ],
  },
  {
    number: 4,
    title: "Duplicate Payments",
    icon: faMoneyBillTransfer,
    paragraphs: [
      "Verified duplicate charges for the same order may be refunded to the original payment method.",
      "TRS may request transaction references or bank evidence before approving the refund.",
    ],
  },
  {
    number: 5,
    title: "Refund Processing Time",
    icon: faClock,
    paragraphs: [
      "Approved refunds are initiated to the original payment method. The time taken to appear depends on the bank, card issuer, UPI provider or payment gateway.",
    ],
    bullets: [
      "UPI: commonly 1–3 working days after initiation.",
      "Debit or credit card: commonly 5–7 working days.",
      "Net banking: commonly 3–7 working days.",
      "Wallet or other provider: according to the provider's processing timeline.",
    ],
  },
  {
    number: 6,
    title: "TRS Coins and Promotional Benefits",
    icon: faCoins,
    paragraphs: [
      "Where TRS cancels an eligible order, redeemed TRS Coins may be restored after verification.",
    ],
    bullets: [
      "Coins are earned only on eligible completed purchases.",
      "Promotional bonus coins or one-time rewards may not be restored unless the offer rules expressly allow it.",
      "Any refund may result in reversal of coins earned from that transaction.",
      "Coupons have no cash value and are not refunded as money.",
    ],
  },
];

const cancellationItems: PolicyItem[] = [
  {
    number: 1,
    title: "Cancellation Before Preparation",
    icon: faRotateLeft,
    paragraphs: [
      "A customer may request cancellation before food preparation begins. Cancellation is valid only after confirmation from TRS.",
      "Because preparation can begin quickly, contacting TRS immediately is important.",
    ],
  },
  {
    number: 2,
    title: "After Preparation Begins",
    icon: faTriangleExclamation,
    paragraphs: [
      "Once preparation has started, cancellation may be declined because ingredients, staff time and preparation costs have already been committed.",
    ],
  },
  {
    number: 3,
    title: "Order Ready or Served",
    icon: faBagShopping,
    paragraphs: [
      "An order marked ready for pickup, ready to serve, served or collected cannot normally be cancelled.",
      "Takeaway customers should collect orders promptly after receiving the ready notification.",
    ],
  },
  {
    number: 4,
    title: "Order Modification",
    icon: faReceipt,
    paragraphs: [
      "Changes to item quantity, size, customisation or order type are possible only before preparation begins and only if operationally feasible.",
      "A requested change may affect price and preparation time.",
    ],
  },
  {
    number: 5,
    title: "Cancellation by TRS",
    icon: faStore,
    paragraphs: [
      "TRS may cancel an order because of item unavailability, technical failure, incorrect information, unsafe conditions, payment problems or circumstances beyond reasonable control.",
      "Where payment has already been captured, an eligible refund will be processed after verification.",
    ],
  },
  {
    number: 6,
    title: "Incorrect or Missing Items",
    icon: faUtensils,
    paragraphs: [
      "Report incorrect or missing items as soon as reasonably possible and provide the order ID and supporting details.",
      "Depending on the circumstances, TRS may offer a correction, replacement, remake, account credit or eligible refund.",
    ],
  },
];

const importantNotes: Highlight[] = [
  {
    icon: faClock,
    title: "Fresh Preparation Starts Quickly",
    text: "Contact TRS immediately if an order needs to be changed or cancelled.",
  },
  {
    icon: faShieldHeart,
    title: "Verification Is Required",
    text: "Refunds are processed only after confirming the order and payment details.",
  },
  {
    icon: faCreditCard,
    title: "Original Payment Method",
    text: "Approved refunds are normally returned to the method used for payment.",
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
    text: "No reservations or direct delivery",
  },
  {
    icon: faShieldHeart,
    title: "Fair Verification",
    text: "Every request is reviewed",
  },
  {
    icon: faClock,
    title: "Fresh Preparation",
    text: "Prepared after confirmation",
  },
];

function PolicyColumn({
  title,
  subtitle,
  icon,
  items,
}: {
  title: string;
  subtitle: string;
  icon: IconDefinition;
  items: PolicyItem[];
}) {
  return (
    <section className="min-w-0">
      <div className="rounded-3xl border border-[#EDE3D8] bg-white p-5 text-center shadow-[0_14px_34px_rgba(50,30,15,.05)] sm:p-6">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[#E8D8C9] bg-[#FFF7EE] text-[#C8102E]">
          <FontAwesomeIcon icon={icon} className="h-7" />
        </span>
        <h2 className="mt-4 text-2xl font-black uppercase tracking-[-0.04em]">
          {title}
        </h2>
        <div className="mx-auto mt-3 flex max-w-[150px] items-center gap-3">
          <span className="h-px flex-1 bg-[#E8A53A]" />
          <span className="text-[#E8A53A]">★</span>
          <span className="h-px flex-1 bg-[#E8A53A]" />
        </div>
        <p className="mt-4 text-[10px] leading-5 text-[#655E57]">{subtitle}</p>
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border border-[#EDE3D8] bg-white shadow-[0_14px_34px_rgba(50,30,15,.05)]">
        {items.map(({ number, title: itemTitle, icon: itemIcon, paragraphs, bullets }) => (
          <article
            key={itemTitle}
            className="grid min-w-0 gap-4 border-b border-[#EDE3D8] p-5 last:border-b-0 sm:grid-cols-[52px_minmax(0,1fr)]"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#FFF1E5] text-[#C8102E]">
              <FontAwesomeIcon icon={itemIcon} className="h-4" />
            </span>

            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#C8102E] text-[8px] font-black text-white">
                  {number}
                </span>
                <h3 className="text-[11px] font-black uppercase">{itemTitle}</h3>
              </div>

              <div className="mt-3 grid gap-2">
                {paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-[10px] leading-5 text-[#625B55]">
                    {paragraph}
                  </p>
                ))}
              </div>

              {bullets && (
                <div className="mt-3 grid gap-2">
                  {bullets.map((bullet) => (
                    <p
                      key={bullet}
                      className="flex gap-2 text-[9px] leading-4 text-[#625B55]"
                    >
                      <FontAwesomeIcon
                        icon={faCircleCheck}
                        className="mt-0.5 h-3 shrink-0 text-[#D99219]"
                      />
                      {bullet}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function RefundCancellationPolicyPage() {
  return (
    <main className="overflow-x-hidden bg-[#FFFDF9] text-[#172536]">
      <section className="relative overflow-hidden border-b border-[#EDE3D8] bg-[linear-gradient(135deg,#FFFDF9,#FFF6EC)]">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(#E8A53A_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="relative mx-auto grid min-h-[470px] w-[min(100%-2rem,1320px)] min-w-0 items-center gap-10 py-12 lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)] lg:py-14">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-3 text-sm font-black italic text-[#C8102E]">
              <span className="h-px w-10 bg-[#E8A53A]" />
              Clear and Fair Order Support
              <span className="h-px w-10 bg-[#E8A53A]" />
            </div>

            <h1 className="mt-6 break-words text-[clamp(2.8rem,7.5vw,5.7rem)] font-black uppercase leading-[.9] tracking-[-0.055em] text-[#14283B]">
              Refund &amp;
              <br />
              <span className="text-[#C8102E]">Cancellation</span>
              <br />
              Policy
            </h1>

            <p className="mt-6 max-w-[620px] text-base leading-8 text-[#4F4943] sm:text-lg">
              This policy explains when an order may be cancelled, when a
              refund may be available and how payment issues are reviewed.
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

          <div className="relative min-h-[300px] min-w-0 sm:min-h-[380px]">
            <CmsHeroMedia
              pageKey="refund-cancellation-policy"
              label="TRS refund and cancellation policy hero image"
              className="absolute inset-0 rounded-[2rem] border-[#E8D8C9] bg-[linear-gradient(135deg,#FFF4E3,#F5D5B3)] shadow-[0_28px_70px_rgba(88,56,24,.14)]"
            />
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto grid w-[min(100%-2rem,1240px)] min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid min-w-0 gap-6 lg:grid-cols-2">
            <PolicyColumn
              title="Refund Policy"
              subtitle="Refund requests are handled fairly after reviewing the order and payment details."
              icon={faIndianRupeeSign}
              items={refundItems}
            />

            <PolicyColumn
              title="Cancellation Policy"
              subtitle="Order cancellation depends on whether fresh-food preparation has already started."
              icon={faCalendarDays}
              items={cancellationItems}
            />
          </div>

          <aside className="min-w-0 space-y-5 xl:sticky xl:top-[104px] xl:self-start">
            <section className="rounded-3xl border border-[#EDE3D8] bg-white p-5 shadow-[0_18px_42px_rgba(50,30,15,.06)]">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#C8102E]">
                Important Notes
              </p>

              <div className="mt-5 grid gap-5">
                {importantNotes.map(({ icon, title, text }) => (
                  <article key={title} className="flex min-w-0 items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#FFF1E5] text-[#D99219]">
                      <FontAwesomeIcon icon={icon} className="h-4" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-[10px] font-black">{title}</h2>
                      <p className="mt-1 text-[9px] leading-4 text-[#655E57]">
                        {text}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-[#F0DFC8] bg-[#FFF7EA] p-5">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#C8102E]">
                Need Help?
              </p>
              <h2 className="mt-2 text-xl font-black uppercase">
                Contact the TRS Team
              </h2>
              <p className="mt-3 text-[10px] leading-5 text-[#655E57]">
                Keep your order ID and payment reference ready for faster
                assistance.
              </p>

              <div className="mt-5 grid gap-3 text-[10px]">
                <a href="tel:+919166694786" className="flex items-center gap-3">
                  <FontAwesomeIcon icon={faPhone} className="h-4 text-[#C8102E]" />
                  +91 91666 94786
                </a>
                <a
                  href="mailto:hello@therollingstove.in"
                  className="flex min-w-0 items-center gap-3"
                >
                  <FontAwesomeIcon
                    icon={faEnvelope}
                    className="h-4 shrink-0 text-[#C8102E]"
                  />
                  <span className="min-w-0 break-all">
                    hello@therollingstove.in
                  </span>
                </a>
                <p className="flex items-start gap-3">
                  <FontAwesomeIcon
                    icon={faLocationDot}
                    className="mt-0.5 h-4 shrink-0 text-[#C8102E]"
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

            <section className="grid min-w-0 items-center gap-4 rounded-3xl bg-[#112536] p-5 text-white sm:grid-cols-[minmax(0,1fr)_100px] xl:grid-cols-1">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#F5C84B]">
                  TRS Coins
                </p>
                <p className="mt-2 text-[10px] leading-5 text-white/70">
                  Refunded orders may lead to reversal of coins earned from
                  that purchase.
                </p>
                <Link
                  href="/rewards"
                  className="mt-4 inline-flex h-10 items-center gap-3 rounded-xl bg-[#F5C84B] px-4 text-[9px] font-black uppercase text-[#2B2307]"
                >
                  View Rewards
                  <FontAwesomeIcon icon={faArrowRight} className="h-3" />
                </Link>
              </div>

              <MediaPlaceholder
                label="TRS Coins policy image"
                className="aspect-square w-full rounded-2xl border-white/10 bg-white/10"
              />
            </section>

            <section className="rounded-3xl border border-[#EDE3D8] bg-white p-5">
              <h2 className="text-sm font-black uppercase">Related Policies</h2>
              <div className="mt-4 grid gap-2">
                {[
                  ["/terms", "Terms & Conditions"],
                  ["/privacy", "Privacy Policy"],
                  ["/faq", "Frequently Asked Questions"],
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

      <section className="pb-10">
        <div className="mx-auto flex w-[min(100%-2rem,1240px)] min-w-0 flex-col gap-5 rounded-3xl border border-[#E8D8C9] bg-[linear-gradient(135deg,#FFF8ED,#FFF1E2)] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-[#D99219]">
              <FontAwesomeIcon icon={faShieldHeart} className="h-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#C8102E]">
                Policy Acknowledgement
              </p>
              <h2 className="mt-2 text-xl font-black uppercase sm:text-2xl">
                By placing an order, you agree to this Refund &amp;
                Cancellation Policy.
              </h2>
            </div>
          </div>

          <Link
            href="/menu"
            className="inline-flex h-12 shrink-0 items-center justify-center gap-3 rounded-xl bg-[#C8102E] px-6 text-[10px] font-black uppercase text-white"
          >
            Order Now
            <FontAwesomeIcon icon={faArrowRight} className="h-3" />
          </Link>
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
