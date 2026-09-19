import { AppError } from "@/lib/errors/AppError";
import type { CreatePosOrderInput } from "@/services/pos-order.types";
import {
  money,
  normalizeAdjustments,
  wholeRupee,
} from "@/services/pos-order.utils";

export function resolvePosOrderPayment(
  input: CreatePosOrderInput,
  subtotal: number,
  isInternalOrder: boolean,
) {
  const adjustments = isInternalOrder
    ? normalizeAdjustments(
        {
          discountType: "none",
          discountValue: 0,
          discountReason: "",
          packingCharge: 0,
          serviceCharge: 0,
          additionalCharge: 0,
          additionalChargeLabel: "Additional charge",
          taxRate: 0,
          taxMode: "exclusive",
        },
        subtotal,
      )
    : normalizeAdjustments(input.adjustments, subtotal);

  const discountTotal =
    adjustments.discountType === "percentage"
      ? wholeRupee(
          Math.min(subtotal, (subtotal * adjustments.discountValue) / 100),
        )
      : adjustments.discountType === "fixed"
        ? wholeRupee(Math.min(subtotal, adjustments.discountValue))
        : 0;
  const netSubtotal = wholeRupee(subtotal - discountTotal);
  const chargesTotal = wholeRupee(
    adjustments.packingCharge +
      adjustments.serviceCharge +
      adjustments.additionalCharge,
  );
  const preTax = wholeRupee(netSubtotal + chargesTotal);
  const taxTotal =
    adjustments.taxRate <= 0
      ? 0
      : adjustments.taxMode === "inclusive"
        ? wholeRupee(preTax - preTax / (1 + adjustments.taxRate / 100))
        : wholeRupee((preTax * adjustments.taxRate) / 100);
  const calculatedGrandTotal = wholeRupee(
    adjustments.taxMode === "inclusive" ? preTax : preTax + taxTotal,
  );
  const grandTotal = isInternalOrder ? 0 : calculatedGrandTotal;

  const waivedAmount = isInternalOrder
    ? 0
    : wholeRupee(Math.min(input.waivedAmount, grandTotal));
  const saleAmountDue = wholeRupee(grandTotal - waivedAmount);
  const tipAmount = isInternalOrder ? 0 : wholeRupee(input.tipAmount);
  // A tip only enters restaurant collections when the restaurant currently holds it.
  // This covers UPI tips and cash tips received at the counter for later waiter payout.
  const restaurantHeldTip =
    input.tipCollection === "restaurant" ? tipAmount : 0;
  const collectionTarget = wholeRupee(saleAmountDue + restaurantHeldTip);

  const paymentBreakdown = isInternalOrder
    ? []
    : input.paymentMethod === "split"
      ? input.paymentBreakdown
          .filter((part) => part.amount > 0)
          .map((part) => ({
            method: part.method,
            amount: money(part.amount),
            reference: part.reference.trim(),
          }))
      : [
          {
            method: input.paymentMethod,
            amount:
              input.paymentMethod === "cash"
                ? money(input.amountTendered)
                : collectionTarget,
            reference:
              input.paymentMethod === "upi" ? input.upiReference.trim() : "",
          },
        ];

  const collected = money(
    paymentBreakdown.reduce((sum, part) => sum + part.amount, 0),
  );
  if (!isInternalOrder && collected < collectionTarget) {
    throw new AppError(
      "Collected payment is less than the restaurant amount due.",
      422,
    );
  }
  if (
    !isInternalOrder &&
    input.paymentMethod === "split" &&
    Math.abs(collected - collectionTarget) > 0.01
  ) {
    throw new AppError(
      "Split payment amounts must exactly equal the restaurant amount due, including any UPI tip.",
      422,
    );
  }

  const cashPaid = money(
    paymentBreakdown
      .filter((part) => part.method === "cash")
      .reduce((sum, part) => sum + part.amount, 0),
  );
  const amountTendered = cashPaid;
  const changeDue =
    input.paymentMethod === "cash"
      ? money(Math.max(0, collected - collectionTarget))
      : 0;

  return {
    adjustments,
    discountTotal,
    taxTotal,
    grandTotal,
    waivedAmount,
    tipAmount,
    paymentBreakdown,
    cashPaid,
    amountTendered,
    changeDue,
  };
}
