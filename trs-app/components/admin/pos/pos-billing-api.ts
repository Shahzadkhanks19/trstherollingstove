import type { PosCartState } from "@/types/pos";

export type BillingRegister = {
  _id: string;
  name: string;
  code: string;
  isActive: boolean;
};

export type BillingShift = {
  _id: string;
  expectedCash: number;
  registerId: BillingRegister;
};

type ApiErrorDetail = { field?: string; path?: string; message?: string };
type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: ApiErrorDetail[];
};

const mongoObjectIdPattern = /^[a-f\d]{24}$/i;

function realObjectIdOrNull(value: string | null | undefined): string | null {
  return value && mongoObjectIdPattern.test(value) ? value : null;
}

function apiErrorMessage<T>(response: ApiResponse<T>, fallback: string) {
  const details = response.errors
    ?.map((error) => {
      const field = error.field || error.path;
      return `${field ? `${field}: ` : ""}${error.message || "Invalid value."}`;
    })
    .filter(Boolean);

  return details?.length ? details.join(" · ") : response.message || fallback;
}

export async function fetchPosBillingSetup(signal: AbortSignal) {
  const [shiftResponse, registerResponse] = await Promise.all([
    fetch("/api/v1/pos/shifts/current?mine=true", {
      cache: "no-store",
      signal,
    }),
    fetch("/api/v1/admin/pos/registers", {
      cache: "no-store",
      signal,
    }),
  ]);
  const shiftJson = (await shiftResponse.json()) as ApiResponse<BillingShift | null>;
  const registerJson = (await registerResponse.json()) as ApiResponse<BillingRegister[]>;

  if (!shiftResponse.ok) throw new Error(shiftJson.message);
  if (!registerResponse.ok) throw new Error(registerJson.message);

  return {
    shift: shiftJson.data,
    registers: registerJson.data.filter((register) => register.isActive),
  };
}

export async function openPosBillingShift(
  registerId: string,
  openingCash: number,
) {
  const response = await fetch("/api/v1/pos/shifts/open", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ registerId, openingCash }),
  });
  const json = (await response.json()) as ApiResponse<BillingShift>;

  if (!response.ok) {
    throw new Error(apiErrorMessage(json, "Unable to open shift."));
  }

  return json.data;
}

export type PosSalePayload = ReturnType<typeof buildPosSalePayload>;

export function buildPosSalePayload({
  cart,
  shiftId,
  paymentMethod,
  splitCash,
  splitUpi,
  waivedAmount,
  waivedReason,
  tipAmount,
  tipMethod,
  orderTakerName,
  cashReceived,
  upiReference,
  tableNumber,
  clientOperationId,
}: {
  cart: PosCartState;
  shiftId: string;
  paymentMethod: "cash" | "upi" | "split";
  splitCash: string;
  splitUpi: string;
  waivedAmount: string;
  waivedReason: string;
  tipAmount: string;
  tipMethod: "none" | "cash" | "upi";
  orderTakerName: string;
  cashReceived: string;
  upiReference: string;
  tableNumber: string;
  clientOperationId: string;
}) {
  const isInternalOrder = cart.internalConsumption.saleType !== "customer";
  const waiver = isInternalOrder ? 0 : Number(waivedAmount || 0);
  const tip = isInternalOrder ? 0 : Number(tipAmount || 0);

  return {
    clientOperationId,
    shiftId,
    orderMode: cart.orderType,
    internalConsumption: cart.internalConsumption,
    tableNumber: tableNumber.trim(),
    customerId: cart.customer.isWalkIn ? null : cart.customer.id,
    customerName: cart.customer.name,
    customerPhone: cart.customer.phone,
    customerEmail: cart.customer.email,
    customerNote: cart.orderNote,
    paymentMethod: isInternalOrder ? "cash" : paymentMethod,
    upiReference: paymentMethod === "upi" ? upiReference : "",
    paymentBreakdown:
      paymentMethod === "split"
        ? [
            ...(Number(splitCash || 0) > 0
              ? [{ method: "cash", amount: Number(splitCash), reference: "" }]
              : []),
            ...(Number(splitUpi || 0) > 0
              ? [{ method: "upi", amount: Number(splitUpi), reference: upiReference }]
              : []),
          ]
        : [],
    waivedAmount: waiver,
    waivedReason,
    tipAmount: tip,
    tipMethod,
    tipCollection:
      tip > 0 ? (tipMethod === "upi" ? "restaurant" : "waiter_direct") : "none",
    orderTakerName,
    amountTendered: Number(cashReceived),
    adjustments: isInternalOrder
      ? {
          discountType: "none",
          discountValue: 0,
          discountReason: "",
          packingCharge: 0,
          serviceCharge: 0,
          additionalCharge: 0,
          additionalChargeLabel: "Additional charge",
          taxRate: 0,
          taxMode: "exclusive",
        }
      : cart.adjustments,
    items: cart.lines.map((line) => ({
      sourceType: line.source,
      itemId: line.itemId,
      variantId: realObjectIdOrNull(line.variantId),
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      specialInstructions: line.note,
      modifiers: line.modifiers.map((modifier) => ({
        groupId: modifier.groupId,
        groupName: modifier.groupName,
        optionId: modifier.optionId,
        optionName: modifier.optionName,
        quantity: modifier.quantity,
      })),
    })),
  };
}

export async function createPosSale(payload: PosSalePayload) {
  const response = await fetch("/api/v1/pos/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await response.json()) as ApiResponse<{
    order: { orderNumber: string; changeDue: number };
    invoice: { _id: string };
  }>;

  if (!response.ok) {
    throw new Error(apiErrorMessage(json, "Unable to complete sale."));
  }

  return json.data;
}
