"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MediaPlaceholder } from "@/components/site/MediaPlaceholder";
import type { PageHeroKey } from "@/lib/page-hero-config";

type Hero = {
  desktopImageUrl: string;
  mobileImageUrl: string;
  imageAlt: string;
  focalPointX: number;
  focalPointY: number;
};

type ResponseBody = {
  data?: Hero | null;
};

type CmsHeroMediaProps = {
  pageKey: PageHeroKey;
  label: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fallbackSrc?: string;
  fallbackAlt?: string;
};

const POSITION_CLASS_PATTERN = /(?:^|\s)(?:absolute|fixed|sticky|relative)(?:\s|$)/;

export function CmsHeroMedia({
  pageKey,
  label,
  className = "",
  sizes = "(max-width: 1024px) 100vw, 50vw",
  priority = false,
  fallbackSrc = "",
  fallbackAlt = "",
}: CmsHeroMediaProps) {
  const [hero, setHero] = useState<Hero | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/public/page-heroes/${pageKey}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load hero media.");
      }

      const json = (await response.json()) as ResponseBody;
      setHero(json.data?.desktopImageUrl ? json.data : null);
    } catch {
      setHero(null);
    } finally {
      setLoaded(true);
    }
  }, [pageKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [load]);

  const desktopSrc = hero?.desktopImageUrl || fallbackSrc;
  const mobileSrc = hero?.mobileImageUrl || desktopSrc;
  const alt = hero?.imageAlt || fallbackAlt || label;
  const objectPosition = hero
    ? `${hero.focalPointX}% ${hero.focalPointY}%`
    : "50% 50%";

  const wrapperStyle = useMemo(
    () => ({
      // `next/image` with `fill` requires a positioned parent. Do not force
      // `relative` when callers intentionally use `absolute inset-0`, because
      // conflicting Tailwind position classes can collapse the wrapper to 0px.
      position: POSITION_CLASS_PATTERN.test(className)
        ? undefined
        : ("relative" as const),
    }),
    [className],
  );

  if (!loaded && !fallbackSrc) {
    return <MediaPlaceholder label={label} className={className} />;
  }

  if (!desktopSrc) {
    return <MediaPlaceholder label={label} className={className} />;
  }

  return (
    <div
      className={`w-full overflow-hidden ${className}`}
      style={wrapperStyle}
    >
      <Image
        src={desktopSrc}
        alt={alt}
        fill
        unoptimized
        priority={priority}
        sizes={sizes}
        className="hidden object-cover sm:block"
        style={{ objectPosition }}
      />

      <Image
        src={mobileSrc}
        alt={alt}
        fill
        unoptimized
        priority={priority}
        sizes="100vw"
        className="object-cover sm:hidden"
        style={{ objectPosition }}
      />
    </div>
  );
}
