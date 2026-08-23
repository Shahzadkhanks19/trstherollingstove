import { redirect } from "next/navigation";

import { InventoryForecastDashboardClient } from "@/components/admin/inventory/InventoryForecastDashboardClient";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const metadata = createAdminMetadata(
  "Inventory Forecasting",
  "Predict demand, stockout dates, safety stock and reorder requirements.",
);

export const dynamic = "force-dynamic";

export default async function InventoryForecastingPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(
      "/admin/login?redirect=/admin/inventory-forecasting",
    );
  }

  if (!user.permissions.includes("inventory.read")) {
    redirect("/admin/login?error=unauthorized");
  }

  return (
    <InventoryForecastDashboardClient
      canManage={user.permissions.includes(
        "inventory.manage",
      )}
      canExport={user.permissions.includes("reports.read")}
    />
  );
}
