import { createAdminMetadata } from "@/lib/admin/metadata";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { AdminLoginClient } from "@/components/admin/auth/AdminLoginClient";

export const metadata = createAdminMetadata("Admin Login", "Sign in securely to manage The Rolling Stove operations.");
export default async function AdminLoginPage() {
  const user = await getAuthenticatedUser();
  if (user && user.roleKey !== "customer" && user.roleKey !== "user") redirect("/admin/dashboard");
  return <Suspense fallback={<main className="min-h-screen bg-[#171717]" />}><AdminLoginClient /></Suspense>;
}
