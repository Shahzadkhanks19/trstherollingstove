import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faEye } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import type { MenuItemSummary } from "@/types/menu";
import { MediaPlaceholder } from "@/components/site/MediaPlaceholder";

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function MenuItemCard({ item }: { item: MenuItemSummary }) {
  const detailsHref = `/menu/${item.slug}`;
  const originalPrice = item.compareAtPriceFrom && item.compareAtPriceFrom > item.priceFrom ? item.compareAtPriceFrom : null;
  const discountPercent = originalPrice ? Math.round(((originalPrice - item.priceFrom) / originalPrice) * 100) : 0;

  return (
    <article className="group min-w-0 overflow-hidden rounded-2xl border border-[#EDE3D8] bg-white transition duration-300 hover:-translate-y-1 hover:border-[#C8102E] hover:shadow-[0_18px_40px_rgba(50,30,15,.08)]">
      <Link
        href={detailsHref}
        aria-label={`View and customise ${item.name}`}
        className="block"
      >
        <div className="relative overflow-hidden">
          {item.isTodaysSpecialOffer ? (
            <span className="absolute left-3 top-3 z-10 rounded-full bg-[#C8102E] px-3 py-1.5 text-[8px] font-black uppercase text-white shadow-lg">
              Today&apos;s Special Offer
            </span>
          ) : item.isBestseller ? (
            <span className="absolute left-3 top-3 z-10 rounded-full bg-[#C8102E] px-3 py-1.5 text-[8px] font-black uppercase text-white">
              Bestseller
            </span>
          ) : null}

          {discountPercent > 0 && (
            <span className="absolute right-3 bottom-3 z-10 rounded-full bg-[#173044] px-3 py-1.5 text-[8px] font-black uppercase text-white shadow-lg">
              {discountPercent}% off
            </span>
          )}

          {item.isNew && (
            <span className="absolute right-3 top-3 z-10 rounded-full bg-[#287238] px-3 py-1.5 text-[8px] font-black uppercase text-white">
              New
            </span>
          )}

          {item.thumbnail?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnail.url}
              alt={item.thumbnail.alt || item.name}
              className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <MediaPlaceholder
              label={`${item.name} image`}
              className="aspect-[4/3] w-full border-0"
            />
          )}

          <span className="absolute inset-x-3 bottom-3 flex h-9 translate-y-2 items-center justify-center gap-2 rounded-xl bg-white/95 px-3 text-[8px] font-black uppercase text-[#C8102E] opacity-0 shadow-lg backdrop-blur-sm transition group-hover:translate-y-0 group-hover:opacity-100">
            <FontAwesomeIcon icon={faEye} className="h-3" />
            View Details
          </span>
        </div>

        <div className="p-4">
          <p className="text-[8px] font-black uppercase tracking-[0.1em] text-[#C8102E]">
            {item.category.name}
          </p>

          <h2 className="mt-2 line-clamp-2 text-sm font-black text-[#172536]">
            {item.name}
          </h2>

          {item.shortDescription && (
            <p className="mt-2 line-clamp-2 text-[9px] leading-4 text-[#655E57]">
              {item.shortDescription}
            </p>
          )}

          <div className="mt-4">
            <span className="block text-[8px] font-bold uppercase text-[#8A8179]">
              Starting from
            </span>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <strong className="text-base font-black text-[#C8102E]">{formatPrice(item.priceFrom)}</strong>
              {originalPrice ? <span className="text-xs font-bold text-[#8A8179] line-through">{formatPrice(originalPrice)}</span> : null}
            </div>
          </div>
        </div>
      </Link>

      <div className="border-t border-[#EDE3D8] p-3">
        <Link
          href={detailsHref}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#C8102E] text-[9px] font-black uppercase text-white transition hover:bg-[#A50E27]"
        >
          View &amp; Customise
          <FontAwesomeIcon icon={faArrowRight} className="h-3" />
        </Link>
      </div>
    </article>
  );
}
