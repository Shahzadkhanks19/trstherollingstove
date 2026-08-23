import { CmsHeroMedia } from "@/components/site/CmsHeroMedia";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faCalendarDays,
  faChartLine,
  faCircleCheck,
  faCookieBite,
  faEnvelope,
  faIdCard,
  faLink,
  faLock,
  faLocationDot,
  faPen,
  faPhone,
  faReceipt,
  faShieldHeart,
  faSliders,
  faStore,
  faUserShield,
  faUsers,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

type PolicySection = {
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

const policySections: PolicySection[] = [
  {
    number: 1,
    title: "Information We Collect",
    icon: faIdCard,
    paragraphs: [
      "We collect information that you provide directly, information generated when you use the website, and limited technical information required to operate and improve the platform.",
    ],
    bullets: [
      "Account information: name, mobile number, email address, password credentials in protected form and profile preferences.",
      "Order information: cart items, customisations, order type, payment status, order history, coupon usage and TRS Coins activity.",
      "Customer-support information: messages, feedback, complaints and information shared through contact forms, phone, email or WhatsApp.",
      "Career information: job application details, work experience and resumes submitted through the Careers page.",
      "Technical information: IP address, browser type, device details, pages visited, timestamps, diagnostic logs and cookie identifiers.",
      "Location information: only when you voluntarily use a location-based feature or open directions to the TRS outlet.",
    ],
  },
  {
    number: 2,
    title: "How We Use Your Information",
    icon: faReceipt,
    paragraphs: [
      "We use personal information only for legitimate business, operational, security and customer-service purposes.",
    ],
    bullets: [
      "Create and manage customer accounts.",
      "Process dine-in and takeaway orders and provide order-status updates.",
      "Calculate TRS Coins, discounts, coupons and reward eligibility.",
      "Send transactional messages relating to orders, account security and support requests.",
      "Respond to enquiries, feedback and complaints.",
      "Review job applications and communicate with shortlisted candidates.",
      "Prevent fraud, misuse, unauthorised access and technical abuse.",
      "Analyse website performance and improve the customer experience.",
      "Meet applicable legal, tax, accounting and regulatory obligations.",
    ],
  },
  {
    number: 3,
    title: "Payments and Transaction Data",
    icon: faLock,
    paragraphs: [
      "Online payments may be processed by authorised third-party payment providers. TRS does not intend to store full card numbers, UPI PINs, CVVs or other sensitive payment credentials on its own servers.",
      "We may retain payment references, transaction status, amount, refund status and gateway identifiers required for order fulfilment, reconciliation, support and legal compliance.",
    ],
  },
  {
    number: 4,
    title: "Cookies and Similar Technologies",
    icon: faCookieBite,
    paragraphs: [
      "The website may use essential cookies, local storage and similar technologies to keep you signed in, preserve cart information, remember preferences, protect sessions and understand website performance.",
      "Where required, non-essential analytics or marketing technologies should be used only after appropriate consent. You can manage browser permissions and cookie settings through your browser.",
    ],
  },
  {
    number: 5,
    title: "Sharing of Information",
    icon: faUsers,
    paragraphs: [
      "We do not sell or rent personal information. Information may be shared only where reasonably necessary to operate the platform or meet legal obligations.",
    ],
    bullets: [
      "Payment gateways and banking partners for payment processing and refunds.",
      "Hosting, database, email, messaging, analytics and security service providers.",
      "Professional advisers, auditors or authorities where required by law.",
      "A successor entity if the business is reorganised, merged or transferred, subject to applicable safeguards.",
    ],
  },
  {
    number: 6,
    title: "Data Retention",
    icon: faCalendarDays,
    paragraphs: [
      "We retain information only for as long as reasonably necessary for the purposes described in this policy, including order fulfilment, customer support, accounting, security, dispute resolution and legal compliance.",
      "Retention periods may differ by data category. When information is no longer required, it should be deleted, anonymised or securely archived according to the applicable retention process.",
    ],
  },
  {
    number: 7,
    title: "Data Security",
    icon: faShieldHeart,
    paragraphs: [
      "We use reasonable administrative, technical and organisational safeguards designed to protect information from unauthorised access, alteration, disclosure or loss.",
      "No online system can be guaranteed to be completely secure. Customers should use strong passwords, protect OTPs and avoid sharing account credentials with others.",
    ],
  },
  {
    number: 8,
    title: "Your Choices and Rights",
    icon: faUserShield,
    paragraphs: [
      "Subject to applicable law and verification requirements, you may request access to, correction of or deletion of certain personal information associated with your account.",
    ],
    bullets: [
      "Update profile information through account settings where available.",
      "Opt out of non-essential promotional messages.",
      "Request account closure, subject to information we must retain for lawful purposes.",
      "Ask questions or raise a privacy concern through the contact details on this page.",
    ],
  },
  {
    number: 9,
    title: "Children's Privacy",
    icon: faCircleCheck,
    paragraphs: [
      "The website is not designed to knowingly collect personal information from children without appropriate consent from a parent or lawful guardian. If you believe a child has submitted personal information improperly, contact us so that the matter can be reviewed.",
    ],
  },
  {
    number: 10,
    title: "Third-Party Links and Services",
    icon: faLink,
    paragraphs: [
      "The website may link to third-party services such as Google Maps, social networks, payment providers and messaging platforms. Their privacy practices are governed by their own policies, and TRS is not responsible for how those independent services handle information.",
    ],
  },
  {
    number: 11,
    title: "Changes to This Policy",
    icon: faPen,
    paragraphs: [
      "We may update this Privacy Policy to reflect changes in the website, services, technology or legal requirements. The updated version will be published on this page with a revised last-updated date.",
    ],
  },
];

const highlights: Highlight[] = [
  {
    icon: faShieldHeart,
    title: "Privacy Matters",
    text: "Information should be used only for clear and legitimate purposes.",
  },
  {
    icon: faLock,
    title: "Security Focused",
    text: "Reasonable safeguards protect accounts, orders and support data.",
  },
  {
    icon: faEnvelope,
    title: "Relevant Communication",
    text: "Transactional messages support orders, accounts and assistance.",
  },
  {
    icon: faSliders,
    title: "Customer Control",
    text: "Eligible users may manage preferences and request account changes.",
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
    text: "Choose your order type",
  },
  {
    icon: faLock,
    title: "Secure Payments",
    text: "Protected checkout",
  },
  {
    icon: faChartLine,
    title: "Responsible Analytics",
    text: "Used to improve performance",
  },
];

export function PrivacyPolicyPage() {
  return (
    <main className="overflow-x-hidden bg-[#FFFDF9] text-[#172536]">
      <section className="relative overflow-hidden border-b border-[#EDE3D8] bg-[linear-gradient(135deg,#FFFDF9,#FFF6EC)]">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(#E8A53A_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="relative mx-auto grid min-h-[430px] w-[min(100%-2rem,1320px)] min-w-0 items-center gap-10 py-12 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:py-14">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-3 text-sm font-black italic text-[#C8102E]">
              <span className="h-px w-10 bg-[#E8A53A]" />
              Your Privacy Matters
              <span className="h-px w-10 bg-[#E8A53A]" />
            </div>

            <h1 className="mt-6 break-words text-[clamp(3.2rem,8vw,6rem)] font-black uppercase leading-[.88] tracking-[-0.055em] text-[#14283B]">
              Privacy <span className="text-[#C8102E]">Policy</span>
            </h1>

            <p className="mt-6 max-w-[620px] text-base leading-8 text-[#4F4943] sm:text-lg">
              This policy explains how The Rolling Stove collects, uses,
              stores and protects information across its website, ordering,
              rewards and customer-support services.
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
              pageKey="privacy-policy"
              label="TRS privacy policy hero image"
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
                  <FontAwesomeIcon icon={faShieldHeart} className="h-6" />
                </span>

                <div className="min-w-0">
                  <h2 className="text-lg font-black uppercase">
                    About This Policy
                  </h2>
                  <p className="mt-3 text-[11px] leading-6 text-[#625B55]">
                    This Privacy Policy applies to the TRS website and related
                    digital services operated for The Rolling Stove. It should
                    be read together with the Terms &amp; Conditions and any
                    specific notice shown when information is collected.
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
                  </div>
                </div>
              </div>
            </section>

            <div className="mt-6 divide-y divide-[#EDE3D8]">
              {policySections.map(
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
              <h2 className="text-lg font-black uppercase">
                Privacy Highlights
              </h2>
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

            <section className="rounded-3xl border border-[#F0DFC8] bg-[#FFF7EA] p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#C8102E]">
                  <FontAwesomeIcon icon={faCalendarDays} className="h-5" />
                </span>
                <div>
                  <h2 className="text-sm font-black uppercase">
                    Data Retention
                  </h2>
                  <p className="mt-2 text-[9px] leading-5 text-[#655E57]">
                    Information is retained only for legitimate operational,
                    security, accounting and legal purposes.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-[#F0DFC8] bg-[#FFF7EA] p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#C8102E]">
                  <FontAwesomeIcon icon={faPen} className="h-5" />
                </span>
                <div>
                  <h2 className="text-sm font-black uppercase">
                    Policy Updates
                  </h2>
                  <p className="mt-2 text-[9px] leading-5 text-[#655E57]">
                    Material changes will be published on this page with a new
                    last-updated date.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-[#112536] p-5 text-white shadow-[0_18px_42px_rgba(17,37,54,.16)]">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#F5C84B]">
                Questions About Privacy?
              </p>
              <h2 className="mt-2 text-xl font-black uppercase">
                Contact the TRS Team
              </h2>
              <p className="mt-3 text-[10px] leading-5 text-white/70">
                Contact us to ask a question, report a concern or request an
                eligible account-data action.
              </p>

              <div className="mt-5 grid gap-3 text-[10px]">
                <a
                  href="tel:+919166694786"
                  className="flex items-center gap-3"
                >
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
                  ["/terms", "Terms & Conditions"],
                  ["/refund-policy", "Refund & Cancellation Policy"],
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
