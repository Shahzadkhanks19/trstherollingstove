import { redirect } from "next/navigation";
import { KpiIntelligenceClient } from "@/components/admin/intelligence/KpiIntelligenceClient";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { getAuthenticatedUser } from "@/lib/auth/session";
export const metadata=createAdminMetadata("KPI Intelligence","Advanced revenue, margin, cost and operational exception intelligence.");
export const dynamic="force-dynamic";
export default async function KpiIntelligencePage(){const user=await getAuthenticatedUser();if(!user)redirect("/admin/login?redirect=/admin/kpi-intelligence");if(!user.permissions.includes("reports.read"))redirect("/admin/login?error=unauthorized");return <KpiIntelligenceClient/>;}
