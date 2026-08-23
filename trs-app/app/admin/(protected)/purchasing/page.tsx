import { createAdminMetadata } from "@/lib/admin/metadata";
import { redirect } from "next/navigation";

import { AdminPurchasingClient } from "@/components/admin/purchasing/AdminPurchasingClient";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const metadata = createAdminMetadata("Vendors & Purchasing", "Manage vendors, purchase requests, receipts and supplier payments.");

export const dynamic = "force-dynamic";

export default async function AdminPurchasingPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/admin/login?redirect=/admin/purchasing");
  }

  if (!user.permissions.includes("purchases.read")) {
    redirect("/admin/login?error=unauthorized");
  }

  return (
    <AdminPurchasingClient
      canManagePurchases={user.permissions.includes("purchases.manage")}
      canReadSuppliers={user.permissions.includes("suppliers.read")}
      canManageSuppliers={user.permissions.includes("suppliers.manage")}
      canReadInventory={user.permissions.includes("inventory.read")}
    />
  );
}
