import { createAdminMetadata } from "@/lib/admin/metadata";
import { redirect } from "next/navigation";

import { AdminOrdersClient } from "@/components/admin/orders/AdminOrdersClient";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const metadata = createAdminMetadata("Orders", "Search, review and manage all customer orders.");

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login?redirect=/admin/orders");
  if (!user.permissions.includes("orders.read")) {
    redirect("/admin/dashboard?error=unauthorized");
  }

  return (
    <AdminOrdersClient
      canManage={user.permissions.includes("orders.manage")}
      canManagePayments={user.permissions.includes("payments.manage")}
    />
  );
}
