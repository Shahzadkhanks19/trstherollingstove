import type { Metadata } from "next";
import { SecurityPanel } from "@/components/customer-dashboard/SecurityPanel";
export const metadata: Metadata = { title: "Account Security", robots: { index: false, follow: false } };
export default function CustomerSecurityPage(){return <SecurityPanel/>;}
