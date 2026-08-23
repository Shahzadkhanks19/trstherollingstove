import { createAdminMetadata } from "@/lib/admin/metadata";
import { redirect } from "next/navigation";
import { AdminCustomersClient } from "@/components/admin/customers/AdminCustomersClient";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const metadata = createAdminMetadata("Customers", "View customer profiles, account status and order activity.");

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login?redirect=/admin/customers");
  if (!user.permissions.includes("users.read")) redirect("/admin/dashboard?error=unauthorized");
  return <AdminCustomersClient canUpdate={user.permissions.includes("users.update")} />;
}
