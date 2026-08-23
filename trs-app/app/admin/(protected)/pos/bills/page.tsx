import { createAdminMetadata } from "@/lib/admin/metadata";
import { requirePermission } from "@/lib/auth/session";
import { PosBillsClient } from "@/components/admin/pos/PosBillsClient";

export const metadata = createAdminMetadata("POS Bills", "Search and reprint permanent POS bills.");
export const dynamic = "force-dynamic";

export default async function PosBillsPage() {
  await requirePermission("pos.use");
  return <PosBillsClient />;
}
