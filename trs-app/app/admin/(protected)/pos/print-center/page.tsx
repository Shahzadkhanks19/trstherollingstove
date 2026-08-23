import { redirect } from "next/navigation";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { PrintCenterClient } from "@/components/admin/pos/PrintCenterClient";
export const metadata = createAdminMetadata("Print Center", "Review print requests, retry KOTs and invoices, and audit reprints.");
export default async function Page(){ const user=await getAuthenticatedUser(); if(!user) redirect("/admin/login?redirect=/admin/pos/print-center"); if(!user.permissions.includes("pos.use")) redirect("/admin/dashboard?error=unauthorized"); return <PrintCenterClient/>; }
