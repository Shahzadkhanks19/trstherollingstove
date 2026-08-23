import { createAdminMetadata } from "@/lib/admin/metadata";
import { Suspense } from "react";
import { AdminPasswordRecoveryClient } from "@/components/admin/auth/AdminPasswordRecoveryClient";
export const metadata = createAdminMetadata("Create New Admin Password", "Set a new secure password for your TRS admin account.");
export default function Page() { return <Suspense fallback={<main className="min-h-screen bg-[#171717]" />}><AdminPasswordRecoveryClient mode="reset" /></Suspense>; }
