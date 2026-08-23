import { CmsHeroMedia } from "@/components/site/CmsHeroMedia";
import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faArrowRight,
  faBagShopping,
  faCartShopping,
  faCheck,
  faCoins,
  faCreditCard,
  faGift,
  faLeaf,
  faLocationDot,
  faMedal,
  faPizzaSlice,
  faShieldHalved,
  faStar,
  faStore,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import { SpinWheel } from "@/components/site/SpinWheel";
import { GoogleReviews } from "@/components/site/GoogleReviews";
import { HomeBestsellers } from "@/components/site/HomeBestsellers";
import { getPublicMenuItems } from "@/lib/menu-public-data";

const trustItems = [
  [faMedal, "9 Years of Trust", "Serving Jodhpur since 2016"],
  [faLeaf, "100% Pure Veg", "Pure vegetarian comfort food"],
  [faUtensils, "Fresh Ingredients", "Quality cheese, sauces and veggies"],
  [faCoins, "Earn TRS Coins", "5 coins for every ₹100 spent"],
  [faShieldHalved, "Secure Payments", "Multiple trusted payment options"],
  [faBagShopping, "Dine-In or Takeaway", "Enjoy your order your way"],
] as const;

const steps = [
  [faUtensils, "Browse Menu", "Choose your favourites"],
  [faCartShopping, "Add to Cart", "Add items and review"],
  [faLocationDot, "Choose Option", "Dine-in or takeaway"],
  [faCreditCard, "Make Payment", "Pay securely online"],
  [faCoins, "Earn Coins", "Get 5 coins per ₹100"],
  [faPizzaSlice, "Enjoy Food", "We prepare, you enjoy"],
] as const;

type HomeCta = {
  icon: IconDefinition;
  title: string;
  text: string;
  href: string;
};

const homeCtas: readonly HomeCta[] = [
  {
    icon: faGift,
    title: "Explore Offers",
    text: "Discover fresh deals and value combos.",
    href: "/offers",
  },
  {
    icon: faStore,
    title: "Prebook Your Food",
    text: "Order ahead for dine-in and skip preparation waiting.",
    href: "/menu",
  },
  {
    icon: faCheck,
    title: "Track Your Order",
    text: "Check preparation and pickup status.",
    href: "/track-order",
  },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-3 text-center">
      <span className="h-px w-10 bg-[#E8A53A] sm:w-16" />
      <FontAwesomeIcon icon={faStar} className="h-2.5 text-[#E8A53A]" />
      <h2 className="text-[17px] font-black uppercase tracking-[-0.03em] text-[#28231f] sm:text-[22px]">
        {children}
      </h2>
      <FontAwesomeIcon icon={faStar} className="h-2.5 text-[#E8A53A]" />
      <span className="h-px w-10 bg-[#E8A53A] sm:w-16" />
    </div>
  );
}

const HOME_CATEGORY_IMAGES: Record<string, string> = {
  pizza: "/images/home/pizza.webp",
  pizzas: "/images/home/pizza.webp",
  "chur-chur-naan": "/images/home/naan.webp",
  naan: "/images/home/naan.webp",
  pasta: "/images/home/pasta.webp",
  "garlic-bread": "/images/home/garlic-bread.webp",
  fries: "/images/home/fries.webp",
  "french-fries": "/images/home/fries.webp",
  brownie: "/images/home/brownie.webp",
  brownies: "/images/home/brownie.webp",
  mocktail: "/images/home/mocktail.webp",
  mocktails: "/images/home/mocktail.webp",
};

const TRS_COINS_IMAGE = "/images/home/trs-coins.webp";
const GIFT_BOX_IMAGE = "/images/home/gift.webp";

function isComboCategory(name: string, slug: string): boolean {
  return `${name} ${slug}`.toLowerCase().includes("combo");
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const menuItems = (await getPublicMenuItems()).filter((item) => item.isAvailable);
  const categoryMap = new Map<string, { id: string; name: string; slug: string; count: number }>();

  for (const item of menuItems) {
    const existing = categoryMap.get(item.category.id);
    if (existing) {
      existing.count += 1;
    } else {
      categoryMap.set(item.category.id, {
        id: item.category.id,
        name: item.category.name,
        slug: item.category.slug,
        count: 1,
      });
    }
  }

  const categories = Array.from(categoryMap.values());
  const combos = menuItems.filter((item) =>
    isComboCategory(item.category.name, item.category.slug),
  );
  return (
    <div className="overflow-hidden bg-[#FFFDF9] text-[#29241f]">
      <section className="relative border-b border-[#eee2d7] bg-[radial-gradient(circle_at_10%_15%,rgba(222,144,34,.10),transparent_27%),linear-gradient(90deg,#FFFDF9_0%,#FFFDF9_46%,#f5f8fa_100%)]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.055] [background-image:radial-gradient(#cf8c38_1px,transparent_1px)] [background-size:27px_27px]" />
        <div className="relative mx-auto grid min-h-[590px] w-[min(100%-2rem,1280px)] items-center gap-8 py-10 lg:grid-cols-[.78fr_1.22fr] lg:py-6">
          <div className="z-10 py-5">
            <p className="font-[family-name:var(--font-display)] text-[24px] font-bold italic text-[#233746] sm:text-[29px]">
              — Jodhpur&apos;s Favourite Food Truck —
            </p>
            <h1 className="mt-3 text-[clamp(3.8rem,7.3vw,7rem)] font-black uppercase leading-[.82] tracking-[-.065em] text-[#102d42]">
              Pizza&apos;s
              <span className="mt-2 block text-[#C8102E]">Best Friend</span>
            </h1>
            <p className="mt-5 font-[family-name:var(--font-display)] text-[27px] font-bold italic text-[#d28315] sm:text-[33px]">
              Pizza · Chur-Chur Naan · Happiness
            </p>
            <p className="mt-5 max-w-[510px] text-sm font-semibold leading-7 text-[#514a43] sm:text-[15px]">
              From cheesy pizzas to signature chur-chur naan, we serve fresh,
              hot and irresistible vegetarian food.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-[10px] font-black uppercase sm:text-[11px]">
              <span className="flex items-center gap-2">
                <FontAwesomeIcon icon={faLeaf} className="h-5 text-[#d68a17]" />
                100% Veg
              </span>
              <span className="flex items-center gap-2">
                <FontAwesomeIcon
                  icon={faUtensils}
                  className="h-5 text-[#C8102E]"
                />
                Fresh Ingredients
              </span>
              <span className="flex items-center gap-2">
                <FontAwesomeIcon
                  icon={faStore}
                  className="h-5 text-[#C8102E]"
                />
                Serving Since 2016
              </span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/menu"
                className="inline-flex h-12 items-center gap-4 rounded-xl bg-[#C8102E] px-6 text-[11px] font-black uppercase text-white shadow-[0_14px_28px_rgba(215,25,32,.23)] transition hover:-translate-y-0.5 hover:bg-[#A50E27]"
              >
                Order Now{" "}
                <FontAwesomeIcon icon={faArrowRight} className="h-3" />
              </Link>
              <Link
                href="/menu"
                className="inline-flex h-12 items-center gap-4 rounded-xl border border-[#aab0b5] bg-white px-6 text-[11px] font-black uppercase transition hover:border-[#C8102E] hover:text-[#C8102E]"
              >
                Explore Menu{" "}
                <FontAwesomeIcon icon={faArrowRight} className="h-3" />
              </Link>
            </div>
          </div>
          <CmsHeroMedia
            pageKey="home"
            label="The Rolling Stove home hero image"
            fallbackSrc="/images/hero/home-hero.webp"
            fallbackAlt="The Rolling Stove Food Truck"
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="h-[370px] rounded-[28px] sm:h-[460px] lg:h-[520px]"
          />
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-4 w-[min(100%-2rem,1240px)] rounded-[22px] border border-[#EDE3D8] bg-white px-3 pb-3 pt-3 shadow-[0_12px_32px_rgba(68,43,21,.07)] sm:px-5 sm:pb-5">
        <SectionTitle>Explore Our Menu</SectionTitle>
        <div className="mt-3 grid grid-cols-2 divide-x divide-y divide-[#ede4dc] sm:grid-cols-4 lg:grid-cols-7 lg:divide-y-0">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/menu?category=${encodeURIComponent(category.slug)}`}
              className="group flex min-h-[150px] flex-col items-center justify-center px-3 py-4 text-center transition hover:bg-[#FFFDF9]"
            >
              <div className="relative h-[74px] w-[96px] overflow-hidden rounded-xl bg-[#f8f3ed] transition duration-300 group-hover:-translate-y-1">
                {HOME_CATEGORY_IMAGES[category.slug] ? (
                  <Image
                    src={HOME_CATEGORY_IMAGES[category.slug]}
                    alt={`${category.name} category`}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <h3 className="mt-3 text-[10px] font-black uppercase">{category.name}</h3>
              <p className="mt-1 text-[8px] font-semibold text-[#756b63]">
                {category.count} active item{category.count === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-4 w-[min(100%-2rem,1240px)] overflow-hidden rounded-[20px] border border-[#EDE3D8] bg-white shadow-[0_10px_28px_rgba(68,43,21,.04)]">
        <div className="grid divide-y divide-[#ece3db] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-6">
          {trustItems.map(([icon, title, text]) => (
            <div
              key={String(title)}
              className="flex min-h-[116px] items-center gap-3 px-4 py-5"
            >
              <FontAwesomeIcon
                icon={icon}
                className="h-8 w-8 shrink-0 text-[#E8A53A]"
              />
              <div>
                <h3 className="text-[10px] font-black uppercase leading-tight">
                  {String(title)}
                </h3>
                <p className="mt-2 text-[8px] leading-4 text-[#655d55]">
                  {String(text)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-[min(100%-2rem,1240px)] py-9">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faStar} className="h-3 text-[#E8A53A]" />
          <h2 className="text-[21px] font-black uppercase">
            Our Bestsellers
          </h2>
          <span className="h-px w-12 bg-[#E8A53A]" />
        </div>
        <div className="mt-4">
          <HomeBestsellers items={menuItems} />
        </div>
        <div className="mt-4 text-center">
          <Link
            href="/menu"
            className="inline-flex h-10 items-center gap-3 rounded-full border border-[#dfcbb9] bg-white px-6 text-[9px] font-black uppercase"
          >
            View Full Menu{" "}
            <FontAwesomeIcon
              icon={faArrowRight}
              className="h-3 text-[#C8102E]"
            />
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-[min(100%-2rem,1240px)] gap-4 lg:grid-cols-[1fr_1.12fr_1fr]">
        <article className="flex min-h-[380px] flex-col overflow-hidden rounded-[20px] border border-[#EDE3D8] bg-[linear-gradient(135deg,#fff8ed,#f9ead8)] p-4 shadow-[0_10px_26px_rgba(67,45,26,.05)] sm:p-5">
          <Link
            href="/rewards"
            aria-label="View TRS Coins rewards"
            className="group relative block h-[285px] w-full overflow-hidden rounded-[18px] bg-[#f3e5cf]"
          >
            {TRS_COINS_IMAGE ? (
              <Image
                src={TRS_COINS_IMAGE}
                alt="TRS Coins rewards illustration"
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-contain transition duration-300 group-hover:scale-[1.02]"
              />
            ) : null}
          </Link>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black uppercase text-[#9d5610]">
                TRS Coins
              </h3>
              <p className="mt-1 text-[10px] font-semibold text-[#665b50]">
                Earn rewards on every eligible order.
              </p>
            </div>
            <Link
              href="/rewards"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#f1ddb7] px-4 py-2 text-[9px] font-black uppercase"
            >
              View Wallet
              <FontAwesomeIcon icon={faArrowRight} className="h-3" />
            </Link>
          </div>
        </article>

        <article className="min-h-[380px] rounded-[20px] border border-[#EDE3D8] bg-white p-5 shadow-[0_10px_26px_rgba(67,45,26,.05)]">
          <SpinWheel />
        </article>

        <article className="flex min-h-[380px] flex-col overflow-hidden rounded-[20px] border border-[#EDE3D8] bg-[linear-gradient(135deg,#FFFDF9,#fff0df)] p-4 shadow-[0_10px_26px_rgba(67,45,26,.05)] sm:p-5">
          <Link
            href="/menu"
            aria-label="Get 25 TRS Coins on your first order"
            className="group relative block h-[285px] w-full overflow-hidden rounded-[18px] bg-[#f8eadb]"
          >
            {GIFT_BOX_IMAGE ? (
              <Image
                src={GIFT_BOX_IMAGE}
                alt="Get 25 TRS Coins on your first order"
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-contain transition duration-300 group-hover:scale-[1.02]"
              />
            ) : null}
          </Link>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase text-[#f04d1e]">
                New User Offer
              </p>
              <h3 className="mt-1 text-lg font-black uppercase text-[#173248]">
                Get 25 TRS Coins
              </h3>
            </div>
            <Link
              href="/menu"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[#C8102E] px-5 text-[9px] font-black uppercase text-white"
            >
              Order Now
              <FontAwesomeIcon icon={faArrowRight} className="h-3" />
            </Link>
          </div>
        </article>
      </section>

      <section className="mx-auto w-[min(100%-2rem,1240px)] py-9">
        <SectionTitle>Perfect Combos For You</SectionTitle>
        {combos.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {combos.slice(0, 4).map((combo) => (
            <article
              key={combo.id}
              className="grid min-h-[185px] grid-cols-[.9fr_1.1fr] overflow-hidden rounded-[18px] border border-[#e7ddd4] bg-white p-3 shadow-[0_8px_20px_rgba(67,45,26,.05)]"
            >
              <div className="flex flex-col items-start">
                <h3 className="text-[10px] font-black uppercase text-[#C8102E]">
                  {combo.name}
                </h3>
                <p className="mt-2 text-[9px] leading-4 text-[#625a53]">
                  {combo.shortDescription || "Open this combo to view included items and available choices."}
                </p>
                <div className="mt-2 flex flex-wrap items-baseline gap-2">
                  <p className="text-[16px] font-black text-[#C8102E]">{formatMoney(combo.priceFrom)}</p>
                  {combo.compareAtPriceFrom && combo.compareAtPriceFrom > combo.priceFrom ? <span className="text-[10px] font-bold text-[#8A8179] line-through">{formatMoney(combo.compareAtPriceFrom)}</span> : null}
                </div>
                {combo.compareAtPriceFrom && combo.compareAtPriceFrom > combo.priceFrom ? <span className="mt-2 rounded-full bg-[#173044] px-2 py-1 text-[8px] font-black uppercase text-white">{Math.round(((combo.compareAtPriceFrom - combo.priceFrom) / combo.compareAtPriceFrom) * 100)}% off</span> : null}
                <Link
                  href={`/menu/${combo.slug}`}
                  className="mt-auto rounded-lg border border-[#efc9bf] px-3 py-2 text-[8px] font-black uppercase text-[#C8102E]"
                >
                  Order Now
                </Link>
              </div>
              <div className="relative h-full min-h-[155px] overflow-hidden rounded-xl bg-[#f8f3ed]">
                {combo.thumbnail?.url ? (
                  <Image
                    src={combo.thumbnail.url}
                    alt={combo.thumbnail.alt || combo.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover"
                  />
                ) : null}
              </div>
            </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[18px] border border-dashed border-[#dfcbb9] bg-white px-6 py-10 text-center text-sm font-semibold text-[#756b63]">
            No active combo items are available. Add them under a menu category containing “Combo” in the admin dashboard.
          </div>
        )}
      </section>

      <section className="border-y border-[#EDE3D8] bg-white py-10">
        <div className="mx-auto w-[min(100%-2rem,1240px)]">
          <SectionTitle>How It Works</SectionTitle>
          <div className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-6">
            {steps.map(([icon, title, text], index) => (
              <div key={String(title)} className="relative text-center">
                <span className="absolute left-[calc(50%+34px)] top-7 hidden h-px w-[calc(100%-68px)] bg-[#E8A53A] lg:block" />
                <span className="absolute left-[calc(50%+34px)] top-[25px] hidden text-[11px] text-[#E8A53A] lg:block">
                  →
                </span>
                <span className="absolute left-1/2 top-[-6px] z-10 grid h-5 w-5 -translate-x-9 place-items-center rounded-full bg-[#C8102E] text-[8px] font-black text-white">
                  {index + 1}
                </span>
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[#eadbcd] bg-[#FFF8F2] text-[#C8102E]">
                  <FontAwesomeIcon icon={icon} className="h-5" />
                </span>
                <h3 className="mt-3 text-[10px] font-black uppercase">
                  {String(title)}
                </h3>
                <p className="mx-auto mt-2 max-w-[130px] text-[9px] leading-4 text-[#665e57]">
                  {String(text)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-[min(100%-2rem,1240px)] py-9">
        <GoogleReviews reviewCountLabel="See current reviews on Google" />
      </section>

      <section className="mx-auto grid w-[min(100%-2rem,1240px)] gap-4 pb-10 lg:grid-cols-3">
        {homeCtas.map(({ icon, title, text, href }) => (
          <Link
            key={title}
            href={href}
            className="group flex items-center gap-4 rounded-[18px] border border-[#EDE3D8] bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#fff1e5] text-[#C8102E]">
              <FontAwesomeIcon icon={icon} className="h-5" />
            </span>
            <span>
              <strong className="block text-sm font-black uppercase">
                {title}
              </strong>
              <span className="mt-1 block text-[10px] text-[#675f58]">
                {text}
              </span>
            </span>
            <FontAwesomeIcon
              icon={faArrowRight}
              className="ml-auto h-4 text-[#C8102E] transition group-hover:translate-x-1"
            />
          </Link>
        ))}
      </section>
    </div>
  );
}
