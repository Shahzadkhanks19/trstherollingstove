"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCashRegister,
  faMoneyBillWave,
  faPrint,
  faQrcode,
  faReceipt,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

import type { PosCartState } from "@/types/pos";
import { usePosBilling } from "@/components/admin/pos/use-pos-billing";
import type { PosBillingTipMethod } from "@/components/admin/pos/pos-billing-payment";
import { CustomActionModal } from "@/components/admin/CustomActionModal";
import {
  reprintPosInvoice,
  reprintPosKot,
} from "@/components/admin/pos/pos-billing-print";

type Props = {
  open: boolean;
  cart: PosCartState;
  onClose: () => void;
  onCompleted: (message: string) => void;
};

export function PosBillingModal({ open, cart, onClose, onCompleted }: Props) {
  const billing = usePosBilling({ open, cart, onClose, onCompleted });
  const {
    totals,
    shift,
    registers,
    registerId,
    setRegisterId,
    openingCash,
    setOpeningCash,
    paymentMethod,
    setPaymentMethod,
    splitCash,
    setSplitCash,
    splitUpi,
    setSplitUpi,
    waivedAmount,
    setWaivedAmount,
    waivedReason,
    setWaivedReason,
    tipAmount,
    setTipAmount,
    tipMethod,
    setTipMethod,
    orderTakerName,
    setOrderTakerName,
    cashReceived,
    setCashReceived,
    upiReference,
    setUpiReference,
    tableNumber,
    setTableNumber,
    loading,
    message,
    lastInvoiceId,
    upiConfirmOpen,
    setUpiConfirmOpen,
    printSettings,
    openShift,
    completeSale,
  } = billing;

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

          <div className="space-y-5 p-5">
            {!shift ? (
              <section className="rounded-2xl border border-[#e5d9cf] bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#111820] text-[#E8A53A]">
                    <FontAwesomeIcon icon={faCashRegister} />
                  </span>
                  <div>
                    <h3 className="font-black text-[#122b3c]">
                      Open a register shift
                    </h3>
                    <p className="text-xs text-[#7c7067]">
                      A cashier shift is required before payment.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <select
                    value={registerId}
                    onChange={(event) =>
                      setRegisterId(event.currentTarget.value)
                    }
                    className="h-11 rounded-xl border border-[#e5d9cf] bg-white px-3 text-sm font-bold"
                  >
                    <option value="">Select register</option>
                    {registers.map((register) => (
                      <option key={register._id} value={register._id}>
                        {register.name} ({register.code})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={openingCash}
                    onChange={(event) =>
                      setOpeningCash(event.currentTarget.value)
                    }
                    className="h-11 rounded-xl border border-[#e5d9cf] px-3"
                    placeholder="Opening cash"
                  />
                </div>
                <button
                  type="button"
                  disabled={loading || !registerId}
                  onClick={() => void openShift()}
                  className="mt-3 h-11 w-full rounded-xl bg-[#111820] text-sm font-black text-white disabled:opacity-50"
                >
                  Open shift
                </button>
              </section>
            ) : (
              <>
                <section className="rounded-2xl border border-[#e5d9cf] bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#8b7e75]">
                        Amount due
                      </p>
                      <p className="text-3xl font-black text-[#C8102E]">
                        {money.format(totals.grandTotal)}
                      </p>
                    </div>
                    <div className="text-right text-xs font-bold text-[#7c7067]">
                      {shift.registerId?.name ?? "Register"}
                      <br />
                      Today&apos;s cash drawer{" "}
                      {money.format(shift.expectedCash ?? 0)}
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-[#e5d9cf] bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-[#122b3c]">
                        Print workflow
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#7c7067]">
                        KOT and invoice open as separate print jobs using the
                        formats selected in POS Setup.
                      </p>
                    </div>
                    <a
                      href="/admin/pos/setup#pos-print-settings"
                      className="shrink-0 rounded-lg border border-[#e5d9cf] px-3 py-2 text-[10px] font-black text-[#C8102E]"
                    >
                      Settings
                    </a>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-[#6d625a]">
                    <span>
                      KOT:{" "}
                      {printSettings.autoPrintKot
                        ? `${printSettings.kotPaper} · ${printSettings.kotCopies} copy`
                        : "Off"}
                    </span>
                    <span>
                      Invoice:{" "}
                      {printSettings.autoPrintInvoice
                        ? `${printSettings.invoicePaper.toUpperCase()} · ${printSettings.invoiceCopies} copy`
                        : "Off"}
                    </span>
                  </div>
                </section>

                {cart.orderType === "dine_in" && (
                  <label className="block text-xs font-black text-[#756960]">
                    Table number (Optional)
                    <input
                      value={tableNumber}
                      onChange={(event) =>
                        setTableNumber(event.currentTarget.value)
                      }
                      placeholder="e.g. T12 (Optional)"
                      maxLength={30}
                      className="mt-1 h-11 w-full rounded-xl border border-[#e5d9cf] px-3 text-sm"
                    />
                  </label>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`rounded-2xl border p-4 text-left ${paymentMethod === "cash" ? "border-emerald-700 bg-emerald-50" : "border-[#e5d9cf] bg-white"}`}
                  >
                    <FontAwesomeIcon
                      icon={faMoneyBillWave}
                      className="text-emerald-700"
                    />
                    <p className="mt-2 font-black">Cash</p>
                    <p className="text-xs text-[#7c7067]">
                      Record received amount and change.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("upi")}
                    className={`rounded-2xl border p-4 text-left ${paymentMethod === "upi" ? "border-violet-700 bg-violet-50" : "border-[#e5d9cf] bg-white"}`}
                  >
                    <FontAwesomeIcon
                      icon={faQrcode}
                      className="text-violet-700"
                    />
                    <p className="mt-2 font-black">PhonePe QR / UPI</p>
                    <p className="text-xs text-[#7c7067]">
                      Cashier manually confirms receipt.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("split")}
                    className={`rounded-2xl border p-4 text-left ${paymentMethod === "split" ? "border-blue-700 bg-blue-50" : "border-[#e5d9cf] bg-white"}`}
                  >
                    <FontAwesomeIcon
                      icon={faCashRegister}
                      className="text-blue-700"
                    />
                    <p className="mt-2 font-black">Split</p>
                    <p className="text-xs text-[#7c7067]">Cash + UPI.</p>
                  </button>
                </div>

                {paymentMethod === "cash" ? (
                  <label className="block text-xs font-black text-[#756960]">
                    Cash received
                    <input
                      type="number"
                      min="0"
                      value={cashReceived}
                      onChange={(event) =>
                        setCashReceived(event.currentTarget.value)
                      }
                      className="mt-1 h-11 w-full rounded-xl border border-[#e5d9cf] px-3 text-sm"
                    />
                  </label>
                ) : paymentMethod === "upi" ? (
                  <label className="block text-xs font-black text-[#756960]">
                    UPI reference (optional)
                    <input
                      value={upiReference}
                      onChange={(event) =>
                        setUpiReference(event.currentTarget.value)
                      }
                      maxLength={100}
                      className="mt-1 h-11 w-full rounded-xl border border-[#e5d9cf] px-3 text-sm"
                    />
                  </label>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-black">
                      Cash part
                      <input
                        type="number"
                        min="0"
                        value={splitCash}
                        onChange={(e) => setSplitCash(e.currentTarget.value)}
                        className="mt-1 h-11 w-full rounded-xl border px-3"
                      />
                    </label>
                    <label className="text-xs font-black">
                      UPI part
                      <input
                        type="number"
                        min="0"
                        value={splitUpi}
                        onChange={(e) => setSplitUpi(e.currentTarget.value)}
                        className="mt-1 h-11 w-full rounded-xl border px-3"
                      />
                    </label>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-black">
                    Waived / spared amount
                    <input
                      type="number"
                      min="0"
                      value={waivedAmount}
                      onChange={(e) => setWaivedAmount(e.currentTarget.value)}
                      className="mt-1 h-11 w-full rounded-xl border px-3"
                      placeholder="e.g. 10"
                    />
                  </label>
                  <label className="text-xs font-black">
                    Waiver reason
                    <input
                      value={waivedReason}
                      onChange={(e) => setWaivedReason(e.currentTarget.value)}
                      className="mt-1 h-11 w-full rounded-xl border px-3"
                      placeholder="No change available"
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-black">
                    Order taker / waiter
                    <input
                      value={orderTakerName}
                      onChange={(e) => setOrderTakerName(e.currentTarget.value)}
                      className="mt-1 h-11 w-full rounded-xl border px-3"
                      placeholder="Name"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs font-black">
                      Tip amount
                      <input
                        type="number"
                        min="0"
                        value={tipAmount}
                        onChange={(e) => setTipAmount(e.currentTarget.value)}
                        className="mt-1 h-11 w-full rounded-xl border px-3"
                      />
                    </label>
                    <label className="text-xs font-black">
                      Tip via
                      <select
                        value={tipMethod}
                        onChange={(e) =>
                          setTipMethod(
                            e.currentTarget.value as PosBillingTipMethod,
                          )
                        }
                        className="mt-1 h-11 w-full rounded-xl border px-3"
                      >
                        <option value="none">None</option>
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                      </select>
                    </label>
                  </div>
                </div>
                {Number(tipAmount || 0) > 0 && (
                  <div
                    className={`rounded-xl border p-3 text-xs font-bold ${tipMethod === "upi" ? "border-violet-200 bg-violet-50 text-violet-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
                  >
                    {tipMethod === "upi" ? (
                      <>
                        Restaurant QR receives{" "}
                        <b>
                          {money.format(
                            Math.max(
                              0,
                              totals.grandTotal - Number(waivedAmount || 0),
                            ) + Number(tipAmount || 0),
                          )}
                        </b>
                        . Of this, <b>{money.format(Number(tipAmount || 0))}</b>{" "}
                        is payable to {orderTakerName.trim() || "the waiter"}{" "}
                        and is not restaurant revenue.
                      </>
                    ) : (
                      <>
                        Cash tip is collected directly by{" "}
                        {orderTakerName.trim() || "the waiter"}. It is not added
                        to the restaurant payment or cash drawer.
                      </>
                    )}
                  </div>
                )}

                <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-700 text-white">
                      <FontAwesomeIcon icon={faReceipt} />
                    </span>
                    <div>
                      <h3 className="font-black text-emerald-950">
                        Complete sale and print
                      </h3>
                      <p className="text-xs text-emerald-800">
                        KOT and invoice are opened as independent print jobs so
                        kitchen and billing printers can be selected separately.
                      </p>
                    </div>
                  </div>
                </section>

                <button
                  type="button"
                  disabled={loading || cart.lines.length === 0}
                  onClick={() => void completeSale()}
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#C8102E] text-sm font-black text-white shadow-lg disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faPrint} /> Complete sale & open print
                  jobs
                </button>
                {lastInvoiceId && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        reprintPosInvoice(lastInvoiceId, printSettings)
                      }
                      className="h-11 rounded-xl border border-[#e5d9cf] bg-white text-xs font-black"
                    >
                      Reprint invoice
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        reprintPosKot(lastInvoiceId, printSettings)
                      }
                      className="h-11 rounded-xl border border-[#e5d9cf] bg-white text-xs font-black"
                    >
                      Reprint kitchen KOT
                    </button>
                  </div>
                )}
              </>
            )}
            {message && (
              <p className="rounded-xl bg-[#f3ece5] px-3 py-2 text-center text-xs font-bold text-[#6d625a]">
                {message}
              </p>
            )}
          </div>
        </div>
      </div>
      <CustomActionModal
        open={upiConfirmOpen}
        title="Confirm UPI payment"
        description="Confirm that the PhonePe/UPI payment has been received before completing this sale."
        confirmLabel="Payment received"
        onClose={() => setUpiConfirmOpen(false)}
        onConfirm={() => void completeSale()}
      />
    </>
  );
}
