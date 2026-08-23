import { CashRegisterHistoryClient } from "@/components/admin/pos/CashRegisterHistoryClient";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { requirePermission } from "@/lib/auth/session";

export const metadata = createAdminMetadata("Cash Registers", "Review historical POS shifts, cash movements and register reconciliation.");
export const dynamic = "force-dynamic";

export default async function CashRegistersPage() {
  await requirePermission("pos.use");
  return <CashRegisterHistoryClient />;
}
