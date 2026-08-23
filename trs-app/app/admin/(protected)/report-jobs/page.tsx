import { redirect } from "next/navigation";
import { ReportJobsClient } from "@/components/admin/report-builder/ReportJobsClient";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const metadata = createAdminMetadata("Report Background Jobs", "Monitor scheduled-report queue execution, retries and generated outputs.");
export const dynamic = "force-dynamic";

export default async function ReportJobsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login?redirect=/admin/report-jobs");
  if (!user.permissions.includes("reports.read")) redirect("/admin/login?error=unauthorized");
  return <ReportJobsClient />;
}
