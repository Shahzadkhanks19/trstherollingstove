import type { Metadata } from "next";
import { OrderConfirmationClient } from "@/components/order-confirmation/OrderConfirmationClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: "Order Confirmation",
  description: "View your accepted TRS order, estimated ready time, queue position, and kitchen status.",
};

export default function OrderConfirmationPage() {
  return <OrderConfirmationClient />;
}
