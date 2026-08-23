import { redirect } from "next/navigation";

import { AdminChangeEmailClient } from "@/components/admin/security/AdminChangeEmailClient";
import { AdminChangePasswordClient } from "@/components/admin/security/AdminChangePasswordClient";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const metadata = createAdminMetadata(
  "Account Security",
  "Change the signed-in administrator login email or password and revoke active sessions.",
);

export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(
      "/admin/login?redirect=/admin/security",
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#C8102E]">
          Account security
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-.04em] text-[#173044] sm:text-4xl">
          Admin Login & Security
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Manage the email and password used to access
          this administrator account. Credential changes
          revoke every active session.
        </p>
      </header>

      <div className="grid gap-6 2xl:grid-cols-2 2xl:items-start">
        <AdminChangeEmailClient
          currentEmail={user.email}
        />

        <div className="[&>div>header]:hidden [&>div]:space-y-0">
          <AdminChangePasswordClient />
        </div>
      </div>
    </div>
  );
}
