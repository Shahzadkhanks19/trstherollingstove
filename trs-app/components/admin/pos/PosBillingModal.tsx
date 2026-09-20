"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import type { PosCartState } from "@/types/pos";
import { CustomActionModal } from "@/components/admin/CustomActionModal";
import { PosBillingPanel } from "@/components/admin/pos/PosBillingPanel";
import { usePosBilling } from "@/components/admin/pos/use-pos-billing";

type Props = {
  open: boolean;
  cart: PosCartState;
  onClose: () => void;
  onCompleted: (message: string) => void;
};

export function PosBillingModal({ open, cart, onClose, onCompleted }: Props) {
  const billing = usePosBilling({ open, cart, onClose, onCompleted });

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[80] grid place-items-end bg-black/50 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
        <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-[#fffdf9] shadow-2xl sm:max-w-xl sm:rounded-[28px]">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e8ddd3] bg-[#fffdf9] px-5 py-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#C8102E]">
                {cart.internalConsumption.saleType === "customer"
                  ? "Phase 3 billing"
                  : "Internal consumption"}
              </p>
              <h2 className="text-xl font-black text-[#122b3c]">
                {cart.internalConsumption.saleType === "customer"
                  ? "Complete sale"
                  : "Send order without payment"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-xl bg-[#f3ece5]"
              aria-label="Close billing"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>

          <PosBillingPanel cart={cart} billing={billing} />
        </div>
      </div>

      <CustomActionModal
        open={billing.upiConfirmOpen}
        title="Confirm UPI payment"
        description="Confirm that the PhonePe/UPI payment has been received before completing this sale."
        confirmLabel="Payment received"
        onClose={() => billing.setUpiConfirmOpen(false)}
        onConfirm={() => void billing.completeSale()}
      />
    </>
  );
}
