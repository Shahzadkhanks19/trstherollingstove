import { createAdminMetadata } from "@/lib/admin/metadata";
import { redirect } from "next/navigation";

import { AdminLiveOrdersClient } from "@/components/admin/orders/AdminLiveOrdersClient";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const metadata = createAdminMetadata("Live Orders", "Monitor active dine-in and pickup orders in real time.");

export const dynamic = "force-dynamic";

export default async function AdminLiveOrdersPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login?redirect=/admin/orders/live");
  if (!user.permissions.includes("orders.read")) {
    redirect("/admin/dashboard?error=unauthorized");
  }

  return <AdminLiveOrdersClient canManage={user.permissions.includes("orders.manage")} />;
}
