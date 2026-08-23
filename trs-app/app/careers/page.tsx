import type { Metadata } from "next";
import { CareersPageClient } from "@/components/careers/CareersPageClient";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Explore current job opportunities at The Rolling Stove in Jodhpur and apply to join the TRS team.",
};

export default function CareersPage() {
  return <CareersPageClient />;
}
