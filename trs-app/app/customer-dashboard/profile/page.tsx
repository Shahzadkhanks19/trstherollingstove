import type { Metadata } from "next";
import { ProfileForm } from "@/components/customer-dashboard/ProfileForm";
export const metadata: Metadata = { title: "My Profile", robots: { index: false, follow: false } };
export default function CustomerProfilePage() { return <ProfileForm />; }
