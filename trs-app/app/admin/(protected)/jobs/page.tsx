import { createAdminMetadata } from "@/lib/admin/metadata";
import { requirePermission } from "@/lib/auth/session";
import { AdminJobsClient } from "@/components/admin/content/AdminJobsClient";

export const metadata = createAdminMetadata("Jobs", "Create and publish career openings.");

export default async function AdminJobsPage() {
  await requirePermission("cms.read");
  return <AdminJobsClient />;
}
