import { createAdminMetadata } from "@/lib/admin/metadata";
import { redirect } from "next/navigation";
import { AdminEnquiriesClient } from "@/components/admin/enquiries/AdminEnquiriesClient";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const metadata = createAdminMetadata("Enquiries", "Manage customer contact enquiries and follow-up status.");

export const dynamic = "force-dynamic";

export default async function AdminEnquiriesPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login?redirect=/admin/enquiries");
  if (!user.permissions.includes("notifications.read")) redirect("/admin/dashboard?error=unauthorized");
  return <AdminEnquiriesClient canManage={user.permissions.includes("notifications.manage")} />;
}
