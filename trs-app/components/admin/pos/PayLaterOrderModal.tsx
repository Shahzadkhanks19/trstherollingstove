"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import type { PosOrderType } from "@/types/pos";

export type PosTableChoice = { id: string; name: string; status: string };

export function PayLaterOrderModal({
  open,
  orderType,
  tables,
  onClose,
  onConfirm,
}: {
  open: boolean;
  orderType: PosOrderType;
  tables: PosTableChoice[];
  onClose: () => void;
  onConfirm: (input: {
    tableId: string | null;
    tableName: string;
    guestCount: number;
  }) => Promise<void>;
}) {
  const [tableId, setTableId] = useState("");
  const [manualTable, setManualTable] = useState("");
  const [guestCount, setGuestCount] = useState(2);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  if (!open) return null;
  async function submit() {
    const selected = tables.find((table) => table.id === tableId);
    const tableName = selected?.name ?? manualTable.trim();
    setLoading(true);
    setError("");
    try {
      await onConfirm({
        tableId: selected?.id ?? null,
        tableName,
        guestCount: Math.max(1, guestCount),
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to open pay-later order.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="fixed inset-0 z-[170] grid place-items-end bg-black/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-5">
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close pay-later setup"
      />
      <section
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full rounded-t-[28px] bg-[#fffdf9] p-5 shadow-2xl sm:max-w-md sm:rounded-[28px]"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#C8102E]">
              Pay later
            </p>
            <h2 className="text-xl font-black text-[#173044]">
              Open running order
            </h2>
            <p className="mt-1 text-sm text-[#756960]">
              Send the order now and collect Cash or UPI when the customer is
              ready to pay.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl bg-[#f3ece5]"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        {orderType === "dine_in" && (
          <div className="mt-5 space-y-3">
            <label className="block text-xs font-black text-[#756960]">
              Available table (optional)
              <select
                value={tableId}
                onChange={(event) => {
                  setTableId(event.currentTarget.value);
                  setError("");
                }}
                className="mt-1 h-11 w-full rounded-xl border border-[#e5d9cf] bg-white px-3"
              >
                <option value="">No table assigned (optional)</option>
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-black text-[#756960]">
              Or manual table label (optional)
              <input
                value={manualTable}
                maxLength={40}
                onChange={(event) => {
                  setManualTable(event.currentTarget.value);
                  setError("");
                }}
                className="mt-1 h-11 w-full rounded-xl border border-[#e5d9cf] px-3"
                placeholder="For example: Table 6"
              />
            </label>
          </div>
        )}
        <label className="mt-3 block text-xs font-black text-[#756960]">
          Guest count
          <input
            type="number"
            min={1}
            max={100}
            value={guestCount}
            onChange={(event) =>
              setGuestCount(Math.max(1, Number(event.currentTarget.value) || 1))
            }
            className="mt-1 h-11 w-full rounded-xl border border-[#e5d9cf] px-3"
          />
        </label>
        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
            {error}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-[#ded3ca] font-black"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void submit()}
            className="h-11 rounded-xl bg-[#173044] font-black text-white disabled:opacity-50"
          >
            {loading ? "Opening…" : "Open Pay Later"}
          </button>
        </div>
      </section>
    </div>
  );
}

