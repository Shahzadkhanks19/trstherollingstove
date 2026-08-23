import { redirect } from "next/navigation";
import { EnterpriseOperationsDashboardClient } from "@/components/admin/system/EnterpriseOperationsDashboardClient";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { getAuthenticatedUser } from "@/lib/auth/session";
export const metadata=createAdminMetadata("Enterprise Operations","Production readiness and enterprise operations control center.");export const dynamic="force-dynamic";
export default async function EnterpriseOperationsPage(){const user=await getAuthenticatedUser();if(!user)redirect("/admin/login?redirect=/admin/enterprise-operations");if(!user.permissions.includes("settings.manage"))redirect("/admin/login?error=unauthorized");return <EnterpriseOperationsDashboardClient/>;}
