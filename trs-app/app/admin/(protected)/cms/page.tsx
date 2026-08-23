import { createAdminMetadata } from "@/lib/admin/metadata";
import { requirePermission } from "@/lib/auth/session";
import { AdminCmsClient } from "@/components/admin/content/AdminCmsClient";

export const metadata = createAdminMetadata("CMS", "Manage website banners, testimonials and homepage content.");

export default async function AdminCmsPage() {
  await requirePermission("cms.read");
  return <AdminCmsClient />;
}
