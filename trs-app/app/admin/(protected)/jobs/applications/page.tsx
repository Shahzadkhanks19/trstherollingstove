import { AdminJobApplicationsClient } from "@/components/admin/content/AdminJobApplicationsClient";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { requirePermission } from "@/lib/auth/session";

export const metadata = createAdminMetadata("Job Applications", "Review and manage submitted career applications.");

export default async function AdminJobApplicationsPage() {
  await requirePermission("cms.read");
  return <AdminJobApplicationsClient />;
}
