import { redirect } from "next/navigation";
import { InternalConsumptionAnalyticsClient } from "@/components/admin/internal-consumption/InternalConsumptionAnalyticsClient";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const metadata = createAdminMetadata(
  "Internal Consumption Analytics",
  "Analyze staff meals, family meals, complimentary orders, kitchen testing and food wastage.",
);
export const dynamic = "force-dynamic";

export default async function InternalConsumptionAnalyticsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login");
  if (!user.permissions.includes("reports.read")) redirect("/admin/dashboard");
  return <InternalConsumptionAnalyticsClient />;
}
