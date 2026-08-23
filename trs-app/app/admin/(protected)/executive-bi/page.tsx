import { redirect } from "next/navigation";
import { ExecutiveBIDashboardClient } from "@/components/admin/analytics/ExecutiveBIDashboardClient";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { getAuthenticatedUser } from "@/lib/auth/session";
export const metadata=createAdminMetadata("Executive BI","Executive financial and operational business intelligence."); export const dynamic="force-dynamic";
export default async function ExecutiveBIPage(){const user=await getAuthenticatedUser();if(!user)redirect("/admin/login?redirect=/admin/executive-bi");if(!user.permissions.includes("reports.read"))redirect("/admin/login?error=unauthorized");return <ExecutiveBIDashboardClient/>;}
