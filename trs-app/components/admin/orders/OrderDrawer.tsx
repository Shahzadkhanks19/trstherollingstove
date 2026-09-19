"use client";

import type React from "react";

import { useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faIndianRupeeSign, faPrint, faTimes, faUtensils, faWallet } from "@fortawesome/free-solid-svg-icons";
import { buildOrderInvoicePrintUrl } from "@/lib/pos/print-links";
import type { AdminOrder, AdminOrderStatus, AdminPaymentMethod, AdminPaymentStatus } from "@/types/adminOrders";
import { dateTime, money, nextStatuses, statusLabels, statusTone } from "@/components/admin/orders/admin-orders.api";
import { FilterSelect, OrdersSkeleton } from "@/components/admin/orders/AdminOrdersUi";

export function OrderDrawer({
  order,
  loading,
  canManage,
  canManagePayments,
  acting,
  actionError,
  onClose,
  onStatus,
  onPayment,
}: {
  order: AdminOrder | null;
  loading: boolean;
  canManage: boolean;
  canManagePayments: boolean;
  acting: boolean;
  actionError: string;
  onClose: () => void;
  onStatus: (status: AdminOrderStatus, note: string) => Promise<void>;
  onPayment: (
    status: AdminPaymentStatus,
    method: AdminPaymentMethod,
  ) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<AdminPaymentStatus>(
    order?.paymentStatus ?? "pending",
  );
  const [paymentMethod, setPaymentMethod] = useState<AdminPaymentMethod>(
    order?.paymentMethod ?? "cash",
  );

  return (
    <div
      className="fixed inset-0 z-[140] flex justify-end bg-[#07131d]/55 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Order details"
    >
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Close order details"
      />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 270 }}
        className="relative h-full w-full max-w-2xl overflow-y-auto bg-[#f7f1eb] shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e5d9d0] bg-[#fffdf9]/95 px-5 py-4 backdrop-blur-xl">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#C8102E]">
              Order details
            </p>
            <h2 className="mt-1 text-xl font-black text-[#173044]">
              {order?.orderNumber ?? "Loading…"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl border border-[#ded2c8] bg-white"
            aria-label="Close"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {loading || !order ? (
          <OrdersSkeleton compact />
        ) : (
          <div className="space-y-4 p-4 sm:p-5">
            {actionError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
                {actionError}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniCard
                label="Order total"
                value={money.format(order.grandTotal)}
                icon={faIndianRupeeSign}
              />
              <MiniCard
                label="Items"
                value={String(order.itemCount)}
                icon={faUtensils}
              />
              <MiniCard
                label="Payment"
                value={order.paymentStatus}
                icon={faWallet}
              />
            </div>

            <DetailSection title="Customer information">
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Name" value={order.customerSnapshot.name} />
                <Info
                  label="Phone"
                  value={order.customerSnapshot.phone || "—"}
                />
                <Info
                  label="Email"
                  value={order.customerSnapshot.email || "—"}
                />
                <Info
                  label="Order mode"
                  value={order.orderMode.replace("_", " ")}
                />
              </div>
              {order.tableNumber && (
                <p className="mt-3 text-xs font-semibold text-[#6d625a]">
                  Table: <b className="text-[#173044]">{order.tableNumber}</b>
                </p>
              )}
              {order.customerNote && (
                <div className="mt-3 rounded-xl bg-[#fff7ef] p-3 text-xs leading-5 text-[#6d625a]">
                  <b className="text-[#173044]">Customer note:</b>{" "}
                  {order.customerNote}
                </div>
              )}
            </DetailSection>

            <DetailSection title="Items and customisations">
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item._id}
                    className="rounded-2xl border border-[#eee4dc] bg-white p-4"
                  >
                    <div className="flex justify-between gap-4">
                      <div>
                        <b className="text-sm text-[#173044]">
                          {item.quantity} × {item.name}
                        </b>
                        {item.variantName && (
                          <p className="mt-1 text-[10px] font-bold text-[#8d8178]">
                            Variant: {item.variantName}
                          </p>
                        )}
                      </div>
                      <b className="text-sm text-[#C8102E]">
                        {money.format(item.lineTotal)}
                      </b>
                    </div>
                    {item.modifiers.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {item.modifiers.map((modifier, index) => (
                          <p
                            key={`${modifier.groupName}-${index}`}
                            className="text-[10px] font-semibold text-[#746961]"
                          >
                            {modifier.groupName}: {modifier.optionName} (+
                            {money.format(modifier.unitPrice)})
                          </p>
                        ))}
                      </div>
                    )}
                    {item.specialInstructions && (
                      <p className="mt-3 rounded-xl bg-[#fff7ef] p-3 text-[10px] font-semibold leading-5 text-[#746961]">
                        {item.specialInstructions}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </DetailSection>

            <DetailSection title="Pricing breakdown">
              <PriceRow label="Subtotal" value={order.subtotal} />
              <PriceRow label="Tax" value={order.taxTotal} />
              <PriceRow label="Coupon discount" value={-order.couponDiscount} />
              <PriceRow
                label="TRS Coins discount"
                value={-order.coinDiscount}
              />
              <PriceRow label="Total discount" value={-order.discountTotal} />
              <div className="mt-3 flex justify-between border-t border-[#eee4dc] pt-3 text-base font-black text-[#173044]">
                <span>Grand total</span>
                <span>{money.format(order.grandTotal)}</span>
              </div>
              {order.couponCode && (
                <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#C8102E]">
                  Coupon: {order.couponCode}
                </p>
              )}
            </DetailSection>

            {(order.tipAmount ?? 0) > 0 && (
              <DetailSection title="Internal waiter-tip accounting">
                <PriceRow
                  label="Restaurant sale after waiver"
                  value={Math.max(
                    0,
                    order.grandTotal - (order.waivedAmount ?? 0),
                  )}
                />
                {order.tipCollection === "restaurant" ? (
                  <>
                    <PriceRow
                      label={`${order.tipMethod === "upi" ? "UPI" : "Cash"} tip payable to ${order.orderTakerName || "waiter"}`}
                      value={order.tipAmount ?? 0}
                    />
                    <div className="mt-3 flex justify-between border-t border-violet-200 bg-violet-50 p-3 text-sm font-black text-violet-950">
                      <span>Total received by restaurant</span>
                      <span>
                        {money.format(
                          Math.max(
                            0,
                            order.grandTotal - (order.waivedAmount ?? 0),
                          ) + (order.tipAmount ?? 0),
                        )}
                      </span>
                    </div>
                    <p className="mt-2 text-[10px] font-bold text-violet-700">
                      The tip is a waiter payable and is excluded from
                      restaurant revenue and the customer invoice.
                    </p>
                  </>
                ) : (
                  <p className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
                    Cash tip {money.format(order.tipAmount ?? 0)} was collected
                    directly by {order.orderTakerName || "the waiter"}; it was
                    not received by the restaurant.
                  </p>
                )}
              </DetailSection>
            )}

            <DetailSection title="Order workflow">
              <div className="mb-4 flex flex-wrap gap-2">
                <StatusPill status={order.status} />
                <PaymentPill
                  status={order.paymentStatus}
                  method={order.paymentMethod}
                />
              </div>
              {canManage && nextStatuses[order.status].length > 0 && (
                <div className="space-y-3">
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={
                      nextStatuses[order.status].some(
                        (value) =>
                          value === "cancelled" || value === "rejected",
                      )
                        ? "Add a note or cancellation reason"
                        : "Optional status note"
                    }
                    maxLength={500}
                    className="min-h-24 w-full rounded-2xl border border-[#ded2c8] bg-white p-3 text-xs font-semibold outline-none focus:border-[#C8102E]"
                  />
                  <div className="flex flex-wrap gap-2">
                    {nextStatuses[order.status].map((next) => (
                      <button
                        key={next}
                        disabled={
                          acting ||
                          ((next === "cancelled" || next === "rejected") &&
                            note.trim().length < 3)
                        }
                        onClick={() => void onStatus(next, note)}
                        className={`rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-40 ${next === "cancelled" || next === "rejected" ? "bg-red-600" : "bg-[#17384d]"}`}
                      >
                        {statusLabels[next]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </DetailSection>

            {canManagePayments && (
              <DetailSection title="Payment management">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FilterSelect
                    label="Payment status"
                    value={paymentStatus}
                    onChange={(value) =>
                      setPaymentStatus(value as AdminPaymentStatus)
                    }
                    options={["pending", "paid", "failed", "refunded"]}
                  />
                  <FilterSelect
                    label="Payment method"
                    value={paymentMethod}
                    onChange={(value) =>
                      setPaymentMethod(value as AdminPaymentMethod)
                    }
                    options={["cash", "upi", "card", "online"]}
                  />
                </div>
                <button
                  disabled={
                    acting ||
                    (paymentStatus === order.paymentStatus &&
                      paymentMethod === order.paymentMethod)
                  }
                  onClick={() => void onPayment(paymentStatus, paymentMethod)}
                  className="mt-3 rounded-xl bg-[#C8102E] px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-40"
                >
                  Save payment changes
                </button>
              </DetailSection>
            )}

            <DetailSection title="Timeline">
              <div className="space-y-4">
                {[...order.statusHistory].reverse().map((item, index) => (
                  <div
                    key={`${item.changedAt}-${index}`}
                    className="relative pl-6 before:absolute before:left-[5px] before:top-5 before:h-[calc(100%+4px)] before:w-px before:bg-[#ded2c8] last:before:hidden"
                  >
                    <span className="absolute left-0 top-1 h-3 w-3 rounded-full bg-[#C8102E] ring-4 ring-[#fff0e8]" />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <b className="text-xs text-[#173044]">
                        {statusLabels[item.status]}
                      </b>
                      <span className="text-[9px] font-bold text-[#92867d]">
                        {dateTime.format(new Date(item.changedAt))}
                      </span>
                    </div>
                    {item.note && (
                      <p className="mt-1 text-[10px] leading-5 text-[#746961]">
                        {item.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </DetailSection>

            <div className="flex flex-wrap gap-2 pb-4">
              <button
                type="button"
                onClick={() =>
                  window.open(
                    buildOrderInvoicePrintUrl(order._id),
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl bg-[#17384d] px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white"
              >
                <FontAwesomeIcon icon={faPrint} /> Print receipt
              </button>
            </div>
          </div>
        )}
      </motion.aside>
    </div>
  );
}

function StatusPill({ status }: { status: AdminOrderStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ring-1 ring-inset ${statusTone[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
function PaymentPill({
  status,
  method,
}: {
  status: AdminPaymentStatus;
  method: AdminPaymentMethod;
}) {
  const tone =
    status === "paid"
      ? "bg-emerald-50 text-emerald-700"
      : status === "failed"
        ? "bg-red-50 text-red-700"
        : status === "refunded"
          ? "bg-purple-50 text-purple-700"
          : "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${tone}`}
    >
      {status} · {method}
    </span>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-wider text-[#958980]">
        {label}
      </p>
      <p className="mt-1 break-words text-xs font-extrabold capitalize text-[#173044]">
        {value}
      </p>
    </div>
  );
}
function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-[#e8ddd3] bg-[#fffdf9] p-4 shadow-[0_8px_24px_rgba(30,35,40,.04)]">
      <h3 className="mb-4 text-sm font-black text-[#173044]">{title}</h3>
      {children}
    </section>
  );
}
function MiniCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof FontAwesomeIcon>["icon"];
}) {
  return (
    <div className="rounded-2xl border border-[#e8ddd3] bg-[#fffdf9] p-4">
      <FontAwesomeIcon icon={icon} className="h-4 text-[#C8102E]" />
      <p className="mt-3 text-[9px] font-black uppercase tracking-wider text-[#958980]">
        {label}
      </p>
      <p className="mt-1 text-sm font-black capitalize text-[#173044]">
        {value}
      </p>
    </div>
  );
}
function PriceRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between py-1.5 text-xs font-semibold text-[#6d625a]">
      <span>{label}</span>
      <span>{money.format(value)}</span>
    </div>
  );
}
