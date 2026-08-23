import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupPageClient } from "@/components/auth/SignupPageClient";
import { getPublicOrderingAvailability } from "@/lib/public-ordering";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: "Sign Up",
  description: "Create your TRS account to earn coins, access rewards and enjoy faster checkout.",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const availability = await getPublicOrderingAvailability();
  if (!availability.enabled) redirect("/ordering-coming-soon");
  return <SignupPageClient />;
}
