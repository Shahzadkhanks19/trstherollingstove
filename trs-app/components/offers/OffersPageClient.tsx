"use client";

import { CmsHeroMedia } from "@/components/site/CmsHeroMedia";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faArrowRight,
  faClock,
  faCoins,
  faCopy,
  faFire,
  faGift,
  faPercent,
  faShieldHeart,
  faTags,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import { SpinWheel } from "@/components/site/SpinWheel";
import type { MenuItemSummary } from "@/types/menu";

type PublicCoupon = {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: "percentage" | "fixed" | "free_item";
  discountValue: number;
  freeItemName: string;
  maxDiscountAmount: number | null;
  minimumOrderAmount: number;
  startsAt: string;
  expiresAt: string;
  firstOrderOnly: boolean;
  publicOfferPlacement: "permanent" | "everyday";
};

type OffersPageClientProps = {
  combos: MenuItemSummary[];
  permanentCombos: MenuItemSummary[];
  permanentCoupons: PublicCoupon[];
  everydayCoupons: PublicCoupon[];
};

const heroBenefits: Array<{
  title: string;
  description: string;
  icon: IconDefinition;
}> = [
  { title: "Best prices", description: "Guaranteed value", icon: faTags },
  { title: "Limited time", description: "Fresh offers", icon: faClock },
  { title: "Exclusive", description: "Online offers", icon: faPercent },
  { title: "New deals", description: "Managed live", icon: faGift },
];

function money(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function couponSummary(coupon: PublicCoupon): string {
  const discount =
    coupon.discountType === "percentage"
      ? `${coupon.discountValue}% off`
      : coupon.discountType === "fixed"
        ? `${money(coupon.discountValue)} off`
        : `Free ${coupon.freeItemName || "menu item"}`;

  const cap =
    coupon.discountType === "percentage" && coupon.maxDiscountAmount
      ? ` up to ${money(coupon.maxDiscountAmount)}`
      : "";

  const minimum = coupon.minimumOrderAmount
    ? ` on orders above ${money(coupon.minimumOrderAmount)}`
    : "";

  return `${discount}${cap}${minimum}.`;
}

function comboDescription(combo: MenuItemSummary): string[] {
  if (combo.shortDescription?.trim()) {
    return combo.shortDescription
      .split(/\n|\s*\+\s*|\s*•\s*/)
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  return ["Open this combo to view included items and available choices."];
}

function CouponOfferCard({
  coupon,
  copiedCode,
  onCopy,
}: {
  coupon: PublicCoupon;
  copiedCode: string | null;
  onCopy: (code: string) => Promise<void>;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-[#EDE3D8] bg-white p-5 shadow-[0_12px_30px_rgba(50,30,15,.05)] transition hover:-translate-y-1 hover:shadow-[0_20px_42px_rgba(50,30,15,.09)] sm:p-6">
      <div className="flex min-w-0 gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-[#F1D7BA] bg-[#FFF8ED] text-[#D27C0C]">
          <FontAwesomeIcon icon={coupon.firstOrderOnly ? faGift : faPercent} className="h-6" />
        </span>
        <div className="min-w-0">
          <h3 className="break-words text-sm font-black uppercase text-[#172536]">{coupon.name}</h3>
          <p className="mt-2 text-xs font-medium leading-5 text-[#6F665D]">
            {coupon.description || couponSummary(coupon)}
          </p>
          <p className="mt-2 text-xs font-black text-[#C8102E]">{couponSummary(coupon)}</p>
          <button
            type="button"
            onClick={() => void onCopy(coupon.code)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#E8D8CA] px-3 py-2 text-[10px] font-black uppercase text-[#172536] transition hover:border-[#C8102E] hover:text-[#C8102E]"
          >
            <FontAwesomeIcon icon={faCopy} className="h-3" />
            {copiedCode === coupon.code ? "Code copied" : `Use code: ${coupon.code}`}
          </button>
        </div>
      </div>
    </article>
  );
}

export function OffersPageClient({
  combos = [],
  permanentCombos = [],
  permanentCoupons = [],
  everydayCoupons = [],
}: Partial<OffersPageClientProps>) {
  const [activeOfferIndex, setActiveOfferIndex] = useState(0);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const offersSliderRef = useRef<HTMLDivElement>(null);

  function scrollOffers(direction: "previous" | "next") {
    const slider = offersSliderRef.current;
    if (!slider) return;

    const firstCard = slider.querySelector<HTMLElement>("[data-offer-card]");
    const cardWidth = firstCard?.offsetWidth ?? slider.clientWidth;
    const computedGap = Number.parseFloat(
      window.getComputedStyle(slider).columnGap || window.getComputedStyle(slider).gap || "16",
    );
    const distance = cardWidth + (Number.isFinite(computedGap) ? computedGap : 16);

    slider.scrollBy({
      left: direction === "next" ? distance : -distance,
      behavior: "smooth",
    });
  }

  function updateActiveOffer() {
    const slider = offersSliderRef.current;
    if (!slider) return;

    const cards = Array.from(
      slider.querySelectorAll<HTMLElement>("[data-offer-card]"),
    );

    if (cards.length === 0) return;

    const sliderLeft = slider.getBoundingClientRect().left;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const distance = Math.abs(card.getBoundingClientRect().left - sliderLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActiveOfferIndex(closestIndex);
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(null), 1800);
    } catch {
      setCopiedCode(null);
    }
  }

  return (
    <main className="overflow-x-hidden bg-[#FFFDF9] text-[#172536]">
      <section className="relative overflow-hidden border-b border-[#EDE3D8] bg-[#FFF8F2]">
        <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(#E8CDAF_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="absolute -left-24 top-20 h-64 w-64 rounded-full bg-[#E8A53A]/10 blur-3xl" />
        <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-[#C8102E]/10 blur-3xl" />

        <div className="relative mx-auto grid min-h-[500px] w-[min(100%-2rem,1320px)] min-w-0 items-center gap-10 py-12 sm:py-14 lg:grid-cols-[minmax(0,.92fr)_minmax(0,1.08fr)] lg:py-16">
          <div>
            <span className="inline-flex items-center rounded-sm bg-[#F3D69E] px-4 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-[#3A2A17] shadow-sm">
              Great food. Great deals.
            </span>

            <h1 className="mt-5 max-w-[680px] break-words text-[clamp(2.7rem,11vw,6.4rem)] font-black uppercase leading-[.88] tracking-[-0.055em] text-[#14283B]">
              Delicious offers
              <span className="mt-1 block text-[#C8102E]">you&apos;ll love!</span>
            </h1>

            <p className="mt-6 max-w-[540px] text-base font-medium leading-7 text-[#403A34] sm:text-lg">
              Enjoy exciting combos, exclusive discounts and limited-time deals
              on your favourite vegetarian food.
            </p>

            <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {heroBenefits.map(({ title, description, icon }) => (
                <div key={title} className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#F0C7C7] bg-white text-[#C8102E] shadow-sm">
                    <FontAwesomeIcon icon={icon} className="h-4" />
                  </span>
                  <span>
                    <strong className="block text-[10px] font-black uppercase text-[#1D252D]">
                      {title}
                    </strong>
                    <span className="mt-0.5 block text-[10px] text-[#6F665D]">
                      {description}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[300px] min-w-0 sm:min-h-[360px] lg:min-h-[430px]">
            <CmsHeroMedia
              pageKey="offers"
              label="Offers hero: food truck, pizza, fries and mocktail"
              className="absolute inset-0 rounded-[2rem] shadow-[0_30px_70px_rgba(50,32,16,.12)]"
            />
            <div className="absolute bottom-5 left-5 rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-lg backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#C8102E] text-white">
                  <FontAwesomeIcon icon={faFire} className="h-4" />
                </span>
                <span>
                  <strong className="block text-[11px] font-black uppercase">Fresh weekly deals</strong>
                  <span className="text-[10px] text-[#6E655C]">Updated through the offers system</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto w-[min(100%-2rem,1320px)]">
          <SectionTitle title="Today's Hot Offers" icon={faFire} />

          {everydayCoupons.length > 0 ? (
            <div className="mt-7 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {everydayCoupons.map((coupon) => (
                <CouponOfferCard
                  key={coupon.id}
                  coupon={coupon}
                  copiedCode={copiedCode}
                  onCopy={copyCode}
                />
              ))}
            </div>
          ) : null}

          <div className={`relative min-w-0 overflow-hidden rounded-[1.6rem] border border-[#EDE3D8] bg-white p-2 shadow-[0_18px_45px_rgba(50,30,15,.06)] sm:p-5 ${everydayCoupons.length > 0 ? "mt-5" : "mt-7"}`}>
            {combos.length > 0 ? (
            <div
              ref={offersSliderRef}
              onScroll={updateActiveOffer}
              className="flex min-w-0 touch-pan-x snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-4"
              aria-label="Today's hot offers"
            >
              {combos.map((offer, index) => (
                <article
                  key={offer.id}
                  data-offer-card
                  className="group min-w-0 flex-[0_0_100%] snap-start snap-always overflow-hidden rounded-2xl border border-[#EDE3D8] bg-[#FFFDF9] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_35px_rgba(42,27,15,.1)] sm:flex-[0_0_calc(50%-0.5rem)] lg:flex-[0_0_calc(33.333%-0.67rem)] xl:flex-[0_0_calc(25%-0.75rem)]"
                >
                  <div className="relative h-44 p-3 sm:h-48">
                    <div className="relative h-full overflow-hidden rounded-xl bg-[#f8f3ed]">
                      {offer.thumbnail?.url ? (
                        <Image
                          src={offer.thumbnail.url}
                          alt={offer.thumbnail.alt || offer.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 25vw"
                          className="object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : null}
                    </div>
                    <span
                      className={`absolute left-4 top-4 max-w-[calc(100%-2rem)] truncate rounded-lg px-3 py-2 text-[9px] font-black uppercase text-white ${
                        index % 2 === 0 ? "bg-[#C8102E]" : "bg-[#14283B]"
                      }`}
                    >
                      {offer.isBestseller ? "Bestseller Combo" : offer.isNew ? "New Combo" : "Combo Offer"}
                    </span>
                  </div>

                  <div className="px-4 pb-5 pt-2 sm:px-5">
                    <h2 className="break-words text-base font-black uppercase tracking-[-0.03em] text-[#172536] sm:text-lg">
                      {offer.name}
                    </h2>
                    <ul className="mt-3 min-h-[86px] space-y-1 text-[11px] font-medium leading-4 text-[#4F4943]">
                      {comboDescription(offer).map((line) => (
                        <li key={line} className="break-words">+ {line}</li>
                      ))}
                    </ul>

                    <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-2xl font-black text-[#C8102E]">
                          {money(offer.priceFrom)}
                        </span>
                        {offer.compareAtPriceFrom &&
                        offer.compareAtPriceFrom > offer.priceFrom ? (
                          <span className="ml-2 text-sm font-bold text-[#8C8580] line-through sm:ml-3">
                            {money(offer.compareAtPriceFrom)}
                          </span>
                        ) : null}
                      </div>
                      {offer.compareAtPriceFrom &&
                      offer.compareAtPriceFrom > offer.priceFrom ? (
                        <span
                          className={`shrink-0 rounded-lg px-2.5 py-2 text-[9px] font-black uppercase text-white ${
                            index % 2 === 0 ? "bg-[#C8102E]" : "bg-[#14283B]"
                          }`}
                        >
                          {Math.round(
                            ((offer.compareAtPriceFrom - offer.priceFrom) /
                              offer.compareAtPriceFrom) *
                              100,
                          )}
                          % off
                        </span>
                      ) : null}
                    </div>

                    <Link
                      href={`/menu/${offer.slug}`}
                      className="mt-5 flex h-11 items-center justify-center gap-3 rounded-xl border border-[#C8102E] text-[10px] font-black uppercase text-[#C8102E] transition hover:bg-[#C8102E] hover:text-white"
                    >
                      Order Now
                      <FontAwesomeIcon icon={faArrowRight} className="h-3" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#dfcbb9] bg-[#FFFDF9] px-6 py-12 text-center text-sm font-semibold text-[#756b63]">
                No active combo items are available. Add or reactivate combo items from the admin menu dashboard.
              </div>
            )}

            {combos.length > 1 ? (
            <button
              type="button"
              onClick={() => scrollOffers("previous")}
              aria-label="Show previous hot offer"
              className="absolute left-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 rotate-180 place-items-center rounded-full border border-[#E5D9CD] bg-white/95 text-[#172536] shadow-lg transition hover:bg-[#C8102E] hover:text-white sm:grid"
            >
              <FontAwesomeIcon icon={faArrowRight} className="h-4" />
            </button>
            ) : null}

            {combos.length > 1 ? (
            <button
              type="button"
              onClick={() => scrollOffers("next")}
              aria-label="Show next hot offer"
              className="absolute right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[#E5D9CD] bg-white/95 text-[#172536] shadow-lg transition hover:bg-[#C8102E] hover:text-white sm:grid"
            >
              <FontAwesomeIcon icon={faArrowRight} className="h-4" />
            </button>
            ) : null}
          </div>

          {combos.length > 1 ? (
          <div className="mt-4 flex justify-center gap-2">
            {combos.map((offer, index) => (
              <button
                key={offer.id}
                type="button"
                onClick={() => {
                  const slider = offersSliderRef.current;
                  const card = slider?.querySelectorAll<HTMLElement>("[data-offer-card]")[index];
                  if (slider && card) {
                    slider.scrollTo({
                      left: card.offsetLeft,
                      behavior: "smooth",
                    });
                  }
                }}
                aria-label={`Show ${offer.name}`}
                aria-current={index === activeOfferIndex ? "true" : undefined}
                className={`h-2 rounded-full transition-all ${
                  index === activeOfferIndex ? "w-6 bg-[#C8102E]" : "w-2 bg-[#E6D9CA]"
                }`}
              />
            ))}
          </div>
          ) : null}
        </div>
      </section>

      <section className="pb-12">
        <div className="mx-auto grid w-[min(100%-2rem,1240px)] min-w-0 gap-5 lg:grid-cols-2">
          <div className="min-w-0 rounded-3xl border border-[#EDE3D8] bg-white p-5 shadow-[0_22px_46px_rgba(50,30,15,.08)] sm:p-7">
            <SpinWheel />
          </div>

          <div className="relative min-w-0 overflow-hidden rounded-3xl border border-[#A50E27] bg-[linear-gradient(135deg,#B40008,#7E0007)] p-6 text-white shadow-[0_22px_46px_rgba(137,0,8,.18)] sm:p-8">
            <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#FFD24D]/15 blur-2xl" />
            <div className="absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-[#F6C92C]/10 blur-3xl" />

            <div className="relative grid min-h-[340px] items-center gap-7 sm:grid-cols-2">
              <div className="flex min-w-0 items-center justify-center">
                <div className="relative h-[250px] w-[250px] sm:h-[280px] sm:w-[280px] lg:h-[300px] lg:w-[300px]">
                  <Image
                    src="/images/offers/trs-coin.png"
                    alt="TRS Coin"
                    fill
                    sizes="(max-width: 640px) 250px, (max-width: 1024px) 280px, 300px"
                    className="object-contain drop-shadow-[0_22px_38px_rgba(0,0,0,0.4)] transition-transform duration-300 hover:scale-105"
                  />
                </div>
              </div>

              <div className="flex min-w-0 flex-col justify-center text-center sm:text-left">
                <span className="mx-auto inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#FFD24D] sm:mx-0">
                  <FontAwesomeIcon icon={faCoins} className="h-3" />
                  Loyalty rewards
                </span>

                <h2 className="mt-4 text-3xl font-black uppercase leading-[0.95] tracking-[-0.04em] text-[#FFD24D] sm:text-4xl">
                  Earn TRS Coins
                </h2>

                <p className="mt-4 text-sm font-semibold leading-6">
                  Get 5 TRS Coins for every ₹100 spent.
                </p>
                <p className="mt-1 text-xs text-white/80">
                  1 TRS Coin = ₹1 discount on eligible future orders.
                </p>

                <Link
                  href="/rewards"
                  className="mx-auto mt-6 inline-flex h-11 w-fit items-center gap-3 rounded-xl bg-[#F6C92C] px-5 text-[10px] font-black uppercase text-[#2D2407] transition hover:-translate-y-0.5 sm:mx-0"
                >
                  Know More
                  <FontAwesomeIcon icon={faArrowRight} className="h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-14 sm:pb-16">
        <div className="mx-auto w-[min(100%-2rem,1320px)]">
          <SectionTitle title="More Exciting Offers" icon={faTags} />


          {permanentCombos.length > 0 ? (
            <div className="mt-7 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {permanentCombos.map((combo) => (
                <article key={combo.id} className="overflow-hidden rounded-2xl border border-[#EDE3D8] bg-white shadow-[0_12px_30px_rgba(50,30,15,.05)]">
                  <div className="relative h-40 bg-[#f8f3ed]">{combo.thumbnail?.url ? <Image src={combo.thumbnail.url} alt={combo.thumbnail.alt || combo.name} fill className="object-cover" /> : null}</div>
                  <div className="p-5"><span className="rounded-lg bg-[#14283B] px-2.5 py-1.5 text-[9px] font-black uppercase text-white">Permanent Combo</span><h3 className="mt-3 text-sm font-black uppercase text-[#172536]">{combo.name}</h3><p className="mt-2 text-xs text-[#6F665D]">{combo.shortDescription || "Open this combo to view included items and choices."}</p><div className="mt-4 flex items-center gap-2"><strong className="text-xl font-black text-[#C8102E]">{money(combo.priceFrom)}</strong>{combo.compareAtPriceFrom && combo.compareAtPriceFrom > combo.priceFrom ? <span className="text-sm font-bold text-[#8C8580] line-through">{money(combo.compareAtPriceFrom)}</span> : null}</div><Link href={`/menu/${combo.slug}`} className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase text-[#C8102E]">View combo <FontAwesomeIcon icon={faArrowRight} className="h-3" /></Link></div>
                </article>
              ))}
            </div>
          ) : null}

          {permanentCoupons.length > 0 ? (
          <div className="mt-7 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {permanentCoupons.map((coupon) => (
              <article
                key={coupon.id}
                className="min-w-0 rounded-2xl border border-[#EDE3D8] bg-white p-5 sm:p-6 shadow-[0_12px_30px_rgba(50,30,15,.05)] transition hover:-translate-y-1 hover:shadow-[0_20px_42px_rgba(50,30,15,.09)]"
              >
                <div className="flex min-w-0 gap-4">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-[#F1D7BA] bg-[#FFF8ED] text-[#D27C0C]">
                    <FontAwesomeIcon
                      icon={coupon.firstOrderOnly ? faGift : faPercent}
                      className="h-6"
                    />
                  </span>
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-black uppercase text-[#172536]">
                      {coupon.name}
                    </h3>
                    <p className="mt-2 text-[11px] leading-5 text-[#5D554E]">
                      {coupon.description || couponSummary(coupon)}
                    </p>
                    <p className="mt-2 text-[10px] font-bold text-[#756b63]">
                      {couponSummary(coupon)}
                    </p>
                    <button
                      type="button"
                      onClick={() => copyCode(coupon.code)}
                      className="mt-3 inline-flex items-center gap-2 text-[10px] font-black uppercase text-[#C8102E]"
                    >
                      <FontAwesomeIcon icon={faCopy} className="h-3" />
                      {copiedCode === coupon.code
                        ? "Copied"
                        : `Use code: ${coupon.code}`}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          ) : permanentCombos.length === 0 ? (
            <div className="mt-7 rounded-2xl border border-dashed border-[#dfcbb9] bg-white px-6 py-10 text-center text-sm font-semibold text-[#756b63]">
              No public coupons are active right now.
            </div>
          ) : null}

          <div className="mt-7 flex min-w-0 flex-col gap-4 rounded-2xl border border-[#F0D5B4] bg-[#FFF3DF] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#E2B675] bg-white text-[#D27C0C]">
                <FontAwesomeIcon icon={faShieldHeart} className="h-5" />
              </span>
              <div>
                <strong className="text-sm font-black uppercase text-[#C8102E]">Offer validity</strong>
                <p className="mt-1 text-[11px] leading-5 text-[#4E463E]">
                  Offer dates, eligibility, usage limits and availability are controlled through the admin dashboard.
                </p>
              </div>
            </div>
            <Link
              href="/terms"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-3 rounded-xl bg-[#C8102E] px-6 text-[10px] font-black uppercase text-white transition hover:bg-[#A50E27]"
            >
              View Terms &amp; Conditions
              <FontAwesomeIcon icon={faArrowRight} className="h-3" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function SectionTitle({ title, icon }: { title: string; icon: IconDefinition }) {
  return (
    <div className="flex items-center justify-center gap-4 text-center">
      <span className="hidden h-px w-14 bg-[#D89B3A] sm:block" />
      <FontAwesomeIcon icon={faCoins} className="h-3 text-[#D89B3A]" />
      <h2 className="min-w-0 break-words text-xl font-black uppercase tracking-[-0.035em] text-[#172536] sm:text-3xl">
        {title}
      </h2>
      <FontAwesomeIcon icon={icon} className="h-4 text-[#C8102E]" />
      <span className="hidden h-px w-14 bg-[#D89B3A] sm:block" />
    </div>
  );
}
