import { createAdminMetadata } from "@/lib/admin/metadata";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth/session";
import { AdminInventoryClient } from "@/components/admin/inventory/AdminInventoryClient";

export const metadata = createAdminMetadata("Inventory", "Track ingredients, stock movements, recipes and low-stock alerts.");

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/admin/login?redirect=/admin/inventory");
  }

  if (!user.permissions.includes("inventory.read")) {
    redirect("/admin/login?error=unauthorized");
  }

  return (
    <AdminInventoryClient
      canManage={user.permissions.includes("inventory.manage")}
    />
  );
}
