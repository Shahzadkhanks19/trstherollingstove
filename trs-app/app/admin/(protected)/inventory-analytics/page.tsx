import { redirect } from "next/navigation";

import { InventoryAutomationDashboardClient } from "@/components/admin/inventory/InventoryAutomationDashboardClient";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const metadata = createAdminMetadata(
  "Inventory Analytics",
  "Monitor inventory KPIs, alert automation, scheduled reports and job history.",
);

export const dynamic = "force-dynamic";

export default async function InventoryAnalyticsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/admin/login?redirect=/admin/inventory-analytics");
  }

  if (!user.permissions.includes("inventory.read")) {
    redirect("/admin/login?error=unauthorized");
  }

  return (
    <InventoryAutomationDashboardClient
      canManage={user.permissions.includes("inventory.manage")}
    />
  );
}
