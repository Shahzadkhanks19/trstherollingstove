import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewExperienceClient } from "@/components/review/ReviewExperienceClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: "Rate Your Experience",
  description: "Share feedback about your completed TRS order.",
};

export default function ReviewPage() {
  return <Suspense fallback={<main className="min-h-[70vh] bg-[#fffaf0] p-6"><div className="mx-auto h-[620px] max-w-5xl animate-pulse rounded-[2rem] bg-white" /></main>}><ReviewExperienceClient /></Suspense>;
}
