import type { Metadata } from "next";
import { OrderSuccessClient } from "@/components/order-success/OrderSuccessClient";

export const metadata: Metadata = {
  title: "Order Confirmed",
  description: "View your confirmed TRS order, payment details, pickup time, earned coins, tracking and invoice.",
  robots: { index: false, follow: false },
};

export default function OrderSuccessPage() {
  return <OrderSuccessClient />;
}
