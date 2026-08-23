"use client";

import { CmsHeroMedia } from "@/components/site/CmsHeroMedia";
import type { FormEvent } from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faClock,
  faCoins,
  faHouse,
  faMagnifyingGlass,
  faPhone,
  faReceipt,
  faShieldHeart,
  faStore,
  faTags,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type RecoveryLink = {
  href: string;
  title: string;
  text: string;
  icon: IconDefinition;
};

type TrustItem = {
  title: string;
  text: string;
  icon: IconDefinition;
};

const recoveryLinks: RecoveryLink[] = [
  {
    href: "/",
    title: "Home",
    text: "Return to the TRS homepage",
    icon: faHouse,
  },
  {
    href: "/menu",
    title: "Menu",
    text: "Browse pizzas, naans and more",
    icon: faUtensils,
  },
  {
    href: "/offers",
    title: "Offers",
    text: "Explore current deals and combos",
    icon: faTags,
  },
  {
    href: "/track-order",
    title: "Track Order",
    text: "Check the latest order status",
    icon: faReceipt,
  },
  {
    href: "/rewards",
    title: "Rewards",
    text: "View TRS Coins and benefits",
    icon: faCoins,
  },
  {
    href: "/contact",
    title: "Contact",
    text: "Reach the TRS support team",
    icon: faPhone,
  },
];

const trustItems: TrustItem[] = [
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
    title: "Open Daily",
    text: "5:30 PM–11:30 PM",
  },
];

export function NotFoundPageClient() {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");

  const submitSearch = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const query = searchValue.trim();

    if (!query) return;

    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <main className="overflow-x-hidden bg-[#FFFDF9] text-[#172536]">
      <section className="relative overflow-hidden border-b border-[#EDE3D8] bg-[linear-gradient(135deg,#FFFDF9,#FFF6EC)]">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(#E8A53A_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="relative mx-auto grid min-h-[620px] w-[min(100%-2rem,1320px)] min-w-0 items-center gap-10 py-12 lg:grid-cols-[minmax(0,.78fr)_minmax(0,1.22fr)] lg:py-16">
          <div className="min-w-0">
            <div className="flex items-end gap-1 sm:gap-2">
              <span className="text-[clamp(7rem,18vw,13rem)] font-black leading-[.78] tracking-[-0.08em] text-[#14283B]">
                4
              </span>
              <span className="text-[clamp(7rem,18vw,13rem)] font-black leading-[.78] tracking-[-0.08em] text-[#C8102E]">
                0
              </span>
              <span className="text-[clamp(7rem,18vw,13rem)] font-black leading-[.78] tracking-[-0.08em] text-[#14283B]">
                4
              </span>
            </div>

            <h1 className="mt-7 max-w-[680px] text-[clamp(2rem,5vw,4rem)] font-black uppercase leading-[.95] tracking-[-0.045em] text-[#14283B]">
              Oops! <span className="text-[#C8102E]">Page Not Found</span>
            </h1>

            <div className="mt-5 flex max-w-[320px] items-center gap-3">
              <span className="h-px flex-1 bg-[#E8A53A]" />
              <span className="text-[#E8A53A]">★</span>
              <span className="h-px flex-1 bg-[#E8A53A]" />
            </div>

            <p className="mt-6 max-w-[560px] text-base leading-8 text-[#4F4943] sm:text-lg">
              Looks like you wandered off the menu. The page you are looking
              for does not exist, may have moved or is temporarily
              unavailable.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex h-12 items-center gap-3 rounded-xl bg-[#C8102E] px-6 text-[10px] font-black uppercase text-white shadow-[0_14px_32px_rgba(200,16,46,.2)] transition hover:-translate-y-0.5 hover:bg-[#A50E27]"
              >
                <FontAwesomeIcon icon={faHouse} className="h-4" />
                Go to Home
                <FontAwesomeIcon icon={faArrowRight} className="h-3" />
              </Link>

              <Link
                href="/menu"
                className="inline-flex h-12 items-center gap-3 rounded-xl border border-[#C8102E] bg-white px-6 text-[10px] font-black uppercase text-[#C8102E] transition hover:bg-[#C8102E] hover:text-white"
              >
                View Menu
                <FontAwesomeIcon icon={faArrowRight} className="h-3" />
              </Link>
            </div>
          </div>

          <div className="relative min-h-[340px] min-w-0 sm:min-h-[460px] lg:min-h-[520px]">
            <CmsHeroMedia
              pageKey="not-found"
              label="TRS 404 hero image"
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
                Let&apos;s Get You Back on Track
              </p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.04em] sm:text-3xl">
                Try one of these pages
              </h2>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recoveryLinks.map(({ href, title, text, icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="group min-w-0 rounded-2xl border border-[#EDE3D8] bg-[#FFFDF9] p-5 transition hover:-translate-y-1 hover:border-[#C8102E] hover:shadow-[0_16px_38px_rgba(50,30,15,.08)]"
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
          </section>
        </div>
      </section>

      <section className="pb-12">
        <div className="mx-auto grid w-[min(100%-2rem,1240px)] min-w-0 gap-5 rounded-[2rem] border border-[#EDE3D8] bg-[linear-gradient(135deg,#FFF8ED,#FFF1E2)] p-5 shadow-[0_18px_42px_rgba(50,30,15,.05)] sm:p-7 lg:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)] lg:items-center">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#C8102E]">
              Still Can&apos;t Find It?
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.04em]">
              Search the TRS Website
            </h2>
            <p className="mt-3 text-[10px] leading-5 text-[#655E57]">
              Search for menu items, offers, rewards, policies or help pages.
            </p>
          </div>

          <form
            onSubmit={submitSearch}
            className="flex min-w-0 flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="site-search" className="sr-only">
              Search the TRS website
            </label>
            <input
              id="site-search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search pizzas, offers, rewards or pages..."
              className="h-12 min-w-0 flex-1 rounded-xl border border-[#E5D9CD] bg-white px-4 text-sm outline-none transition placeholder:text-[#9C938A] focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10"
            />
            <button
              type="submit"
              aria-label="Search"
              className="grid h-12 w-full place-items-center rounded-xl bg-[#172536] text-white transition hover:bg-[#C8102E] sm:w-14"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4" />
            </button>
          </form>
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
