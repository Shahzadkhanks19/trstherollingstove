import { redirect } from "next/navigation";
import { ReportAutomationClient } from "@/components/admin/report-builder/ReportAutomationClient";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const metadata = createAdminMetadata("Report Automation", "Monitor delivery, queue health, retention and scheduled-report settings.");
export const dynamic = "force-dynamic";

export default async function ReportAutomationPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login?redirect=/admin/report-automation");
  if (!user.permissions.includes("reports.read")) redirect("/admin/login?error=unauthorized");
  return <ReportAutomationClient canManage={user.permissions.includes("settings.manage")} />;
}
