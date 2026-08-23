import { redirect } from "next/navigation";
import { InternalConsumptionClient } from "@/components/admin/internal-consumption/InternalConsumptionClient";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { createAdminMetadata } from "@/lib/admin/metadata";

export const metadata = createAdminMetadata("Internal Consumption", "Manage non-revenue POS consumption, staff meal limits and operational reasons.");
export const dynamic = "force-dynamic";

export default async function InternalConsumptionPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login?redirect=/admin/internal-consumption");
  if (!user.permissions.includes("settings.manage")) redirect("/admin/dashboard?error=unauthorized");
  return <InternalConsumptionClient />;
}
