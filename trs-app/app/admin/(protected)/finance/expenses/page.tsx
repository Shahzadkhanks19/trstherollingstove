import { redirect } from "next/navigation";
import { ExpenseManagementClient } from "@/components/admin/finance/ExpenseManagementClient";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { getAuthenticatedUser } from "@/lib/auth/session";
export const metadata=createAdminMetadata("Expense Management","Operating expenses, approvals, recurring commitments and cost intelligence.");export const dynamic="force-dynamic";
export default async function ExpenseManagementPage(){const user=await getAuthenticatedUser();if(!user)redirect("/admin/login?redirect=/admin/finance/expenses");if(!user.permissions.includes("reports.read"))redirect("/admin/dashboard?error=unauthorized");return <ExpenseManagementClient/>;}
