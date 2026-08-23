import type { Metadata } from "next";
import { GalleryPageClient } from "@/components/gallery/GalleryPageClient";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Explore food photos, The Rolling Stove food truck, customer moments, review videos and memorable TRS experiences.",
};

export default function GalleryPage() {
  return <GalleryPageClient />;
}
