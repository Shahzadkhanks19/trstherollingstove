import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBagShopping,
  faCircleExclamation,
  faCreditCard,
  faEnvelope,
  faLock,
  faPhone,
  faUser,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";

import {
  formatClock,
  formatTime,
  type PublicOrderingSettings,
} from "@/lib/checkout/timeSlots";
import type { OrderMode } from "@/components/checkout/checkout-utils";

type CheckoutFormProps = {
  settings: PublicOrderingSettings;
  accepting: boolean;
  orderMode: OrderMode;
  setOrderMode: (value: OrderMode) => void;
  customer: { name: string; phone: string; email: string };
  setCustomer: (value: { name: string; phone: string; email: string }) => void;
  slots: Date[];
  selectedSlot: string;
  setSelectedSlot: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  confirmed: boolean;
  setConfirmed: (value: boolean) => void;
  message: string;
};

export function CheckoutForm({
  settings,
  accepting,
  orderMode,
  setOrderMode,
  customer,
  setCustomer,
  slots,
  selectedSlot,
  setSelectedSlot,
  note,
  setNote,
  confirmed,
  setConfirmed,
  message,
}: CheckoutFormProps) {
  return (
    <div className="rounded-3xl border border-[#E9E1D9] bg-white p-5 shadow-[0_18px_50px_rgba(54,35,20,.07)] sm:p-7">
      <div className="flex items-center justify-between border-b border-[#EEE5DC] pb-6">
        <div>
          <h1 className="text-3xl font-black uppercase">Checkout</h1>
          <p className="mt-2 flex items-center gap-2 text-[10px] text-[#6B625B]">
            <FontAwesomeIcon icon={faLock} className="h-3 text-green-700" />
            Secure online checkout powered by Razorpay.
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-2 text-[8px] font-black uppercase ${accepting ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}
        >
          {settings.storeStatus.replaceAll("_", " ")}
        </span>
      </div>

      <h2 className="mt-7 text-sm font-black uppercase">1. Order Type</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(
          [
            [
              "takeaway",
              faBagShopping,
              "Takeaway / Pickup",
              "Collect your freshly prepared order.",
            ],
            [
              "dine_in",
              faUtensils,
              "Prebook for Dine-In",
              "Order ahead, arrive at your selected time and skip preparation waiting.",
            ],
          ] as const
        ).map(([mode, icon, title, text]) => (
          <button
            key={mode}
            type="button"
            onClick={() => setOrderMode(mode)}
            className={`flex min-h-24 items-center gap-4 rounded-2xl border p-4 text-left ${orderMode === mode ? "border-[#E3172F] bg-[#FFF8F7]" : "border-[#DED7D0]"}`}
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#FFF0EE] text-[#E3172F]">
              <FontAwesomeIcon icon={icon} className="h-5" />
            </span>
            <span>
              <strong className="block text-xs font-black uppercase">{title}</strong>
              <span className="mt-1 block text-[9px] text-[#655E57]">{text}</span>
            </span>
          </button>
        ))}
      </div>

      <h2 className="mt-8 text-sm font-black uppercase">2. Contact Details</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="relative">
          <FontAwesomeIcon
            icon={faUser}
            className="absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#8C837C]"
          />
          <input
            value={customer.name}
            onChange={(event) =>
              setCustomer({ ...customer, name: event.target.value })
            }
            placeholder="Full name"
            className="h-14 w-full rounded-xl border border-[#DDD5CE] pl-11 pr-4 text-xs outline-none focus:border-[#E3172F]"
          />
        </label>
        <label className="relative">
          <FontAwesomeIcon
            icon={faPhone}
            className="absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#8C837C]"
          />
          <input
            value={customer.phone}
            onChange={(event) =>
              setCustomer({ ...customer, phone: event.target.value })
            }
            placeholder="Mobile number"
            className="h-14 w-full rounded-xl border border-[#DDD5CE] pl-11 pr-4 text-xs outline-none focus:border-[#E3172F]"
          />
        </label>
        <label className="relative sm:col-span-2">
          <FontAwesomeIcon
            icon={faEnvelope}
            className="absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#8C837C]"
          />
          <input
            type="email"
            value={customer.email}
            onChange={(event) =>
              setCustomer({ ...customer, email: event.target.value })
            }
            placeholder="Email address (optional)"
            className="h-14 w-full rounded-xl border border-[#DDD5CE] pl-11 pr-4 text-xs outline-none focus:border-[#E3172F]"
          />
        </label>
      </div>

      <h2 className="mt-8 text-sm font-black uppercase">3. Same-Day Order Time</h2>
      <div className="mt-4 rounded-2xl border border-[#F0C77E] bg-[#FFF9EE] p-4 text-[9px] leading-5 text-[#6B5E4F]">
        <strong className="block text-[10px] text-[#172536]">
          Usually ready in {settings.preparationTimeMinutes} minutes
        </strong>
        Orders are available today only during working hours:{" "}
        {formatClock(settings.openingTime)}–{formatClock(settings.closingTime)}.
        Past slots are hidden. Multiple customers can choose the same time.
        {settings.storeStatus === "busy" && (
          <p className="mt-2 font-bold text-[#9A5E00]">{settings.delayMessage}</p>
        )}
      </div>
      <select
        value={selectedSlot}
        onChange={(event) => setSelectedSlot(event.target.value)}
        disabled={!accepting}
        className="mt-4 h-14 w-full rounded-xl border border-[#DDD5CE] bg-white px-4 text-xs font-bold outline-none disabled:bg-[#F1EEEB]"
      >
        <option value="">
          {slots.length ? "Select a time today" : "No same-day slots available"}
        </option>
        {slots.map((slot) => (
          <option key={slot.toISOString()} value={slot.toISOString()}>
            {formatTime(slot)}
          </option>
        ))}
      </select>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value.slice(0, 200))}
        rows={3}
        placeholder="Special instructions: no onion, less spicy, extra crispy..."
        className="mt-4 w-full resize-none rounded-xl border border-[#DDD5CE] p-4 text-xs outline-none focus:border-[#E3172F]"
      />

      <h2 className="mt-8 text-sm font-black uppercase">4. Payment</h2>
      <div className="mt-4 rounded-2xl border border-[#E3172F] bg-[#FFF8F7] p-5">
        <div className="flex gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#E3172F] text-white">
            <FontAwesomeIcon icon={faCreditCard} className="h-5" />
          </span>
          <div>
            <strong className="text-xs font-black uppercase">
              Secure online payment only
            </strong>
            <p className="mt-2 text-[9px] leading-4 text-[#675D56]">
              Razorpay provides UPI, cards, net banking and wallets. Food
              preparation starts only after successful payment verification.
            </p>
          </div>
        </div>
      </div>
      <label className="mt-4 flex items-start gap-3 rounded-xl border border-[#E5DDD5] p-4">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-0.5 accent-[#E3172F]"
        />
        <span className="text-[9px] leading-4">
          I confirm I will collect the order or arrive for dine-in at the
          selected time. This is an order prebooking, not a table reservation.
        </span>
      </label>
      {message && (
        <div className="mt-5 flex gap-3 rounded-xl border border-[#F0C0C5] bg-[#FFF3F4] p-4 text-[10px] text-[#A30E20]">
          <FontAwesomeIcon
            icon={faCircleExclamation}
            className="mt-0.5 h-4"
          />
          {message}
        </div>
      )}
    </div>
  );
}
