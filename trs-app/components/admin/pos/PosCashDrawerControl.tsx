"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCashRegister,
  faClockRotateLeft,
  faDoorOpen,
  faMoneyBillTransfer,
  faMoneyBillWave,
  faRotate,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import {
  PosCashDrawerLedger,
} from "@/components/admin/pos/PosCashDrawerLedger";

import { usePosCashDrawer } from "@/components/admin/pos/use-pos-cash-drawer";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function PosCashDrawerControl() {
  const [open, setOpen] = useState(false);
  const {
    loading,
    shift,
    registers,
    registerId,
    setRegisterId,
    openingCash,
    setOpeningCash,
    cashToAdd,
    setCashToAdd,
    cashInReason,
    setCashInReason,
    cashToRemove,
    setCashToRemove,
    cashOutReason,
    setCashOutReason,
    countedCash,
    setCountedCash,
    closingNote,
    setClosingNote,
    closeApprovalNote,
    setCloseApprovalNote,
    message,
    closedToday,
    refreshDrawer,
    openShift,
    addCash,
    removeCash,
    closeShift,
  } = usePosCashDrawer();

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
          void refreshDrawer();
        }}
        className="inline-flex items-center gap-2 rounded-xl border border-[#e5d9cf] bg-white px-3 py-2 text-xs font-black text-[#122b3c]"
      >
        <FontAwesomeIcon icon={faCashRegister} className="text-[#C8102E]" />
        Today&apos;s drawer {money.format(shift?.expectedCash ?? 0)}
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
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="pos-cash-drawer-title"
                className="relative z-10 flex h-[min(96dvh,960px)] w-full flex-col overflow-hidden rounded-t-[28px] bg-[#fffdf9] shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-3xl sm:rounded-[28px] lg:max-h-[calc(100dvh-3rem)]"
              >
                <header className="z-20 flex shrink-0 items-center justify-between border-b border-[#eadfd6] bg-[#fffdf9] px-4 py-4 sm:px-5">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#C8102E]">
                      Counter controls & audit
                    </p>
                    <h2
                      id="pos-cash-drawer-title"
                      className="text-xl font-black text-[#122b3c]"
                    >
                      Today&apos;s cash drawer
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void refreshDrawer()}
                      disabled={loading}
                      className="grid h-11 w-11 place-items-center rounded-xl border border-[#e5d9cf] bg-white text-[#122b3c] disabled:opacity-50"
                      aria-label="Refresh cash drawer"
                    >
                      <FontAwesomeIcon icon={faRotate} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="grid h-11 w-11 place-items-center rounded-xl bg-[#f3ece5] text-[#122b3c]"
                      aria-label="Close cash drawer"
                    >
                      <FontAwesomeIcon icon={faXmark} />
                    </button>
                  </div>
                </header>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] [scrollbar-width:thin] sm:p-5">
                  {shift ? (
                    <>
                      <div className="rounded-2xl bg-[#111820] p-5 text-white">
                        <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#E8A53A]">
                          {shift.registerId?.name ?? "Register"}
                        </p>
                        <p className="mt-2 break-words text-3xl font-black sm:text-4xl">
                          {money.format(shift.expectedCash ?? 0)}
                        </p>
                        <p className="mt-2 text-xs text-white/65">
                          Live expected drawer: opening cash + cash sales +
                          cash-ins − cash-outs − cash refunds.
                        </p>
                      </div>

                      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                        <section className="min-w-0 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                          <h3 className="text-sm font-black text-emerald-950">
                            Add cash
                          </h3>
                          <p className="mt-1 text-xs text-emerald-800">
                            Add opening change or extra cash placed in the
                            drawer.
                          </p>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={cashToAdd}
                            onChange={(event) =>
                              setCashToAdd(event.currentTarget.value)
                            }
                            className="mt-3 h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm"
                            placeholder="For example: 500"
                          />
                          <input
                            value={cashInReason}
                            onChange={(event) =>
                              setCashInReason(event.currentTarget.value)
                            }
                            maxLength={500}
                            className="mt-2 h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm"
                            placeholder="Reason for adding cash"
                          />
                          <button
                            type="button"
                            disabled={
                              loading ||
                              !cashToAdd ||
                              cashInReason.trim().length < 2
                            }
                            onClick={() => void addCash()}
                            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 text-xs font-black text-white disabled:opacity-50"
                          >
                            <FontAwesomeIcon icon={faMoneyBillWave} /> Add to
                            drawer
                          </button>
                        </section>
                        <section className="min-w-0 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                          <h3 className="text-sm font-black text-amber-950">
                            Cash out
                          </h3>
                          <p className="mt-1 text-xs text-amber-800">
                            Record money removed from the physical drawer.
                          </p>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={cashToRemove}
                            onChange={(event) =>
                              setCashToRemove(event.currentTarget.value)
                            }
                            className="mt-3 h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm"
                            placeholder="Amount removed"
                          />
                          <input
                            value={cashOutReason}
                            onChange={(event) =>
                              setCashOutReason(event.currentTarget.value)
                            }
                            maxLength={500}
                            className="mt-2 h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm"
                            placeholder="Reason / purpose"
                          />
                          <button
                            type="button"
                            disabled={
                              loading ||
                              !cashToRemove ||
                              cashOutReason.trim().length < 2
                            }
                            onClick={() => void removeCash()}
                            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-700 text-xs font-black text-white disabled:opacity-50"
                          >
                            <FontAwesomeIcon icon={faMoneyBillTransfer} />{" "}
                            Remove cash
                          </button>
                        </section>
                      </div>

                      <PosCashDrawerLedger shift={shift} />

                      <section className="rounded-2xl border border-red-200 bg-red-50/70 p-4">
                        <div className="flex items-start gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#C8102E] text-white">
                            <FontAwesomeIcon icon={faDoorOpen} />
                          </span>
                          <div>
                            <h3 className="text-sm font-black text-red-950">
                              Close register
                            </h3>
                            <p className="mt-1 text-xs text-red-800">
                              Count physical cash. The ledger above is
                              permanently retained after closure.
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="text-xs font-black text-[#756960]">
                            Physically counted cash
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={countedCash}
                              onChange={(event) =>
                                setCountedCash(event.currentTarget.value)
                              }
                              className="mt-1 h-11 w-full rounded-xl border border-red-200 bg-white px-3 text-sm"
                              placeholder={String(
                                Math.round(shift.expectedCash ?? 0),
                              )}
                            />
                          </label>
                          <label className="text-xs font-black text-[#756960]">
                            Closing note
                            <input
                              value={closingNote}
                              onChange={(event) =>
                                setClosingNote(event.currentTarget.value)
                              }
                              maxLength={1000}
                              className="mt-1 h-11 w-full rounded-xl border border-red-200 bg-white px-3 text-sm"
                              placeholder="Optional note"
                            />
                          </label>
                        </div>
                        <label className="mt-3 block text-xs font-black text-[#756960]">
                          Manager approval note
                          <input
                            value={closeApprovalNote}
                            onChange={(event) =>
                              setCloseApprovalNote(event.currentTarget.value)
                            }
                            maxLength={500}
                            className="mt-1 h-11 w-full rounded-xl border border-red-200 bg-white px-3 text-sm"
                            placeholder="Optional reconciliation/approval note"
                          />
                        </label>
                        {countedCash !== "" ? (
                          <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-red-900">
                            Expected {money.format(shift.expectedCash ?? 0)} ·
                            Counted {money.format(Number(countedCash || 0))} ·
                            Difference{" "}
                            {money.format(
                              Number(countedCash || 0) -
                                Number(shift.expectedCash ?? 0),
                            )}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          disabled={loading || countedCash === ""}
                          onClick={() => void closeShift()}
                          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#C8102E] text-sm font-black text-white disabled:opacity-50"
                        >
                          <FontAwesomeIcon icon={faDoorOpen} /> Close and
                          reconcile register
                        </button>
                      </section>
                    </>
                  ) : (
                    <>
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
                        No open POS shift was found. You can still review
                        today&apos;s closed cash ledgers below.
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
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
                          step="1"
                          value={openingCash}
                          onChange={(event) =>
                            setOpeningCash(event.currentTarget.value)
                          }
                          className="h-11 rounded-xl border border-[#e5d9cf] px-3 text-sm"
                          placeholder="Opening cash"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={loading || !registerId}
                        onClick={() => void openShift()}
                        className="h-12 w-full rounded-xl bg-[#111820] text-sm font-black text-white disabled:opacity-50"
                      >
                        Open register shift
                      </button>
                    </>
                  )}

                  <a
                    href="/admin/pos/cash-registers"
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#173044] bg-white text-sm font-black text-[#173044] transition hover:bg-[#173044] hover:text-white"
                  >
                    <FontAwesomeIcon icon={faClockRotateLeft} /> View full cash
                    register history
                  </a>

                  {closedToday.length ? (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon
                          icon={faClockRotateLeft}
                          className="text-[#C8102E]"
                        />
                        <h3 className="text-base font-black text-[#122b3c]">
                          Today&apos;s closed registers
                        </h3>
                      </div>
                      {closedToday.map((closedShift) => (
                        <PosCashDrawerLedger
                          key={closedShift._id}
                          shift={closedShift}
                          compact
                        />
                      ))}
                    </section>
                  ) : null}

                  {message ? (
                    <p className="rounded-xl bg-[#f3ece5] px-3 py-2 text-center text-xs font-bold text-[#6d625a]">
                      {message}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="h-11 w-full rounded-xl border border-[#d9ccc2] bg-white text-sm font-black text-[#122b3c] sm:hidden"
                  >
                    Close drawer controls
                  </button>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
