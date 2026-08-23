import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login?redirect=/admin/dashboard");
  if (user.roleKey === "customer" || user.roleKey === "user") redirect("/admin/login?error=unauthorized");
  return <AdminShell user={{ name: user.name, roleKey: user.roleKey, permissions: user.permissions }}>{children}</AdminShell>;
}
