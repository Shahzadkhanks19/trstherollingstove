import type { Metadata } from "next";

import { ResendVerificationPageClient } from "@/components/auth/ResendVerificationPageClient";

export const metadata: Metadata = {
  title: "Resend Email Verification",
  robots: { index: false, follow: false, nocache: true },
};

export default function ResendVerificationPage() {
  return <ResendVerificationPageClient />;
}
