"use client";

import { CmsHeroMedia } from "@/components/site/CmsHeroMedia";
import {
  faArrowRight,
  faBagShopping,
  faClock,
  faCoins,
  faLeaf,
  faMagnifyingGlass,
  faShieldHalved,
  faStore,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { MenuItemSummary } from "@/types/menu";
import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

type SortMode = "popular" | "low" | "high" | "name";

export function MenuPageClient({
  items,
}: {
  items: MenuItemSummary[];
}) {
  const router = useRouter();
  useRealtimeRefresh({ events: ["menu.updated", "menu.availability_changed"], onEvent: () => router.refresh() });

  const categories = useMemo(() => {
    const map = new Map<string, { name: string; slug: string }>();

    items.forEach((item) => {
      map.set(item.category.slug, {
        name: item.category.name,
        slug: item.category.slug,
      });
    });

    return Array.from(map.values());
  }, [items]);

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortMode>("popular");
  const [showBestsellers, setShowBestsellers] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    let list = items.filter(
      (item) =>
        activeCategory === "all" ||
        item.category.slug === activeCategory,
    );

    if (query) {
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.shortDescription?.toLowerCase().includes(query) ||
          item.category.name.toLowerCase().includes(query),
      );
    }

    if (showBestsellers) {
      list = list.filter((item) => item.isBestseller);
    }

    if (showNew) {
      list = list.filter((item) => item.isNew);
    }

    if (sortBy === "low") {
      return [...list].sort((a, b) => a.priceFrom - b.priceFrom);
    }

    if (sortBy === "high") {
      return [...list].sort((a, b) => b.priceFrom - a.priceFrom);
    }

    if (sortBy === "name") {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return [...list].sort(
      (a, b) =>
        Number(Boolean(b.isBestseller)) -
        Number(Boolean(a.isBestseller)),
    );
  }, [
    activeCategory,
    items,
    search,
    showBestsellers,
    showNew,
    sortBy,
  ]);

  const activeCategoryName =
    categories.find((category) => category.slug === activeCategory)?.name ??
    "All Items";

  return (
    <main className="overflow-x-hidden bg-[#FFF8F2] text-[#171717]">
      <section className="relative overflow-hidden border-b border-[#EADFD3] bg-[#FFFDF9]">
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(#E8CDA9_1px,transparent_1px)] [background-size:34px_34px]" />

        <div className="relative mx-auto grid w-[min(100%-2rem,1280px)] items-center gap-10 py-12 lg:grid-cols-[.9fr_1.1fr] lg:py-16">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-[#C8102E]">
              <span className="h-px w-10 bg-[#E8A53A]" />
              Freshly made every evening
            </span>

            <h1 className="mt-5 max-w-xl text-5xl font-black leading-[.96] text-[#0F2233] sm:text-6xl lg:text-7xl">
              Order Your <span className="text-[#C8102E]">Favourites</span>
            </h1>

            <p className="mt-5 max-w-xl text-base font-semibold italic leading-7 text-[#493F37]">
              Browse the live menu managed through the TRS admin dashboard.
              Open an item to choose its size, portion and available add-ons.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-xl border border-[#EADFD3] bg-white px-4 py-3 text-xs font-black shadow-sm">
                <FontAwesomeIcon icon={faLeaf} className="h-4 text-[#41A84B]" />
                100% vegetarian
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-[#EADFD3] bg-white px-4 py-3 text-xs font-black shadow-sm">
                <FontAwesomeIcon icon={faClock} className="h-4 text-[#C8102E]" />
                Open 5:30 PM–11:30 PM
              </div>
            </div>
          </div>

          <CmsHeroMedia
              pageKey="menu"
              label="Menu hero food image"
              className="min-h-[330px] rounded-[2rem] shadow-[0_24px_70px_rgba(77,45,18,.12)] lg:min-h-[420px]"
            />
        </div>
      </section>

      <section className="mx-auto w-[min(100%-2rem,1280px)] py-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: faLeaf,
              title: "100% Veg",
              text: "Pure veg goodness",
            },
            {
              icon: faUtensils,
              title: "Fresh Ingredients",
              text: "Prepared with care",
            },
            {
              icon: faShieldHalved,
              title: "Hygienic Kitchen",
              text: "Clean preparation",
            },
            {
              icon: faStore,
              title: "Dine-in & Takeaway",
              text: "Choose at checkout",
            },
          ].map(({ icon, title, text }) => (
            <div
              key={title}
              className="flex items-center gap-4 rounded-2xl border border-[#EADFD3] bg-white p-4 shadow-sm"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FFF1EA] text-[#C8102E]">
                <FontAwesomeIcon icon={icon} className="h-5" />
              </span>
              <span>
                <strong className="block text-xs font-black uppercase">
                  {title}
                </strong>
                <span className="mt-1 block text-[10px] text-[#74685F]">
                  {text}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-[min(100%-2rem,1280px)] gap-6 pb-12 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="h-fit rounded-[1.5rem] border border-[#EADFD3] bg-white p-3 shadow-[0_15px_45px_rgba(70,45,25,.06)] lg:sticky lg:top-24">
          <nav className="grid gap-1" aria-label="Menu categories">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`flex min-h-12 items-center justify-between rounded-xl px-4 text-left text-sm font-black transition ${
                activeCategory === "all"
                  ? "bg-[#C8102E] text-white"
                  : "hover:bg-[#FFF2E9] hover:text-[#C8102E]"
              }`}
            >
              All Items
              <span>›</span>
            </button>

            {categories.map((category) => (
              <button
                key={category.slug}
                type="button"
                onClick={() => setActiveCategory(category.slug)}
                className={`flex min-h-12 items-center justify-between rounded-xl px-4 text-left text-sm font-black transition ${
                  activeCategory === category.slug
                    ? "bg-[#C8102E] text-white"
                    : "hover:bg-[#FFF2E9] hover:text-[#C8102E]"
                }`}
              >
                {category.name}
                <span>›</span>
              </button>
            ))}
          </nav>

          <div className="my-5 h-px bg-[#EEE4DA]" />

          <div className="px-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase">Filter by</h2>
              <button
                type="button"
                onClick={() => {
                  setShowBestsellers(false);
                  setShowNew(false);
                }}
                className="text-[10px] font-black text-[#C8102E]"
              >
                Clear all
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <label className="flex cursor-pointer items-center gap-3 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={showBestsellers}
                  onChange={(event) =>
                    setShowBestsellers(event.target.checked)
                  }
                  className="h-4 w-4 accent-[#C8102E]"
                />
                Bestsellers
              </label>

              <label className="flex cursor-pointer items-center gap-3 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={showNew}
                  onChange={(event) => setShowNew(event.target.checked)}
                  className="h-4 w-4 accent-[#C8102E]"
                />
                New arrivals
              </label>
            </div>
          </div>

          <div className="mt-7 overflow-hidden rounded-2xl border border-[#EFC58D] bg-[#FFF8E9] p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#E8A53A] text-white">
                <FontAwesomeIcon icon={faCoins} className="h-4" />
              </span>
              <div>
                <strong className="block text-xs font-black uppercase text-[#C8102E]">
                  Earn TRS Coins
                </strong>
                <span className="text-[10px] text-[#62564D]">
                  5 coins per ₹100
                </span>
              </div>
            </div>

            <Link
              href="/rewards"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#C8102E] px-4 py-2.5 text-[9px] font-black uppercase text-white"
            >
              Know more
              <FontAwesomeIcon icon={faArrowRight} className="h-3" />
            </Link>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-col gap-3 rounded-2xl border border-[#EADFD3] bg-white p-3 shadow-sm sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Search the menu</span>
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#81756D]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search the live menu..."
                className="h-12 w-full rounded-xl bg-[#FFFAF5] pl-11 pr-4 text-sm font-semibold outline-none ring-[#C8102E]/15 placeholder:text-[#9A8E85] focus:ring-4"
              />
            </label>

            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value as SortMode)
              }
              className="h-12 min-w-[190px] rounded-xl bg-[#FFFAF5] px-4 text-xs font-black outline-none"
            >
              <option value="popular">Sort by: Popularity</option>
              <option value="low">Price: Low to high</option>
              <option value="high">Price: High to low</option>
              <option value="name">Name: A–Z</option>
            </select>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black uppercase text-[#C8102E]">
              {activeCategoryName}
              <span className="ml-2 text-xs text-[#3E3731]">
                ({visibleItems.length})
              </span>
            </h2>

            <Link
              href="/cart"
              className="inline-flex items-center gap-2 text-[9px] font-black uppercase text-[#C8102E]"
            >
              <FontAwesomeIcon icon={faBagShopping} className="h-4" />
              View Cart
            </Link>
          </div>

          {visibleItems.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleItems.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-[#D9C6B3] bg-white px-6 py-16 text-center">
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="h-6 text-[#C8102E]"
              />
              <h3 className="mt-4 text-lg font-black">
                No menu items found
              </h3>
              <p className="mt-2 text-sm text-[#756A61]">
                Add and publish menu items from the admin dashboard, or clear
                the current filters.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
