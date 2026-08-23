import type { Metadata } from "next";
import { DashboardOverview } from "@/components/customer-dashboard/DashboardOverview";
export const metadata: Metadata = { title: "Customer Dashboard", robots: { index: false, follow: false } };
export default function CustomerDashboardPage() { return <DashboardOverview />; }
