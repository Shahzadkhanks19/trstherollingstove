"use client";

import { CustomActionModal } from "@/components/admin/CustomActionModal";
import type { HeldOrder } from "@/components/admin/pos/HeldOrdersModal";

export type PendingPosAction =
  | { kind: "clear" }
  | { kind: "hold" }
  | { kind: "recall"; order: HeldOrder }
  | { kind: "delete-held"; order: HeldOrder }
  | null;

export function PosPendingActionModal({
  action, onClose, onConfirm,
}: {
  action: PendingPosAction;
  onClose: () => void;
  onConfirm: (value: string) => void | Promise<void>;
}) {
  return <CustomActionModal
    open={Boolean(action)}
    title={action?.kind === "clear" ? "Clear current POS order?" : action?.kind === "hold" ? "Hold current order" : action?.kind === "recall" ? "Replace current cart?" : "Delete held order?"}
    description={action?.kind === "clear" ? "This removes every item, customer selection, discount and charge from the current cart." : action?.kind === "hold" ? "Give this held order a clear name so the cashier can find it later." : action?.kind === "recall" ? "The current cart will be replaced by the selected held order." : "This permanently removes the held order."}
    confirmLabel={action?.kind === "hold" ? "Hold order" : action?.kind === "recall" ? "Replace cart" : action?.kind === "clear" ? "Clear order" : "Delete"}
    tone={action?.kind === "clear" || action?.kind === "delete-held" ? "danger" : "default"}
    inputLabel={action?.kind === "hold" ? "Held order name" : undefined}
    inputRequired={action?.kind === "hold"}
    initialValue={action?.kind === "hold" ? `Order ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
    onClose={onClose}
    onConfirm={onConfirm}
  />;
}
