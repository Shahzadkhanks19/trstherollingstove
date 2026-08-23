import { redirect } from "next/navigation";
import { RevenueManagementClient } from "@/components/admin/finance/RevenueManagementClient";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const metadata = createAdminMetadata("Revenue Management", "Revenue recognition, taxes, discounts, refunds and sales intelligence.");
export const dynamic = "force-dynamic";

export default async function RevenueManagementPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login?redirect=/admin/finance/revenue");
  if (!user.permissions.includes("reports.read")) redirect("/admin/dashboard?error=unauthorized");
  return <RevenueManagementClient />;
}
