export const PAYMENT_STORAGE_KEY = "trs.pendingPaymentOrderId";

const ORDER_ID_PATTERN = /^[a-f\d]{24}$/i;

export function resolvePendingPaymentOrderId() {
  const queryId =
    new URLSearchParams(window.location.search).get("orderId") ?? "";
  const storedId = sessionStorage.getItem(PAYMENT_STORAGE_KEY) ?? "";
  const orderId = ORDER_ID_PATTERN.test(queryId) ? queryId : storedId;

  return ORDER_ID_PATTERN.test(orderId) ? orderId : null;
}

export function storePendingPaymentOrderId(orderId: string) {
  sessionStorage.setItem(PAYMENT_STORAGE_KEY, orderId);
}

export function clearPendingPaymentOrderId() {
  sessionStorage.removeItem(PAYMENT_STORAGE_KEY);
}

export function redirectToOrderSuccess(orderNumber?: string) {
  window.location.replace(
    orderNumber
      ? `/order-success?order=${encodeURIComponent(orderNumber)}`
      : "/order-success",
  );
}
