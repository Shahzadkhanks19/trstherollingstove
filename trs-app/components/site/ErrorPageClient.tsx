"use client";

import { CmsHeroMedia } from "@/components/site/CmsHeroMedia";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faBagShopping,
  faCircleCheck,
  faClock,
  faCoins,
  faHouse,
  faLocationDot,
  faPhone,
  faReceipt,
  faRotateRight,
  faShieldHeart,
  faTags,
  faTriangleExclamation,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useEffect } from "react";

type RecoveryLink = {
  href: string;
  title: string;
  text: string;
  icon: IconDefinition;
};

type StatusItem = {
  icon: IconDefinition;
  title: string;
  text: string;
};

type ErrorPageClientProps = {
  error: Error & { digest?: string };
  reset: () => void;
  standalone?: boolean;
};

const recoveryLinks: RecoveryLink[] = [
  {
    href: "/",
    title: "Go Home",
    text: "Return to the TRS homepage.",
    icon: faHouse,
  },
  {
    href: "/menu",
    title: "Browse Menu",
    text: "Explore pizzas, naans, pasta and more.",
    icon: faUtensils,
  },
  {
    href: "/offers",
    title: "View Offers",
    text: "Check current deals and combos.",
    icon: faTags,
  },
  {
    href: "/track-order",
    title: "Track Order",
    text: "Check your latest order status.",
    icon: faReceipt,
  },
  {
    href: "/rewards",
    title: "TRS Rewards",
    text: "View coins, rewards and benefits.",
    icon: faCoins,
  },
  {
    href: "/contact",
    title: "Contact Us",
    text: "Reach the TRS support team.",
    icon: faPhone,
  },
];

const statusItems: StatusItem[] = [
  {
    icon: faTriangleExclamation,
    title: "Temporary Issue",
    text: "A technical error interrupted this page.",
  },
  {
    icon: faClock,
    title: "We Are Working on It",
    text: "Please retry after a moment.",
  },
  {
    icon: faShieldHeart,
    title: "Your Data Is Safe",
    text: "The error page does not expose private information.",
  },
  {
    icon: faCircleCheck,
    title: "Other Pages Still Work",
    text: "You can continue browsing available sections.",
  },
];

const trustItems: StatusItem[] = [
  {
    icon: faUtensils,
    title: "100% Vegetarian",
    text: "Pure vegetarian menu",
  },
  {
    icon: faBagShopping,
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
    title: "Open Daily",
    text: "5:30 PM–11:30 PM",
  },
];

export function ErrorPageClient({
  error,
  reset,
  standalone = false,
}: ErrorPageClientProps) {
  useEffect(() => {
    console.error("TRS application error:", error);
  }, [error]);

  return (
    <main className="overflow-x-hidden bg-[#FFFDF9] text-[#172536]">
      <section className="relative overflow-hidden border-b border-[#EDE3D8] bg-[linear-gradient(135deg,#FFFDF9,#FFF6EC)]">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(#E8A53A_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="relative mx-auto grid min-h-[620px] w-[min(100%-2rem,1320px)] min-w-0 items-center gap-10 py-12 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:py-16">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-3 text-sm font-black italic text-[#C8102E]">
              <span className="h-px w-10 bg-[#E8A53A]" />
              Something Went Wrong
              <span className="h-px w-10 bg-[#E8A53A]" />
            </div>

            <div className="mt-6 flex items-end gap-2">
              <span className="text-[clamp(7rem,18vw,13rem)] font-black leading-[.78] tracking-[-0.08em] text-[#14283B]">
                5
              </span>
              <span className="text-[clamp(7rem,18vw,13rem)] font-black leading-[.78] tracking-[-0.08em] text-[#C8102E]">
                0
              </span>
              <span className="text-[clamp(7rem,18vw,13rem)] font-black leading-[.78] tracking-[-0.08em] text-[#C8102E]">
                0
              </span>
            </div>

            <h1 className="mt-7 max-w-[720px] text-[clamp(2rem,5vw,4rem)] font-black uppercase leading-[.95] tracking-[-0.045em] text-[#14283B]">
              We Hit a <span className="text-[#C8102E]">Roadblock</span>
            </h1>

            <div className="mt-5 flex max-w-[320px] items-center gap-3">
              <span className="h-px flex-1 bg-[#E8A53A]" />
              <span className="text-[#E8A53A]">★</span>
              <span className="h-px flex-1 bg-[#E8A53A]" />
            </div>

            <p className="mt-6 max-w-[580px] text-base leading-8 text-[#4F4943] sm:text-lg">
              A temporary technical issue interrupted this page. Retry now or
              continue exploring another part of the TRS website.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-12 items-center gap-3 rounded-xl bg-[#C8102E] px-6 text-[10px] font-black uppercase text-white shadow-[0_14px_32px_rgba(200,16,46,.2)] transition hover:-translate-y-0.5 hover:bg-[#A50E27]"
              >
                <FontAwesomeIcon icon={faRotateRight} className="h-4" />
                Try Again
                <FontAwesomeIcon icon={faArrowRight} className="h-3" />
              </button>

              <Link
                href="/"
                className="inline-flex h-12 items-center gap-3 rounded-xl border border-[#C8102E] bg-white px-6 text-[10px] font-black uppercase text-[#C8102E] transition hover:bg-[#C8102E] hover:text-white"
              >
                <FontAwesomeIcon icon={faHouse} className="h-4" />
                Go to Home
              </Link>
            </div>

            {error.digest && (
              <p className="mt-5 text-[9px] font-semibold text-[#7A726B]">
                Error reference: {error.digest}
              </p>
            )}
          </div>

          <div className="relative min-h-[360px] min-w-0 sm:min-h-[470px] lg:min-h-[540px]">
            <CmsHeroMedia
              pageKey={standalone ? "global-error" : "error"}
              label="TRS 500 error hero image"
              className="absolute inset-0 rounded-[2rem] border-[#E8D8C9] bg-[linear-gradient(135deg,#FFF4E3,#F5D5B3)] shadow-[0_28px_70px_rgba(88,56,24,.14)]"
            />
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto w-[min(100%-2rem,1240px)] min-w-0">
          <section className="rounded-[2rem] border border-[#EDE3D8] bg-white p-5 shadow-[0_20px_50px_rgba(50,30,15,.06)] sm:p-7">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#C8102E]">
                What Happened?
              </p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.04em] sm:text-3xl">
                This Is Usually Temporary
              </h2>
              <p className="mx-auto mt-3 max-w-[700px] text-[10px] leading-5 text-[#655E57]">
                The page encountered an unexpected application error. Retrying
                often resolves it. You can also continue to another section.
              </p>
            </div>

            <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-[#EDE3D8] bg-[#EDE3D8] sm:grid-cols-2 lg:grid-cols-4">
              {statusItems.map(({ icon, title, text }) => (
                <article
                  key={title}
                  className="min-w-0 bg-[#FFFDF9] p-5 text-center"
                >
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#FFF1E5] text-[#C8102E]">
                    <FontAwesomeIcon icon={icon} className="h-5" />
                  </span>
                  <h3 className="mt-4 text-[10px] font-black uppercase">
                    {title}
                  </h3>
                  <p className="mt-2 text-[9px] leading-4 text-[#655E57]">
                    {text}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="pb-12">
        <div className="mx-auto w-[min(100%-2rem,1240px)] min-w-0">
          <div className="flex items-center justify-center gap-4">
            <span className="h-px w-16 bg-[#E8A53A]" />
            <h2 className="text-center text-xl font-black uppercase tracking-[-0.03em] sm:text-2xl">
              What You Can Do
            </h2>
            <span className="h-px w-16 bg-[#E8A53A]" />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recoveryLinks.map(({ href, title, text, icon }) => (
              <Link
                key={href}
                href={href}
                className="group min-w-0 rounded-2xl border border-[#EDE3D8] bg-white p-5 transition hover:-translate-y-1 hover:border-[#C8102E] hover:shadow-[0_16px_38px_rgba(50,30,15,.08)]"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#FFF1E5] text-[#D99219] transition group-hover:bg-[#C8102E] group-hover:text-white">
                  <FontAwesomeIcon icon={icon} className="h-5" />
                </span>

                <h3 className="mt-5 text-sm font-black uppercase">{title}</h3>
                <p className="mt-2 text-[10px] leading-5 text-[#655E57]">
                  {text}
                </p>

                <span className="mt-5 inline-flex items-center gap-2 text-[9px] font-black uppercase text-[#C8102E]">
                  Open Page
                  <FontAwesomeIcon
                    icon={faArrowRight}
                    className="h-3 transition group-hover:translate-x-1"
                  />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-12">
        <div className="mx-auto grid w-[min(100%-2rem,1240px)] min-w-0 gap-5 rounded-[2rem] border border-[#EDE3D8] bg-[linear-gradient(135deg,#FFF8ED,#FFF1E2)] p-5 shadow-[0_18px_42px_rgba(50,30,15,.05)] sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#C8102E]">
              Still Need Help?
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.04em]">
              Contact TRS Support
            </h2>
            <p className="mt-3 text-[10px] leading-5 text-[#655E57]">
              For an order-related issue, keep your order ID and registered
              mobile number ready.
            </p>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-[10px] font-semibold text-[#172536]">
              <a href="tel:+919166694786" className="flex items-center gap-2">
                <FontAwesomeIcon icon={faPhone} className="h-4 text-[#C8102E]" />
                +91 91666 94786
              </a>
              <p className="flex items-center gap-2">
                <FontAwesomeIcon
                  icon={faLocationDot}
                  className="h-4 text-[#D99219]"
                />
                Shastri Circle, Sector-H, Jodhpur
              </p>
            </div>
          </div>

          <Link
            href="/contact"
            className="inline-flex h-12 shrink-0 items-center justify-center gap-3 rounded-xl bg-[#C8102E] px-6 text-[10px] font-black uppercase text-white"
          >
            Contact Us
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

      {standalone && (
        <style jsx global>{`
          html,
          body {
            margin: 0;
            background: #fffdf9;
            font-family: Arial, Helvetica, sans-serif;
          }

          * {
            box-sizing: border-box;
          }
        `}</style>
      )}
    </main>
  );
}
