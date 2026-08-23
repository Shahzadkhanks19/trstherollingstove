import { createAdminMetadata } from "@/lib/admin/metadata";
import { requirePermission } from "@/lib/auth/session";
import { AdminGalleryClient } from "@/components/admin/content/AdminGalleryClient";

export const metadata = createAdminMetadata("Gallery", "Manage public gallery images and videos.");

export default async function AdminGalleryPage() {
  await requirePermission("cms.read");
  return <AdminGalleryClient />;
}
