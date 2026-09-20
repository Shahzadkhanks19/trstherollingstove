import type { PublicOrderingSettings } from "@/lib/checkout/timeSlots";

type CheckoutValidationInput = {
  accepting: boolean;
  statusMessage: string;
  selectedSlot: string;
  customerName: string;
  customerPhone: string;
  confirmed: boolean;
  itemCount: number;
};

export function validateCheckoutSubmission({
  accepting,
  statusMessage,
  selectedSlot,
  customerName,
  customerPhone,
  confirmed,
  itemCount,
}: CheckoutValidationInput): string | null {
  if (!accepting) {
    return statusMessage || "TRS is not accepting orders now.";
  }
  if (!selectedSlot) {
    return "Select a same-day order time.";
  }
  if (!customerName.trim()) {
    return "Enter your full name.";
  }

  const phone = customerPhone.replace(/\D/g, "").slice(-10);
  if (!/^[6-9]\d{9}$/.test(phone)) {
    return "Enter a valid 10-digit Indian mobile number.";
  }
  if (!confirmed) {
    return "Confirm that you will collect or consume the order at the selected time.";
  }
  if (!itemCount) {
    return "Your cart is empty. Add a real menu item before checkout.";
  }

  return null;
}

export function isCheckoutAcceptingOrders(
  settings: PublicOrderingSettings,
  slotCount: number,
) {
  return (
    settings.orderingEnabled &&
    settings.acceptingOrders &&
    settings.storeStatus !== "closed" &&
    settings.storeStatus !== "not_accepting_orders" &&
    slotCount > 0
  );
}
