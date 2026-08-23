import type { Metadata } from "next";
import { RefundCancellationPolicyPage } from "@/components/legal/RefundCancellationPolicyPage";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description:
    "Read the TRS refund and cancellation rules for dine-in and takeaway orders, failed payments, duplicate payments and order issues.",
};

export default function RefundPolicyPage() {
  return <RefundCancellationPolicyPage />;
}
