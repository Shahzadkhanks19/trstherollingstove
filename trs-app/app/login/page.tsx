import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginPageClient } from "@/components/auth/LoginPageClient";
import { getPublicOrderingAvailability } from "@/lib/public-ordering";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: "Login",
  description: "Login to your TRS account to access rewards, faster checkout and order history.",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const availability = await getPublicOrderingAvailability();
  if (!availability.enabled) redirect("/ordering-coming-soon");
  return <LoginPageClient />;
}
