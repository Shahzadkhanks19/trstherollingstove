import {
  money,
  type ApiEnvelope,
  type CheckoutOrder,
  type OrderMode,
} from "@/components/checkout/checkout-utils";

type ValidateCouponResult = {
  discountAmount: number;
  freeItem?: { name: string } | null;
};

export async function validateCheckoutCoupon(code: string) {
  const response = await fetch("/api/v1/customer/rewards/validate-coupon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const body = (await response.json()) as ApiEnvelope<ValidateCouponResult>;
  if (!response.ok) throw new Error(body.message);

  return {
    discountAmount: body.data.discountAmount,
    message: body.data.freeItem
      ? `${body.data.freeItem.name} is free with this coupon.`
      : `${code.toUpperCase()} applied. You saved ${money(body.data.discountAmount)}.`,
  };
}

type CreateCheckoutOrderInput = {
  orderMode: OrderMode;
  selectedSlot: string;
  note: string;
  couponCode?: string;
  coinsToRedeem: number;
};

export async function createCheckoutOrder({
  orderMode,
  selectedSlot,
  note,
  couponCode,
  coinsToRedeem,
}: CreateCheckoutOrderInput) {
  const response = await fetch("/api/v1/customer/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderMode,
      tableNumber: "",
      requestedPickupAt: selectedSlot,
      customerNote: note,
      paymentMethod: "online",
      couponCode,
      coinsToRedeem,
    }),
  });
  const body = (await response.json()) as ApiEnvelope<CheckoutOrder>;
  if (!response.ok) throw new Error(body.message);

  const applicationOrderId = body.data.id ?? body.data._id;
  if (!applicationOrderId) throw new Error("Order ID was not returned.");

  return applicationOrderId;
}
