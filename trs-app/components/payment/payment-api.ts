import type { PaymentStatusData } from "@/components/payment/PaymentOrderSummary";

export type PaymentOrder = {
  key: string;
  keyId?: string;
  orderId: string;
  providerOrderId?: string;
  amount: number;
  currency: string;
  orderNumber: string;
};

type ApiEnvelope<T> = { success: boolean; message: string; data: T };

export async function fetchPaymentStatus(orderId: string) {
  const response = await fetch(
    `/api/v1/customer/payments/status?orderId=${encodeURIComponent(orderId)}`,
    { cache: "no-store" },
  );
  const body = (await response.json()) as ApiEnvelope<PaymentStatusData>;
  if (!response.ok) {
    throw new Error(body.message || "Unable to load payment status.");
  }
  return body.data;
}

export async function createPaymentOrder(orderId: string) {
  const response = await fetch("/api/v1/customer/payments/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  });
  const body = (await response.json()) as ApiEnvelope<PaymentOrder>;
  if (!response.ok) {
    throw new Error(body.message || "Unable to create payment session.");
  }
  return body.data;
}

export async function verifyPayment(
  orderId: string,
  response: RazorpaySuccessResponse,
) {
  const verifyResponse = await fetch("/api/v1/customer/payments/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId,
      razorpayOrderId: response.razorpay_order_id,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpaySignature: response.razorpay_signature,
    }),
  });
  const body = (await verifyResponse.json()) as { message?: string };
  if (!verifyResponse.ok) {
    throw new Error(body.message || "Payment verification failed.");
  }
}

export async function recordPaymentFailure(
  orderId: string,
  razorpayOrderId: string,
  response: RazorpayFailureResponse,
) {
  await fetch("/api/v1/customer/payments/fail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId,
      razorpayOrderId,
      code: response.error?.code,
      description: response.error?.description,
      reason: response.error?.reason,
    }),
  });
}
