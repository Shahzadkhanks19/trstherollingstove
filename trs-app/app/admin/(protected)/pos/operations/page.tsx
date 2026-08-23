import { redirect } from "next/navigation";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { PosOperationsClient } from "@/components/admin/pos/PosOperationsClient";
export const metadata = createAdminMetadata("POS Operations", "Live tables and running order operations.");
export const dynamic = "force-dynamic";
export default async function PosOperationsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login?redirect=/admin/pos/operations");
  if (!user.permissions.includes("pos.use")) redirect("/admin/dashboard?error=unauthorized");
  return <PosOperationsClient canManage={user.permissions.includes("pos.manage")} />;
}
