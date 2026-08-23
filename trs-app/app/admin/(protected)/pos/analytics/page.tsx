import { createAdminMetadata } from "@/lib/admin/metadata";
import { requirePermission } from "@/lib/auth/session";
import { PosAnalyticsClient } from "@/components/admin/pos/PosAnalyticsClient";
export const metadata = createAdminMetadata("POS Analytics", "Hourly orders and category performance for TRS POS.");
export const dynamic = "force-dynamic";
export default async function PosAnalyticsPage(){await requirePermission("reports.read");return <PosAnalyticsClient/>;}
