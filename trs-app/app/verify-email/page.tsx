import type { Metadata } from "next";

import { VerifyEmailPageClient } from "@/components/auth/VerifyEmailPageClient";

export const metadata: Metadata = {
  title: "Verify Email",
  robots: { index: false, follow: false, nocache: true },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return <VerifyEmailPageClient token={token} />;
}
