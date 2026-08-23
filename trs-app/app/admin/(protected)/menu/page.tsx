import { createAdminMetadata } from "@/lib/admin/metadata";
import { redirect } from "next/navigation";

import { AdminMenuClient } from "@/components/admin/menu/AdminMenuClient";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const metadata = createAdminMetadata("Menu Management", "Create and manage public menu items, pricing, variants and availability.");

export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login?redirect=/admin/menu");
  if (!user.permissions.includes("menu.read")) {
    redirect("/admin/dashboard?error=unauthorized");
  }

  return (
    <AdminMenuClient
      canCreate={user.permissions.includes("menu.create")}
      canUpdate={user.permissions.includes("menu.update")}
      canDelete={user.permissions.includes("menu.delete")}
    />
  );
}
