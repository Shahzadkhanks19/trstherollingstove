import type { Metadata } from "next";
import { PaymentProcessingClient } from "@/components/payment/PaymentProcessingClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: "Secure Payment",
  description: "Complete your TRS order using Razorpay secure checkout.",
};

export default function PaymentPage() {
  return <PaymentProcessingClient />;
}
