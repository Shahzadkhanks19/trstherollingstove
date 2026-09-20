"use client";

import { useState } from "react";
import type { PosRunningOrderView, PosTableView } from "@/types/pos-operations";

export type OperationDialog =
  | "transfer"
  | "merge"
  | "split"
  | "void"
  | "cancel-order"
  | "settle"
  | "create-table"
  | null;

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function PosOperationsModal({
  type,
  selected,
  tables,
  orders,
  onClose,
  onTransfer,
  onMerge,
  onSplit,
  onVoid,
  onCancelOrder,
  onSettle,
  onCreateTable,
}: {
  type: OperationDialog;
  selected: PosRunningOrderView | null;
  tables: PosTableView[];
  orders: PosRunningOrderView[];
  onClose: () => void;
  onTransfer: (tableId: string) => Promise<void>;
  onMerge: (sourceId: string) => Promise<void>;
  onSplit: (raw: string) => Promise<void>;
  onVoid: (lineId: string, quantity: number, reason: string) => Promise<void>;
  onCancelOrder: (reason: string) => Promise<void>;
  onSettle: (input: {
    paymentMethod: "cash" | "upi" | "split";
    paymentBreakdown: Array<{
      method: "cash" | "upi";
      amount: number;
      reference: string;
    }>;
    amountTendered: number;
    upiReference: string;
    tipAmount: number;
    tipMethod: "none" | "cash" | "upi";
    tipCollection: "none" | "waiter_direct" | "restaurant";
    orderTakerName: string;
  }) => Promise<void>;
  onCreateTable: (input: {
    name: string;
    code: string;
    section: string;
    capacity: number;
  }) => Promise<void>;
}) {
  const [choice, setChoice] = useState("");
  const [text, setText] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<"cash" | "upi" | "split">("cash");
  const [amount, setAmount] = useState(selected?.totals.grandTotal ?? 0);
  const [splitCash, setSplitCash] = useState("");
  const [splitUpi, setSplitUpi] = useState("");
  const [reference, setReference] = useState("");
  const [tipAmount, setTipAmount] = useState(0);
  const [tipMethod, setTipMethod] = useState<"none" | "cash" | "upi">("none");
  const [tipCollection, setTipCollection] = useState<
    "none" | "waiter_direct" | "restaurant"
  >("none");
  const [orderTakerName, setOrderTakerName] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [section, setSection] = useState("Main");
  const [capacity, setCapacity] = useState(4);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!type) return null;
  const title =
    type === "transfer"
      ? "Move running order"
      : type === "merge"
        ? "Merge running orders"
        : type === "split"
          ? "Split running order"
          : type === "void"
            ? "Void order item"
            : type === "cancel-order"
              ? "Cancel running order"
              : type === "settle"
                ? "Settle and print invoice"
                : "Add POS table";
  async function submit() {
    setBusy(true);
    setError("");
    try {
      if (type === "transfer") await onTransfer(choice);
      if (type === "merge") await onMerge(choice);
      if (type === "split") await onSplit(text);
      if (type === "void") {
        if (!text.trim()) throw new Error("Enter the manager reason.");
        await onVoid(choice, quantity, text.trim());
      }
      if (type === "cancel-order") {
        if (text.trim().length < 3)
          throw new Error("Enter a cancellation reason.");
        await onCancelOrder(text.trim());
      }
      if (type === "settle") {
        if (tipAmount > 0 && tipMethod === "none")
          throw new Error("Select how the waiter tip was received.");
        if (tipAmount > 0 && tipCollection === "none")
          throw new Error("Select who currently holds the tip.");
        if (tipMethod === "upi" && tipCollection !== "restaurant")
          throw new Error("UPI tips are received by the restaurant.");
        if (tipAmount > 0 && !orderTakerName.trim())
          throw new Error("Enter the waiter or order taker name.");
        const totalDue =
          (selected?.totals.grandTotal ?? 0) +
          (tipCollection === "restaurant" ? tipAmount : 0);
        const splitCashAmount = Number(splitCash || 0);
        const splitUpiAmount = Number(splitUpi || 0);
        if (method === "split" && (splitCashAmount <= 0 || splitUpiAmount <= 0))
          throw new Error("Enter positive cash and UPI amounts.");
        if (
          method === "split" &&
          Math.abs(splitCashAmount + splitUpiAmount - totalDue) > 0.01
        )
          throw new Error(
            "Cash and UPI must exactly equal the restaurant collection amount.",
          );
        if (method === "cash" && amount < totalDue)
          throw new Error(
            "Cash received is less than the restaurant collection amount.",
          );
        if (tipMethod === "upi" && method === "cash")
          throw new Error(
            "Select UPI or split payment for an online waiter tip.",
          );
        await onSettle({
          paymentMethod: method,
          paymentBreakdown:
            method === "split"
              ? [
                  { method: "cash", amount: splitCashAmount, reference: "" },
                  { method: "upi", amount: splitUpiAmount, reference },
                ]
              : [],
          amountTendered:
            method === "cash"
              ? amount
              : method === "split"
                ? splitCashAmount
                : totalDue,
          upiReference: reference,
          tipAmount,
          tipMethod,
          tipCollection,
          orderTakerName: orderTakerName.trim(),
        });
      }
      if (type === "create-table") {
        if (name.trim().length < 1 || code.trim().length < 1)
          throw new Error("Table name and code are required.");
        await onCreateTable({
          name: name.trim(),
          code: code.trim(),
          section: section.trim() || "Main",
          capacity,
        });
      }
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }
  const available = tables.filter(
    (table) => table.status === "available" || table.status === "reserved",
  );
  const mergeOrders = orders.filter((order) => order.id !== selected?.id);
  return (
    <div className="fixed inset-0 z-[180] grid place-items-end bg-black/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-5">
      <button
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <section
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        <h2 className="text-xl font-black">{title}</h2>
        <div className="mt-4 space-y-3">
          {type === "transfer" && (
            <select
              value={choice}
              onChange={(e) => setChoice(e.currentTarget.value)}
              className="h-11 w-full rounded-xl border px-3"
            >
              <option value="">Select table</option>
              {available.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name}
                </option>
              ))}
            </select>
          )}
          {type === "merge" && (
            <select
              value={choice}
              onChange={(e) => setChoice(e.currentTarget.value)}
              className="h-11 w-full rounded-xl border px-3"
            >
              <option value="">Select order</option>
              {mergeOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.ticketNumber} · {order.tableName || "Takeaway"}
                </option>
              ))}
            </select>
          )}
          {type === "split" && (
            <>
              <p className="text-xs text-slate-500">
                Use line:quantity pairs, for example 1:1,2:2.
              </p>
              <input
                value={text}
                onChange={(e) => setText(e.currentTarget.value)}
                className="h-11 w-full rounded-xl border px-3"
                placeholder="1:1"
              />
            </>
          )}
          {type === "void" && (
            <>
              <select
                value={choice}
                onChange={(e) => setChoice(e.currentTarget.value)}
                className="h-11 w-full rounded-xl border px-3"
              >
                <option value="">Select item</option>
                {selected?.cart.lines.map((line) => (
                  <option key={line.lineId} value={line.lineId}>
                    {line.name} ×{line.quantity}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, Number(e.currentTarget.value) || 1))
                }
                className="h-11 w-full rounded-xl border px-3"
              />
              <textarea
                value={text}
                onChange={(e) => setText(e.currentTarget.value)}
                className="w-full rounded-xl border p-3"
                placeholder="Manager reason"
              />{" "}
            </>
          )}
          {type === "cancel-order" && (
            <>
              <p className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-800">
                This cancels the entire running order, cancels its kitchen
                ticket, and releases the table. A reason is mandatory.
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.currentTarget.value)}
                className="min-h-28 w-full rounded-xl border border-red-200 p-3"
                placeholder="Cancellation reason"
              />
            </>
          )}
          {type === "settle" && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMethod("cash");
                    setAmount(
                      (selected?.totals.grandTotal ?? 0) +
                        (tipCollection === "restaurant" ? tipAmount : 0),
                    );
                  }}
                  className={`h-11 rounded-xl border font-black ${method === "cash" ? "border-emerald-600 bg-emerald-50" : ""}`}
                >
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("upi")}
                  className={`h-11 rounded-xl border font-black ${method === "upi" ? "border-violet-600 bg-violet-50" : ""}`}
                >
                  UPI
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("split")}
                  className={`h-11 rounded-xl border font-black ${method === "split" ? "border-blue-600 bg-blue-50" : ""}`}
                >
                  Split
                </button>
              </div>
              {method === "cash" ? (
                <input
                  type="number"
                  min={selected?.totals.grandTotal ?? 0}
                  value={amount}
                  onChange={(e) =>
                    setAmount(Number(e.currentTarget.value) || 0)
                  }
                  className="h-11 w-full rounded-xl border px-3"
                  placeholder="Cash received"
                />
              ) : method === "upi" ? (
                <input
                  value={reference}
                  onChange={(e) => setReference(e.currentTarget.value)}
                  className="h-11 w-full rounded-xl border px-3"
                  placeholder="UPI reference (optional)"
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-black text-slate-700">
                    Cash part
                    <input
                      type="number"
                      min="0"
                      value={splitCash}
                      onChange={(e) => setSplitCash(e.currentTarget.value)}
                      className="mt-1 h-11 w-full rounded-xl border px-3"
                      placeholder="0"
                    />
                  </label>
                  <label className="text-xs font-black text-slate-700">
                    UPI / online part
                    <input
                      type="number"
                      min="0"
                      value={splitUpi}
                      onChange={(e) => setSplitUpi(e.currentTarget.value)}
                      className="mt-1 h-11 w-full rounded-xl border px-3"
                      placeholder="0"
                    />
                  </label>
                  <label className="text-xs font-black text-slate-700 sm:col-span-2">
                    UPI reference
                    <input
                      value={reference}
                      onChange={(e) => setReference(e.currentTarget.value)}
                      className="mt-1 h-11 w-full rounded-xl border px-3"
                      placeholder="Optional transaction reference"
                    />
                  </label>
                  <p className="text-xs font-bold text-slate-500 sm:col-span-2">
                    Cash + UPI must equal{" "}
                    {money.format(
                      (selected?.totals.grandTotal ?? 0) +
                        (tipCollection === "restaurant" ? tipAmount : 0),
                    )}
                    .
                  </p>
                </div>
              )}
              <div className="grid gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:grid-cols-2">
                <label className="text-xs font-black text-slate-700">
                  Order taker / waiter
                  <input
                    value={orderTakerName}
                    onChange={(e) => setOrderTakerName(e.currentTarget.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-amber-200 bg-white px-3"
                    placeholder="Waiter name"
                  />
                </label>
                <label className="text-xs font-black text-slate-700">
                  Tip amount
                  <input
                    type="number"
                    min="0"
                    value={tipAmount}
                    onChange={(e) =>
                      setTipAmount(
                        Math.max(0, Number(e.currentTarget.value) || 0),
                      )
                    }
                    className="mt-1 h-11 w-full rounded-xl border border-amber-200 bg-white px-3"
                  />
                </label>
                <label className="text-xs font-black text-slate-700 sm:col-span-2">
                  Tip received through
                  <select
                    value={tipMethod}
                    onChange={(e) => {
                      const value = e.currentTarget.value as
                        "none" | "cash" | "upi";
                      setTipMethod(value);
                      setTipCollection(
                        value === "upi"
                          ? "restaurant"
                          : value === "none"
                            ? "none"
                            : tipCollection,
                      );
                    }}
                    className="mt-1 h-11 w-full rounded-xl border border-amber-200 bg-white px-3"
                  >
                    <option value="none">No tip</option>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI — restaurant QR</option>
                  </select>
                </label>
                <label className="text-xs font-black text-slate-700 sm:col-span-2">
                  Who holds the tip now?
                  <select
                    value={tipCollection}
                    onChange={(e) =>
                      setTipCollection(
                        e.currentTarget.value as
                          "none" | "waiter_direct" | "restaurant",
                      )
                    }
                    disabled={tipMethod === "upi"}
                    className="mt-1 h-11 w-full rounded-xl border border-amber-200 bg-white px-3"
                  >
                    <option value="none">Select</option>
                    {tipMethod === "cash" && (
                      <option value="waiter_direct">
                        Waiter collected it directly
                      </option>
                    )}
                    <option value="restaurant">
                      Restaurant collected it — payable later
                    </option>
                  </select>
                </label>
                {tipAmount > 0 && (
                  <p className="text-xs font-bold text-amber-900 sm:col-span-2">
                    {tipCollection === "restaurant"
                      ? `Restaurant will receive ${money.format((selected?.totals.grandTotal ?? 0) + tipAmount)}. ${money.format(tipAmount)} is payable to ${orderTakerName.trim() || "the waiter"}.`
                      : `Cash tip is held directly by ${orderTakerName.trim() || "the waiter"} and is not added to the restaurant collection.`}
                  </p>
                )}
              </div>
            </>
          )}
          {type === "create-table" && (
            <>
              <input
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                className="h-11 w-full rounded-xl border px-3"
                placeholder="Table name"
              />
              <input
                value={code}
                onChange={(e) =>
                  setCode(
                    e.currentTarget.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9_-]/g, ""),
                  )
                }
                className="h-11 w-full rounded-xl border px-3"
                placeholder="Unique code"
              />
              <input
                value={section}
                onChange={(e) => setSection(e.currentTarget.value)}
                className="h-11 w-full rounded-xl border px-3"
                placeholder="Section"
              />
              <input
                type="number"
                min={1}
                max={50}
                value={capacity}
                onChange={(e) =>
                  setCapacity(Math.max(1, Number(e.currentTarget.value) || 1))
                }
                className="h-11 w-full rounded-xl border px-3"
              />
            </>
          )}
          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              {error}
            </p>
          )}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="h-11 rounded-xl border font-black"
          >
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={() => void submit()}
            className="h-11 rounded-xl bg-slate-950 font-black text-white disabled:opacity-50"
          >
            {busy ? "Please wait…" : "Confirm"}
          </button>
        </div>
      </section>
    </div>
  );
}
