"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { PageHeroKey } from "@/lib/page-hero-config";

type Hero = {
  desktopImageUrl: string;
  mobileImageUrl: string;
  imageAlt: string;
  overlayOpacity: number;
  focalPointX: number;
  focalPointY: number;
};

type ResponseBody = { data?: Hero | null };

export function CmsHeroImage({ pageKey, priority = false }: { pageKey: PageHeroKey; priority?: boolean }) {
  const [hero, setHero] = useState<Hero | null>(null);
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/public/page-heroes/${pageKey}`, { cache: "no-store" });
      if (!response.ok) return;
      const json = await response.json() as ResponseBody;
      setHero(json.data?.desktopImageUrl ? json.data : null);
    } catch {
      setHero(null);
    }
  }, [pageKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (!hero?.desktopImageUrl) return null;
  const position = `${hero.focalPointX}% ${hero.focalPointY}%`;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <Image src={hero.desktopImageUrl} alt="" fill unoptimized priority={priority} sizes="100vw" className="hidden object-cover sm:block" style={{ objectPosition: position }} />
      <Image src={hero.mobileImageUrl || hero.desktopImageUrl} alt="" fill unoptimized priority={priority} sizes="100vw" className="object-cover sm:hidden" style={{ objectPosition: position }} />
      <div className="absolute inset-0 bg-[#FFFDF9]" style={{ opacity: hero.overlayOpacity / 100 }} />
    </div>
  );
}
