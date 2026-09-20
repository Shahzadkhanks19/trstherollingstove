export type PosBillingPaymentMethod = "cash" | "upi" | "split";
export type PosBillingTipMethod = "none" | "cash" | "upi";

export type PosBillingPaymentInput = {
  isInternalOrder: boolean;
  grandTotal: number;
  paymentMethod: PosBillingPaymentMethod;
  splitCash: string;
  splitUpi: string;
  waivedAmount: string;
  waivedReason: string;
  tipAmount: string;
  tipMethod: PosBillingTipMethod;
  cashReceived: string;
  upiConfirmed: boolean;
};

export type PosBillingPaymentResolution =
  | { ok: false; message: string }
  | { ok: false; requiresUpiConfirmation: true }
  | {
      ok: true;
      waiver: number;
      tip: number;
      payable: number;
      received: number;
    };

export function resolvePosBillingPayment(
  input: PosBillingPaymentInput,
): PosBillingPaymentResolution {
  const waiver = input.isInternalOrder ? 0 : Number(input.waivedAmount || 0);
  const tip = input.isInternalOrder ? 0 : Number(input.tipAmount || 0);
  const saleDue = Math.max(0, input.grandTotal - waiver);
  const onlineTip = input.tipMethod === "upi" ? tip : 0;
  const payable = saleDue + onlineTip;
  const received =
    input.paymentMethod === "cash" ? Number(input.cashReceived) : payable;

  if (waiver > 0 && input.waivedReason.trim().length < 3) {
    return {
      ok: false,
      message: "Enter why the remaining balance is being waived.",
    };
  }

  if (tip > 0 && input.tipMethod === "none") {
    return {
      ok: false,
      message: "Select how the waiter tip was received.",
    };
  }

  if (
    input.paymentMethod === "split" &&
    Math.abs(
      Number(input.splitCash || 0) + Number(input.splitUpi || 0) - payable,
    ) > 0.01
  ) {
    return {
      ok: false,
      message:
        "Cash and UPI must exactly equal the restaurant collection amount, including only UPI tips.",
    };
  }

  if (input.paymentMethod === "cash" && received < payable) {
    return {
      ok: false,
      message: "Cash received is less than the restaurant collection amount.",
    };
  }

  if (
    (input.paymentMethod === "upi" ||
      (input.paymentMethod === "split" && Number(input.splitUpi || 0) > 0)) &&
    !input.upiConfirmed
  ) {
    return { ok: false, requiresUpiConfirmation: true };
  }

  return { ok: true, waiver, tip, payable, received };
}
