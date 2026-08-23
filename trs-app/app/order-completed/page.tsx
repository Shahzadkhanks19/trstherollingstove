import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderCompletedClient } from "@/components/order-completed/OrderCompletedClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: "Order Completed",
  description: "Your TRS order has been completed. View earned coins, reorder, or share your experience.",
};

function PageFallback() {
  return (
    <main className="min-h-[70vh] bg-[#fffaf0] px-4 py-16 sm:px-6">
      <div className="mx-auto h-[520px] w-full max-w-4xl animate-pulse rounded-[2rem] border border-[#ead8b1] bg-white shadow-[0_24px_80px_rgba(94,49,17,0.10)]" />
    </main>
  );
}

export default function OrderCompletedPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <OrderCompletedClient />
    </Suspense>
  );
}
