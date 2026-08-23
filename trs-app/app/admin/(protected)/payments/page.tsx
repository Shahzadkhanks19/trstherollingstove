import { createAdminMetadata } from "@/lib/admin/metadata";
import { redirect } from "next/navigation";

import { AdminPaymentsClient } from "@/components/admin/finance/AdminPaymentsClient";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const metadata = createAdminMetadata("Payments", "Review payment transactions, failures and refunds.");

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login?redirect=/admin/payments");
  if (!user.permissions.includes("payments.read")) redirect("/admin/dashboard?error=unauthorized");
  return <AdminPaymentsClient canRefund={user.permissions.includes("payments.manage")} />;
}
