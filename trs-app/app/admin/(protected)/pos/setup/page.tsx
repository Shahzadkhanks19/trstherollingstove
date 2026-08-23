import { redirect } from "next/navigation";

import { AdminPOSSetupClient } from "@/components/admin/pos/AdminPOSSetupClient";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const metadata = createAdminMetadata("POS Setup", "Manage POS registers and counter-only sale items.");
export const dynamic = "force-dynamic";

export default async function AdminPOSSetupPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login?redirect=/admin/pos/setup");
  if (!user.permissions.includes("pos.manage")) redirect("/admin/login?error=unauthorized");
  return <AdminPOSSetupClient />;
}
