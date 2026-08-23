import { createAdminMetadata } from "@/lib/admin/metadata";
import { requirePermission } from "@/lib/auth/session";
import { SalesAnalyticsClient } from "@/components/admin/analytics/SalesAnalyticsClient";
export const metadata = createAdminMetadata("Sales Analytics", "Historical sales, revenue, payment and item performance analytics.");
export const dynamic = "force-dynamic";
export default async function SalesAnalyticsPage() { await requirePermission("reports.read"); return <SalesAnalyticsClient />; }
