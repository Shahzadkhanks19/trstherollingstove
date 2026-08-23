import { createAdminMetadata } from "@/lib/admin/metadata";
import { AdminReferralsClient } from "@/components/admin/growth/AdminReferralsClient";
export const metadata = createAdminMetadata("Referrals", "Track referral conversions, rewards and fraud review.");

export const dynamic = "force-dynamic";
export default function ReferralsPage(){ return <AdminReferralsClient/>; }
