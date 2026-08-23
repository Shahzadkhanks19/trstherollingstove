import { createAdminMetadata } from "@/lib/admin/metadata";
import { redirect } from "next/navigation";

import { AdminReportsClient } from "@/components/admin/finance/AdminReportsClient";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const metadata = createAdminMetadata("Reports", "Analyse sales, orders, payments and operational performance.");

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login?redirect=/admin/reports");
  if (!user.permissions.includes("reports.read")) redirect("/admin/dashboard?error=unauthorized");
  return <AdminReportsClient />;
}
