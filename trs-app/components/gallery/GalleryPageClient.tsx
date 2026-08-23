"use client";

import { CmsHeroMedia } from "@/components/site/CmsHeroMedia";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faCalendarDays,
  faCamera,
  faFilm,
  faImage,
  faPizzaSlice,
  faStore,
  faTruckFast,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";


type GalleryFilter =
  | "all"
  | "food"
  | "food-truck"
  | "ambience"
  | "customers"
  | "videos"
  | "events";

type GalleryItem = {
  _id: string;
  title: string;
  description: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  thumbnailUrl: string;
  category: string;
  altText: string;
  sortOrder: number;
};

type GalleryResponse = {
  data?: {
    items?: GalleryItem[];
  };
  message?: string;
};

type FilterItem = {
  id: GalleryFilter;
  label: string;
  icon: IconDefinition;
};

const filters: readonly FilterItem[] = [
  { id: "all", label: "All", icon: faCamera },
  { id: "food", label: "Food", icon: faPizzaSlice },
  { id: "food-truck", label: "Food Truck", icon: faTruckFast },
  { id: "ambience", label: "Ambience", icon: faStore },
  { id: "customers", label: "Customer Photos", icon: faUsers },
  { id: "videos", label: "Videos", icon: faFilm },
  { id: "events", label: "Events", icon: faCalendarDays },
];

const categoryAliases: Readonly<Record<GalleryFilter, readonly string[]>> = {
  all: [],
  food: ["food", "food gallery", "foods"],
  "food-truck": ["food truck", "food-truck", "truck"],
  ambience: ["ambience", "ambiance"],
  customers: ["customer photos", "customers", "customer", "customer photo"],
  videos: ["videos", "video", "review videos", "customer videos"],
  events: ["events", "event"],
};

function normalizeCategory(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function matchesFilter(item: GalleryItem, filter: GalleryFilter): boolean {
  if (filter === "all") return true;
  if (filter === "videos" && item.mediaType === "video") return true;
  const category = normalizeCategory(item.category);
  return categoryAliases[filter].some((alias) => category === alias);
}

function GalleryCard({ item }: { item: GalleryItem }) {
  return (
    <article className="group min-w-0 overflow-hidden rounded-2xl border border-[#EDE3D8] bg-white shadow-[0_12px_30px_rgba(44,28,14,.05)]">
      <div className="relative aspect-square overflow-hidden bg-[#FFF4E3]">
        {item.mediaType === "image" ? (
          <Image
            src={item.mediaUrl}
            alt={item.altText || item.title}
            fill
            unoptimized
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <video
            src={item.mediaUrl}
            poster={item.thumbnailUrl || undefined}
            controls
            preload="metadata"
            className="h-full w-full object-cover"
            aria-label={item.altText || item.title}
          />
        )}
      </div>
      <div className="p-4">
        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#C8102E]">
          {item.category}
        </p>
        <h2 className="mt-1 line-clamp-2 text-sm font-black text-[#172536]">
          {item.title}
        </h2>
        {item.description && (
          <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-[#655E57]">
            {item.description}
          </p>
        )}
      </div>
    </article>
  );
}

export function GalleryPageClient() {
  const [activeFilter, setActiveFilter] = useState<GalleryFilter>("all");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadGallery = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/public/gallery?page=1&limit=100", {
        cache: "no-store",
      });
      const json = (await response.json()) as GalleryResponse;
      if (!response.ok) throw new Error(json.message || "Unable to load gallery.");
      setItems(Array.isArray(json.data?.items) ? json.data.items : []);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load gallery.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const refreshGallery = () => {
      void loadGallery();
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refreshGallery();
      }
    };

    const initialLoadTimer = window.setTimeout(refreshGallery, 0);

    window.addEventListener("focus", refreshGallery);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearTimeout(initialLoadTimer);
      window.removeEventListener("focus", refreshGallery);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadGallery]);

  const visibleItems = useMemo(
    () => items.filter((item) => matchesFilter(item, activeFilter)),
    [activeFilter, items],
  );

  const heroImage = items.find((item) => item.mediaType === "image");

  return (
    <main className="overflow-x-hidden bg-[#FFFDF9] text-[#172536]">
      <section className="relative overflow-hidden border-b border-[#EDE3D8] bg-[linear-gradient(135deg,#FFFDF9,#FFF6EC)]">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(#E8A53A_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative mx-auto grid min-h-[430px] w-[min(100%-2rem,1320px)] items-center gap-10 py-12 lg:grid-cols-[minmax(0,.86fr)_minmax(0,1.14fr)]">
          <div>
            <div className="inline-flex items-center gap-3 text-sm font-black italic text-[#C8102E]">
              <span className="h-px w-10 bg-[#E8A53A]" />
              Moments That Make Us Special
            </div>
            <h1 className="mt-5 text-[clamp(3.5rem,9vw,6.6rem)] font-black uppercase leading-[.86] tracking-[-0.06em] text-[#14283B]">
              Gallery
            </h1>
            <h2 className="mt-3 text-[clamp(2rem,5vw,4.2rem)] font-black uppercase leading-[.95] tracking-[-0.05em] text-[#C8102E]">
              Good Food. Great Memories.
            </h2>
            <p className="mt-6 max-w-[590px] text-base leading-7 text-[#4F4943]">
              Browse food, food-truck, ambience, customer, video and event media published by TRS.
            </p>
          </div>

          <div className="relative min-h-[320px] overflow-hidden rounded-[2rem] border border-[#E8D8C9] shadow-[0_28px_70px_rgba(88,56,24,.14)]">
            <CmsHeroMedia
              pageKey="gallery"
              label="TRS gallery hero image"
              fallbackSrc={heroImage?.mediaUrl}
              fallbackAlt={heroImage ? heroImage.altText || heroImage.title : ""}
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="absolute inset-0 rounded-[2rem] border-0 bg-[linear-gradient(135deg,#FFF4E3,#F5D5B3)]"
            />
          </div>
        </div>
      </section>

      <section className="sticky top-[76px] z-30 border-b border-[#EDE3D8] bg-[#FFFDF9]/95 py-4 backdrop-blur-xl lg:top-[84px]">
        <div className="mx-auto w-[min(100%-2rem,1240px)] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-2">
            {filters.map(({ id, label, icon }) => {
              const active = activeFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveFilter(id)}
                  aria-pressed={active}
                  className={`inline-flex h-11 items-center gap-2 rounded-full border px-5 text-[10px] font-black uppercase transition ${
                    active
                      ? "border-[#C8102E] bg-[#C8102E] text-white"
                      : "border-[#E2D3C6] bg-white text-[#2B2622] hover:border-[#E8A53A] hover:text-[#C8102E]"
                  }`}
                >
                  <FontAwesomeIcon icon={icon} className="h-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto w-[min(100%-2rem,1240px)] py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#C8102E]">
              Published media
            </p>
            <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.04em] text-[#172536]">
              {filters.find((filter) => filter.id === activeFilter)?.label}
            </h2>
          </div>
          <span className="rounded-full bg-[#FFF1E5] px-4 py-2 text-xs font-black text-[#C8102E]">
            {visibleItems.length}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="aspect-square animate-pulse rounded-2xl bg-[#F3E9DF]" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-[#F0C8C8] bg-[#FFF5F5] p-8 text-center">
            <p className="font-bold text-[#9B1C2C]">{error}</p>
            <button
              type="button"
              onClick={() => void loadGallery()}
              className="mt-4 rounded-full bg-[#C8102E] px-5 py-3 text-xs font-black uppercase text-white"
            >
              Try again
            </button>
          </div>
        ) : visibleItems.length > 0 ? (
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visibleItems.map((item) => (
              <GalleryCard key={item._id} item={item} />
            ))}
          </div>
        ) : (
          <div className="grid min-h-[280px] place-items-center rounded-3xl border border-dashed border-[#E2D3C6] bg-white p-8 text-center">
            <div>
              <FontAwesomeIcon icon={faImage} className="h-10 text-[#D99219]" />
              <h3 className="mt-4 text-lg font-black uppercase text-[#172536]">
                No published media yet
              </h3>
              <p className="mt-2 text-sm text-[#655E57]">
                Upload and publish media from the admin gallery under this category.
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
