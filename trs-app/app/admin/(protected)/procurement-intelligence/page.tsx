import { redirect } from "next/navigation";
import { ProcurementIntelligenceClient } from "@/components/admin/inventory/ProcurementIntelligenceClient";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const metadata = createAdminMetadata(
  "Procurement Intelligence",
  "Inventory demand, stockout risk, open purchase orders and supplier-wise buying recommendations.",
);
export const dynamic = "force-dynamic";

export default async function ProcurementIntelligencePage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login?redirect=/admin/procurement-intelligence");
  if (!user.permissions.includes("purchases.read")) redirect("/admin/login?error=unauthorized");
  return <ProcurementIntelligenceClient />;
}
