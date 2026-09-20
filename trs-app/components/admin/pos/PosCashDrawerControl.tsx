"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCashRegister } from "@fortawesome/free-solid-svg-icons";
import { PosCashDrawerPanel } from "@/components/admin/pos/PosCashDrawerPanel";
import { usePosCashDrawer } from "@/components/admin/pos/use-pos-cash-drawer";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function PosCashDrawerControl() {
  const [open, setOpen] = useState(false);
  const drawer = usePosCashDrawer();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void drawer.refreshDrawer();
        }}
        className="inline-flex items-center gap-2 rounded-xl border border-[#e5d9cf] bg-white px-3 py-2 text-xs font-black text-[#122b3c]"
      >
        <FontAwesomeIcon icon={faCashRegister} className="text-[#C8102E]" />
        Today&apos;s drawer {money.format(drawer.shift?.expectedCash ?? 0)}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[9999] flex items-end justify-center overflow-hidden bg-black/55 p-0 backdrop-blur-sm sm:items-stretch sm:p-4 lg:items-center">
              <button
                type="button"
                className="absolute inset-0"
                onClick={() => setOpen(false)}
                aria-label="Close cash drawer"
              />
              <PosCashDrawerPanel
                {...drawer}
                onClose={() => setOpen(false)}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
