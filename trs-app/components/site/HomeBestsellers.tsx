"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCartShopping } from "@fortawesome/free-solid-svg-icons";
import type { MenuItemSummary } from "@/types/menu";

type BestsellerGroup = "pizza" | "chur-chur-naan";

function money(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function belongsTo(item: MenuItemSummary, group: BestsellerGroup): boolean {
  const category = `${item.category.name} ${item.category.slug}`.toLowerCase();

  if (group === "pizza") {
    return category.includes("pizza");
  }

  return (
    category.includes("chur") ||
    category.includes("naan")
  );
}

export function HomeBestsellers({ items }: { items: MenuItemSummary[] }) {
  const groups = useMemo(
    () => ({
      pizza: items.filter(
        (item) => item.isAvailable && item.isBestseller && belongsTo(item, "pizza"),
      ),
      "chur-chur-naan": items.filter(
        (item) =>
          item.isAvailable &&
          item.isBestseller &&
          belongsTo(item, "chur-chur-naan"),
      ),
    }),
    [items],
  );

  const initialGroup: BestsellerGroup =
    groups.pizza.length > 0 ? "pizza" : "chur-chur-naan";
  const [activeGroup, setActiveGroup] = useState<BestsellerGroup>(initialGroup);
  const visibleItems = groups[activeGroup];

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveGroup("pizza")}
          className={`rounded-full px-5 py-2 text-[9px] font-black uppercase transition ${
            activeGroup === "pizza"
              ? "bg-[#C8102E] text-white"
              : "border border-[#dca45d] bg-white text-[#29241f]"
          }`}
        >
          Pizza Bestsellers
        </button>
        <button
          type="button"
          onClick={() => setActiveGroup("chur-chur-naan")}
          className={`rounded-full px-5 py-2 text-[9px] font-black uppercase transition ${
            activeGroup === "chur-chur-naan"
              ? "bg-[#C8102E] text-white"
              : "border border-[#dca45d] bg-white text-[#29241f]"
          }`}
        >
          Chur-Chur Naan
        </button>
      </div>

      {visibleItems.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {visibleItems.slice(0, 5).map((product) => {
            const pricingOptions = product.pricingOptions?.filter(
              (option) => option.isAvailable !== false,
            ) ?? [];

            return (
              <article
                key={product.id}
                className="overflow-hidden rounded-[17px] border border-[#e7ddd4] bg-white shadow-[0_8px_20px_rgba(67,45,26,.05)]"
              >
                <div className="relative p-2">
                  <span className="absolute left-0 top-2 z-10 rounded-r-md bg-[#C8102E] px-2.5 py-1 text-[8px] font-black uppercase text-white">
                    Bestseller
                  </span>
                  <div className="relative h-[145px] overflow-hidden rounded-xl bg-[#f8f3ed]">
                    {product.thumbnail?.url ? (
                      <Image
                        src={product.thumbnail.url}
                        alt={product.thumbnail.alt || product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                </div>
                <div className="px-3 pb-3">
                  <h3 className="min-h-9 text-[11px] font-black leading-4">
                    {product.name}
                  </h3>
                  <div className="mt-2 grid grid-flow-col auto-cols-fr gap-1.5">
                    {(pricingOptions.length
                      ? pricingOptions.slice(0, 3)
                      : [
                          {
                            id: `${product.id}-price`,
                            label: "Regular",
                            price: product.priceFrom,
                          },
                        ]
                    ).map((option) => (
                      <div key={option.id} className="text-center">
                        <span className="block text-[10px] font-black">
                          {money(option.price)}
                        </span>
                        <span className="mt-1 block text-[8px] font-bold uppercase text-[#776e66]">
                          {option.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Link
                    href={`/menu/${product.slug}`}
                    className="mt-3 flex h-9 items-center justify-center gap-3 rounded-lg border border-[#eedfd4] text-[9px] font-black uppercase text-[#C8102E] transition hover:border-[#C8102E] hover:bg-[#fff4ee]"
                  >
                    Add to Cart
                    <FontAwesomeIcon icon={faCartShopping} className="h-3" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-[17px] border border-dashed border-[#dfcbb9] bg-white px-6 py-10 text-center text-sm font-semibold text-[#756b63]">
          No active bestsellers are assigned to this category. Mark items as
          bestsellers from the admin dashboard and they will appear here.
        </div>
      )}
    </>
  );
}
