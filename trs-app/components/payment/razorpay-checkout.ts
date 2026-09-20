import type { PaymentOrder } from "@/components/payment/payment-api";
import type { PaymentStatusData } from "@/components/payment/PaymentOrderSummary";

type OpenRazorpayCheckoutInput = {
  paymentOrder: PaymentOrder;
  statusData: PaymentStatusData;
  onDismiss: () => void;
  onSuccess: (response: RazorpaySuccessResponse) => void;
  onFailure: (response: RazorpayFailureResponse) => void;
};

export function openRazorpayCheckout({
  paymentOrder,
  statusData,
  onDismiss,
  onSuccess,
  onFailure,
}: OpenRazorpayCheckoutInput) {
  if (!window.Razorpay) {
    throw new Error("Razorpay checkout is unavailable. Try loading it again.");
  }

  const checkout = new window.Razorpay({
    key: paymentOrder.key || paymentOrder.keyId || "",
    amount: paymentOrder.amount,
    currency: paymentOrder.currency,
    name: "The Rolling Stove",
    description: `Payment for ${paymentOrder.orderNumber}`,
    order_id: paymentOrder.orderId || paymentOrder.providerOrderId || "",
    image: "/images/trs-logo.png",
    prefill: {
      name: statusData.order.customerSnapshot.name,
      email: statusData.order.customerSnapshot.email,
      contact: statusData.order.customerSnapshot.phone,
    },
    theme: { color: "#E3172F" },
    modal: {
      escape: true,
      backdropclose: false,
      ondismiss: onDismiss,
    },
    handler: onSuccess,
  });

  checkout.on("payment.failed", onFailure);
  checkout.open();
}
