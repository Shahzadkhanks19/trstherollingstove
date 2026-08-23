import { createAdminMetadata } from "@/lib/admin/metadata";
import { redirect } from "next/navigation";

import { AdminCategoriesClient } from "@/components/admin/menu/AdminCategoriesClient";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const metadata = createAdminMetadata("Menu Categories", "Organise public menu categories and display order.");

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login?redirect=/admin/menu/categories");
  if (!user.permissions.includes("menu.read")) {
    redirect("/admin/dashboard?error=unauthorized");
  }

  return (
    <AdminCategoriesClient
      canCreate={user.permissions.includes("menu.create")}
      canUpdate={user.permissions.includes("menu.update")}
      canDelete={user.permissions.includes("menu.delete")}
    />
  );
}
