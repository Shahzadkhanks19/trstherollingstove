import { redirect } from "next/navigation";
import { ForecastGovernanceClient } from "@/components/admin/forecasting/ForecastGovernanceClient";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { getAuthenticatedUser } from "@/lib/auth/session";
export const metadata = createAdminMetadata("Forecast Governance", "Forecast accuracy, approvals, publishing, reliability and immutable audit history.");
export const dynamic = "force-dynamic";
export default async function ForecastGovernancePage(){const user=await getAuthenticatedUser();if(!user)redirect("/admin/login?redirect=/admin/forecast-governance");if(!user.permissions.includes("reports.read"))redirect("/admin/login?error=unauthorized");return <ForecastGovernanceClient/>;}
