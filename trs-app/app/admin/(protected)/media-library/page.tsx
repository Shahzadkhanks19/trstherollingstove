import { createAdminMetadata } from "@/lib/admin/metadata";
import { requirePermission } from "@/lib/auth/session";
import { AdminMediaLibraryClient } from "@/components/admin/media/AdminMediaLibraryClient";

export const metadata = createAdminMetadata("Media Library", "Upload and reuse website media assets.");

export default async function AdminMediaLibraryPage() {
  await requirePermission("cms.read");
  return <AdminMediaLibraryClient />;
}
