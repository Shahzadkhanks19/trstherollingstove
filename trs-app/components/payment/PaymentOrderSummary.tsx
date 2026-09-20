import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faUtensils } from "@fortawesome/free-solid-svg-icons";

export type PaymentStatusData = {
  order: {
    id: string;
    orderNumber: string;
    items: Array<{
      _id?: string;
      name: string;
      quantity: number;
      lineTotal: number;
    }>;
    itemCount: number;
    subtotal: number;
    taxTotal: number;
    couponDiscount: number;
    coinDiscount: number;
    discountTotal: number;
    grandTotal: number;
    orderMode: "dine_in" | "takeaway";
    requestedPickupAt?: string | null;
    estimatedReadyAt?: string | null;
    status: string;
    paymentStatus: "pending" | "paid" | "failed" | "refunded";
    customerSnapshot: { name: string; phone?: string; email?: string };
  };
  payment: null | {
    status: string;
    providerOrderId: string;
    providerPaymentId?: string;
    amount: number;
    currency: string;
    failureDescription?: string;
  };
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTime(value?: string | null) {
  if (!value) return "As soon as possible";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function PaymentOrderSummary({
  statusData,
}: {
  statusData: PaymentStatusData | null;
}) {
  return (
    <aside className="rounded-[28px] border border-[#EADFCC] bg-white p-6 shadow-[0_22px_60px_rgba(88,56,19,0.12)] sm:p-7">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#B37A12]">
        Order Summary
      </p>
      <h2 className="mt-2 text-2xl font-black uppercase text-[#171717]">
        {statusData?.order.orderNumber ?? "Pending Order"}
      </h2>
      <div className="mt-5 h-px w-full bg-gradient-to-r from-[#C99A2E] via-[#E7C980] to-transparent" />

      <div className="mt-6 space-y-4 border-y border-[#EEE5D8] py-5">
        {statusData?.order.items.slice(0, 4).map((item, index) => (
          <div
            key={item._id ?? `${item.name}-${index}`}
            className="flex justify-between gap-4 text-sm"
          >
            <span className="text-[#5F574D]">
              {item.quantity} × {item.name}
            </span>
            <strong>{money(item.lineTotal)}</strong>
          </div>
        )) ?? (
          <p className="text-sm text-[#756D63]">Loading order details…</p>
        )}
      </div>

      <div className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{money(statusData?.order.subtotal ?? 0)}</span>
        </div>
        <div className="flex justify-between">
          <span>Taxes</span>
          <span>{money(statusData?.order.taxTotal ?? 0)}</span>
        </div>
        {(statusData?.order.discountTotal ?? 0) > 0 && (
          <div className="flex justify-between text-green-700">
            <span>Discount</span>
            <span>-{money(statusData?.order.discountTotal ?? 0)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-[#EEE5D8] pt-4 text-lg font-black">
          <span>Total</span>
          <span className="text-[#B7192C]">
            {money(statusData?.order.grandTotal ?? 0)}
          </span>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[#F0E2BD] bg-[#FFF7E6] p-4">
        <p className="text-[10px] font-black uppercase tracking-wider text-[#8D6515]">
          <FontAwesomeIcon icon={faClock} className="mr-2" />
          Estimated Preparation
        </p>
        <p className="mt-2 text-lg font-black text-[#B7192C]">
          Ready around {formatTime(statusData?.order.estimatedReadyAt)}
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-[#F4DDDF] bg-[#FFF3F4] p-4 text-xs leading-6 text-[#625A50]">
        <FontAwesomeIcon icon={faUtensils} className="mr-2 text-[#B7192C]" />
        {statusData?.order.orderMode === "dine_in" ? "Dine-in" : "Pickup"} •{" "}
        {formatTime(statusData?.order.requestedPickupAt)}
      </div>

      <p className="mt-5 text-[11px] leading-5 text-[#756D63]">
        Your payment details are securely handled by Razorpay and are not stored
        by TRS.
      </p>
    </aside>
  );
}
