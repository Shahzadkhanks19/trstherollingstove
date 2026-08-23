import { createAdminMetadata } from "@/lib/admin/metadata";
import { AdminCouponsOffersClient } from "@/components/admin/growth/AdminCouponsOffersClient";
export const metadata = createAdminMetadata("Coupons & Offers", "Create and manage promotional coupons and offers.");

export const dynamic = "force-dynamic";
export default function CouponsOffersPage(){ return <AdminCouponsOffersClient/>; }
