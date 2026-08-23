"use client";

import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCashRegister, faMoneyBillWave, faPrint, faQrcode, faReceipt, faXmark } from "@fortawesome/free-solid-svg-icons";

import { calculatePosCartTotals } from "@/lib/pos/cart";
import { posCartActions } from "@/lib/pos/cart-store";
import type { PosCartState } from "@/types/pos";
import { CustomActionModal } from "@/components/admin/CustomActionModal";
import { DEFAULT_POS_PRINT_SETTINGS, readPosPrintSettings, type PosPrintSettings } from "@/lib/pos/print-settings";
import { queuePosSale } from "@/lib/pos/sale-offline-queue";

type ApiErrorDetail = { field?: string; path?: string; message?: string };
type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: ApiErrorDetail[];
};
type Register = { _id: string; name: string; code: string; isActive: boolean };
type Shift = { _id: string; expectedCash: number; registerId: Register };

type Props = {
  open: boolean;
  cart: PosCartState;
  onClose: () => void;
  onCompleted: (message: string) => void;
};

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const mongoObjectIdPattern = /^[a-f\d]{24}$/i;

function realObjectIdOrNull(value: string | null | undefined): string | null {
  return value && mongoObjectIdPattern.test(value) ? value : null;
}

function apiErrorMessage<T>(response: ApiResponse<T>, fallback: string): string {
  const details = response.errors
    ?.map((error) => {
      const field = error.field || error.path;
      return `${field ? `${field}: ` : ""}${error.message || "Invalid value."}`;
    })
    .filter(Boolean);

  return details?.length ? details.join(" · ") : response.message || fallback;
}

export function PosBillingModal({ open, cart, onClose, onCompleted }: Props) {
  const totals = useMemo(() => calculatePosCartTotals(cart), [cart]);
  const [shift, setShift] = useState<Shift | null>(null);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [registerId, setRegisterId] = useState("");
  const [openingCash, setOpeningCash] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "split">("cash");
  const [splitCash, setSplitCash] = useState("");
  const [splitUpi, setSplitUpi] = useState("");
  const [waivedAmount, setWaivedAmount] = useState("");
  const [waivedReason, setWaivedReason] = useState("");
  const [tipAmount, setTipAmount] = useState("");
  const [tipMethod, setTipMethod] = useState<"none" | "cash" | "upi">("none");
  const [orderTakerName, setOrderTakerName] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [upiReference, setUpiReference] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [lastInvoiceId, setLastInvoiceId] = useState("");
  const [upiConfirmOpen, setUpiConfirmOpen] = useState(false);
  const [printSettings, setPrintSettings] = useState<PosPrintSettings>(DEFAULT_POS_PRINT_SETTINGS);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPrintSettings(readPosPrintSettings());
      try {
        const [shiftResponse, registerResponse] = await Promise.all([
          fetch("/api/v1/pos/shifts/current?mine=true", { cache: "no-store", signal: controller.signal }),
          fetch("/api/v1/admin/pos/registers", { cache: "no-store", signal: controller.signal }),
        ]);
        const shiftJson = await shiftResponse.json() as ApiResponse<Shift | null>;
        const registerJson = await registerResponse.json() as ApiResponse<Register[]>;
        if (!shiftResponse.ok) throw new Error(shiftJson.message);
        if (!registerResponse.ok) throw new Error(registerJson.message);
        setShift(shiftJson.data);
        setRegisters(registerJson.data.filter((register) => register.isActive));
        if (!registerId && registerJson.data[0]?._id) setRegisterId(registerJson.data[0]._id);
        setCashReceived(String(totals.grandTotal));
      } catch (error) {
        if ((error as Error).name !== "AbortError") setMessage(error instanceof Error ? error.message : "Unable to load billing details.");
      }
    }, 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [open, registerId, totals.grandTotal]);

  if (!open) return null;

  async function openShift() {
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/v1/pos/shifts/open", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ registerId, openingCash: Number(openingCash || 0) }),
      });
      const json = await response.json() as ApiResponse<Shift>;
      if (!response.ok) throw new Error(apiErrorMessage(json, "Unable to open shift."));
      setShift(json.data);
      setMessage("Register shift opened.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to open shift."); }
    finally { setLoading(false); }
  }

  async function completeSale() {
    if (!shift) return;
    const isInternalOrder = cart.internalConsumption.saleType !== "customer";
    const waiver = isInternalOrder ? 0 : Number(waivedAmount || 0);
    const tip = isInternalOrder ? 0 : Number(tipAmount || 0);
    const saleDue = Math.max(0, totals.grandTotal - waiver);
    const onlineTip = tipMethod === "upi" ? tip : 0;
    const payable = saleDue + onlineTip;
    const received = paymentMethod === "cash" ? Number(cashReceived) : payable;
    if (waiver > 0 && waivedReason.trim().length < 3) { setMessage("Enter why the remaining balance is being waived."); return; }
    if (tip > 0 && tipMethod === "none") { setMessage("Select how the waiter tip was received."); return; }
    if (paymentMethod === "split" && Math.abs(Number(splitCash || 0) + Number(splitUpi || 0) - payable) > 0.01) { setMessage("Cash and UPI must exactly equal the restaurant collection amount, including only UPI tips."); return; }
    if (paymentMethod === "cash" && received < payable) {
      setMessage("Cash received is less than the restaurant collection amount.");
      return;
    }
    if ((paymentMethod === "upi" || (paymentMethod === "split" && Number(splitUpi || 0) > 0)) && !upiConfirmOpen) {
      setUpiConfirmOpen(true);
      return;
    }

    setUpiConfirmOpen(false);
    const clientOperationId = crypto.randomUUID();
    const salePayload = {
      clientOperationId, shiftId: shift._id, orderMode: cart.orderType, internalConsumption: cart.internalConsumption, tableNumber: tableNumber.trim(),
      customerId: cart.customer.isWalkIn ? null : cart.customer.id, customerName: cart.customer.name, customerPhone: cart.customer.phone, customerEmail: cart.customer.email, customerNote: cart.orderNote,
      paymentMethod: isInternalOrder ? "cash" : paymentMethod, upiReference: paymentMethod === "upi" ? upiReference : "",
      paymentBreakdown: paymentMethod === "split" ? [...(Number(splitCash || 0) > 0 ? [{ method: "cash", amount: Number(splitCash), reference: "" }] : []), ...(Number(splitUpi || 0) > 0 ? [{ method: "upi", amount: Number(splitUpi), reference: upiReference }] : [])] : [],
      waivedAmount: waiver, waivedReason, tipAmount: tip, tipMethod, tipCollection: tip > 0 ? (tipMethod === "upi" ? "restaurant" : "waiter_direct") : "none", orderTakerName, amountTendered: received,
      adjustments: isInternalOrder ? { discountType: "none", discountValue: 0, discountReason: "", packingCharge: 0, serviceCharge: 0, additionalCharge: 0, additionalChargeLabel: "Additional charge", taxRate: 0, taxMode: "exclusive" } : cart.adjustments,
      items: cart.lines.map((line) => ({ sourceType: line.source, itemId: line.itemId, variantId: realObjectIdOrNull(line.variantId), quantity: line.quantity, unitPrice: line.unitPrice, specialInstructions: line.note, modifiers: line.modifiers.map((modifier) => ({ groupId: modifier.groupId, groupName: modifier.groupName, optionId: modifier.optionId, optionName: modifier.optionName, quantity: modifier.quantity })) })),
    };
    const printWindow =
      printSettings.autoPrintKot || printSettings.autoPrintInvoice
        ? window.open("about:blank", "_blank")
        : null;
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/v1/pos/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(salePayload),

      });
      const json = await response.json() as ApiResponse<{ order: { orderNumber: string; changeDue: number }; invoice: { _id: string } }>;
      if (!response.ok) throw new Error(apiErrorMessage(json, "Unable to complete sale."));
      setLastInvoiceId(json.data.invoice._id);
      const kotParams = new URLSearchParams({
        paper: printSettings.kotPaper,
        copies: String(printSettings.kotCopies),
        customer: String(printSettings.showCustomerOnKot),
        prices: String(printSettings.showPricesOnKot),
      });
      const invoiceParams = new URLSearchParams({
        paper: printSettings.invoicePaper,
        copies: String(printSettings.invoiceCopies),
        taxBreakup: String(printSettings.showTaxBreakup),
        qr: String(printSettings.showInvoiceQr),
      });
      if (printWindow) {
        printWindow.opener = null;
        const invoicePrintUrl = `/api/v1/pos/bills/${json.data.invoice._id}/print?${invoiceParams.toString()}`;

        if (printSettings.autoPrintKot && printSettings.autoPrintInvoice) {
          kotParams.set("nextInvoice", "true");
          kotParams.set("invoicePaper", printSettings.invoicePaper);
          kotParams.set("invoiceCopies", String(printSettings.invoiceCopies));
          kotParams.set("invoiceTaxBreakup", String(printSettings.showTaxBreakup));
          kotParams.set("invoiceQr", String(printSettings.showInvoiceQr));
          printWindow.location.href = `/api/v1/pos/bills/${json.data.invoice._id}/kot?${kotParams.toString()}`;
        } else if (printSettings.autoPrintKot) {
          printWindow.location.href = `/api/v1/pos/bills/${json.data.invoice._id}/kot?${kotParams.toString()}`;
        } else {
          printWindow.location.href = invoicePrintUrl;
        }
      }
      posCartActions.clear();
      onCompleted(`${json.data.order.orderNumber} completed${paymentMethod === "cash" ? ` · Change ${money.format(json.data.order.changeDue)}` : ""}.`);
      setMessage(
        "Sale completed. Configured print jobs were opened in sequence.",
      );
    } catch (error) {
      printWindow?.close();
      const networkFailure = error instanceof TypeError || !navigator.onLine;
      if (networkFailure) {
        queuePosSale(clientOperationId, salePayload, error instanceof Error ? error.message : "Network unavailable");
        posCartActions.clear();
        onCompleted("Connection unavailable: sale saved securely on this device and will sync automatically. Print it from Bill History after sync.");
        onClose();
      } else {
        setMessage(error instanceof Error ? error.message : "Unable to complete sale.");
      }
    }
    finally { setLoading(false); }
  }

  return (
    <>
    <div className="fixed inset-0 z-[80] grid place-items-end bg-black/50 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-[#fffdf9] shadow-2xl sm:max-w-xl sm:rounded-[28px]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e8ddd3] bg-[#fffdf9] px-5 py-4">
          <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#C8102E]">{cart.internalConsumption.saleType === "customer" ? "Phase 3 billing" : "Internal consumption"}</p><h2 className="text-xl font-black text-[#122b3c]">{cart.internalConsumption.saleType === "customer" ? "Complete sale" : "Send order without payment"}</h2></div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-[#f3ece5]" aria-label="Close billing"><FontAwesomeIcon icon={faXmark} /></button>
        </div>

        <div className="space-y-5 p-5">
          {!shift ? (
            <section className="rounded-2xl border border-[#e5d9cf] bg-white p-4">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#111820] text-[#E8A53A]"><FontAwesomeIcon icon={faCashRegister} /></span><div><h3 className="font-black text-[#122b3c]">Open a register shift</h3><p className="text-xs text-[#7c7067]">A cashier shift is required before payment.</p></div></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <select value={registerId} onChange={(event) => setRegisterId(event.currentTarget.value)} className="h-11 rounded-xl border border-[#e5d9cf] bg-white px-3 text-sm font-bold"><option value="">Select register</option>{registers.map((register) => <option key={register._id} value={register._id}>{register.name} ({register.code})</option>)}</select>
                <input type="number" min="0" value={openingCash} onChange={(event) => setOpeningCash(event.currentTarget.value)} className="h-11 rounded-xl border border-[#e5d9cf] px-3" placeholder="Opening cash" />
              </div>
              <button type="button" disabled={loading || !registerId} onClick={() => void openShift()} className="mt-3 h-11 w-full rounded-xl bg-[#111820] text-sm font-black text-white disabled:opacity-50">Open shift</button>
            </section>
          ) : (
            <>
              <section className="rounded-2xl border border-[#e5d9cf] bg-white p-4">
                <div className="flex items-center justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#8b7e75]">Amount due</p><p className="text-3xl font-black text-[#C8102E]">{money.format(totals.grandTotal)}</p></div><div className="text-right text-xs font-bold text-[#7c7067]">{shift.registerId?.name ?? "Register"}<br />Today&apos;s cash drawer {money.format(shift.expectedCash ?? 0)}</div></div>
              </section>

              <section className="rounded-2xl border border-[#e5d9cf] bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-sm font-black text-[#122b3c]">Print workflow</p><p className="mt-1 text-xs leading-5 text-[#7c7067]">KOT and invoice open as separate print jobs using the formats selected in POS Setup.</p></div>
                  <a href="/admin/pos/setup#pos-print-settings" className="shrink-0 rounded-lg border border-[#e5d9cf] px-3 py-2 text-[10px] font-black text-[#C8102E]">Settings</a>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-[#6d625a]"><span>KOT: {printSettings.autoPrintKot ? `${printSettings.kotPaper} · ${printSettings.kotCopies} copy` : "Off"}</span><span>Invoice: {printSettings.autoPrintInvoice ? `${printSettings.invoicePaper.toUpperCase()} · ${printSettings.invoiceCopies} copy` : "Off"}</span></div>
              </section>

              {cart.orderType === "dine_in" && <label className="block text-xs font-black text-[#756960]">Table number (Optional)<input value={tableNumber} onChange={(event) => setTableNumber(event.currentTarget.value)} placeholder="e.g. T12 (Optional)" maxLength={30} className="mt-1 h-11 w-full rounded-xl border border-[#e5d9cf] px-3 text-sm" /></label>}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button type="button" onClick={() => setPaymentMethod("cash")} className={`rounded-2xl border p-4 text-left ${paymentMethod === "cash" ? "border-emerald-700 bg-emerald-50" : "border-[#e5d9cf] bg-white"}`}><FontAwesomeIcon icon={faMoneyBillWave} className="text-emerald-700" /><p className="mt-2 font-black">Cash</p><p className="text-xs text-[#7c7067]">Record received amount and change.</p></button>
                <button type="button" onClick={() => setPaymentMethod("upi")} className={`rounded-2xl border p-4 text-left ${paymentMethod === "upi" ? "border-violet-700 bg-violet-50" : "border-[#e5d9cf] bg-white"}`}><FontAwesomeIcon icon={faQrcode} className="text-violet-700" /><p className="mt-2 font-black">PhonePe QR / UPI</p><p className="text-xs text-[#7c7067]">Cashier manually confirms receipt.</p></button>
                <button type="button" onClick={() => setPaymentMethod("split")} className={`rounded-2xl border p-4 text-left ${paymentMethod === "split" ? "border-blue-700 bg-blue-50" : "border-[#e5d9cf] bg-white"}`}><FontAwesomeIcon icon={faCashRegister} className="text-blue-700" /><p className="mt-2 font-black">Split</p><p className="text-xs text-[#7c7067]">Cash + UPI.</p></button>
              </div>

              {paymentMethod === "cash" ? (
                <label className="block text-xs font-black text-[#756960]">Cash received<input type="number" min="0" value={cashReceived} onChange={(event) => setCashReceived(event.currentTarget.value)} className="mt-1 h-11 w-full rounded-xl border border-[#e5d9cf] px-3 text-sm" /></label>
              ) : paymentMethod === "upi" ? (
                <label className="block text-xs font-black text-[#756960]">UPI reference (optional)<input value={upiReference} onChange={(event) => setUpiReference(event.currentTarget.value)} maxLength={100} className="mt-1 h-11 w-full rounded-xl border border-[#e5d9cf] px-3 text-sm" /></label>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-black">Cash part<input type="number" min="0" value={splitCash} onChange={(e)=>setSplitCash(e.currentTarget.value)} className="mt-1 h-11 w-full rounded-xl border px-3" /></label><label className="text-xs font-black">UPI part<input type="number" min="0" value={splitUpi} onChange={(e)=>setSplitUpi(e.currentTarget.value)} className="mt-1 h-11 w-full rounded-xl border px-3" /></label></div>
              )}
              <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-black">Waived / spared amount<input type="number" min="0" value={waivedAmount} onChange={(e)=>setWaivedAmount(e.currentTarget.value)} className="mt-1 h-11 w-full rounded-xl border px-3" placeholder="e.g. 10" /></label><label className="text-xs font-black">Waiver reason<input value={waivedReason} onChange={(e)=>setWaivedReason(e.currentTarget.value)} className="mt-1 h-11 w-full rounded-xl border px-3" placeholder="No change available" /></label></div>
              <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-black">Order taker / waiter<input value={orderTakerName} onChange={(e)=>setOrderTakerName(e.currentTarget.value)} className="mt-1 h-11 w-full rounded-xl border px-3" placeholder="Name" /></label><div className="grid grid-cols-2 gap-2"><label className="text-xs font-black">Tip amount<input type="number" min="0" value={tipAmount} onChange={(e)=>setTipAmount(e.currentTarget.value)} className="mt-1 h-11 w-full rounded-xl border px-3" /></label><label className="text-xs font-black">Tip via<select value={tipMethod} onChange={(e)=>setTipMethod(e.currentTarget.value as "none"|"cash"|"upi")} className="mt-1 h-11 w-full rounded-xl border px-3"><option value="none">None</option><option value="cash">Cash</option><option value="upi">UPI</option></select></label></div></div>
              {Number(tipAmount || 0) > 0 && <div className={`rounded-xl border p-3 text-xs font-bold ${tipMethod === "upi" ? "border-violet-200 bg-violet-50 text-violet-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{tipMethod === "upi" ? <>Restaurant QR receives <b>{money.format(Math.max(0, totals.grandTotal - Number(waivedAmount || 0)) + Number(tipAmount || 0))}</b>. Of this, <b>{money.format(Number(tipAmount || 0))}</b> is payable to {orderTakerName.trim() || "the waiter"} and is not restaurant revenue.</> : <>Cash tip is collected directly by {orderTakerName.trim() || "the waiter"}. It is not added to the restaurant payment or cash drawer.</>}</div>}

              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-700 text-white"><FontAwesomeIcon icon={faReceipt} /></span>
                  <div><h3 className="font-black text-emerald-950">Complete sale and print</h3><p className="text-xs text-emerald-800">KOT and invoice are opened as independent print jobs so kitchen and billing printers can be selected separately.</p></div>
                </div>
              </section>

              <button type="button" disabled={loading || cart.lines.length === 0} onClick={() => void completeSale()} className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#C8102E] text-sm font-black text-white shadow-lg disabled:opacity-50"><FontAwesomeIcon icon={faPrint} /> Complete sale & open print jobs</button>
              {lastInvoiceId && <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => window.open(`/api/v1/pos/bills/${lastInvoiceId}/print?paper=${printSettings.invoicePaper}&copies=${printSettings.invoiceCopies}&taxBreakup=${printSettings.showTaxBreakup}&qr=${printSettings.showInvoiceQr}`, "_blank", "noopener,noreferrer")} className="h-11 rounded-xl border border-[#e5d9cf] bg-white text-xs font-black">Reprint invoice</button><button type="button" onClick={() => window.open(`/api/v1/pos/bills/${lastInvoiceId}/kot?paper=${printSettings.kotPaper}&copies=${printSettings.kotCopies}&customer=${printSettings.showCustomerOnKot}&prices=${printSettings.showPricesOnKot}`, "_blank", "noopener,noreferrer")} className="h-11 rounded-xl border border-[#e5d9cf] bg-white text-xs font-black">Reprint kitchen KOT</button></div>}
            </>
          )}
          {message && <p className="rounded-xl bg-[#f3ece5] px-3 py-2 text-center text-xs font-bold text-[#6d625a]">{message}</p>}
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
