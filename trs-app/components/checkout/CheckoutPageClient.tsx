"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faBagShopping,
  faCheck,
  faCircleExclamation,
  faClock,
  faCoins,
  faCreditCard,
  faEnvelope,
  faLock,
  faPen,
  faPhone,
  faShieldHalved,
  faTag,
  faUser,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCurrentCustomer } from "@/lib/cart-client";
import {
  DEFAULT_PUBLIC_ORDERING_SETTINGS,
  formatClock,
  formatTime,
  generateSameDayOrderSlots,
  type PublicOrderingSettings,
} from "@/lib/checkout/timeSlots";
import { MediaPlaceholder } from "@/components/site/MediaPlaceholder";

type ApiEnvelope<T> = { success: boolean; message: string; data: T };
type OrderMode = "takeaway" | "dine_in";

type CheckoutItem = {
  id: string;
  name: string;
  imageUrl?: string;
  variant: string;
  modifiers: string[];
  quantity: number;
  unitPrice: number;
  isCombo: boolean;
  isDiscountedItem: boolean;
};

type CartData = {
  items: Array<{
    _id?: string;
    name: string;
    imageUrl?: string;
    variantName?: string;
    modifiers?: Array<{ optionName?: string }>;
    quantity: number;
    lineUnitPrice: number;
    isCombo?: boolean;
    isDiscountedItem?: boolean;
  }>;
  taxTotal: number;
};

type CheckoutOrder = {
  _id?: string;
  id?: string;
  orderNumber: string;
};


function money(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function normaliseCart(cart: CartData | null): CheckoutItem[] {
  if (!cart?.items.length) return [];
  return cart.items.map((item, index) => ({
    id: item._id ?? `cart-${index}`,
    name: item.name,
    imageUrl: item.imageUrl,
    variant: item.variantName || "Regular",
    modifiers:
      item.modifiers
        ?.map((modifier) => modifier.optionName)
        .filter((value): value is string => Boolean(value)) ?? [],
    quantity: item.quantity,
    unitPrice: item.lineUnitPrice,
    isCombo: item.isCombo ?? false,
    isDiscountedItem: item.isDiscountedItem ?? false,
  }));
}

export function CheckoutPageClient() {
  const [settings, setSettings] = useState<PublicOrderingSettings>(
    DEFAULT_PUBLIC_ORDERING_SETTINGS,
  );
  const [cart, setCart] = useState<CartData | null>(null);
  const [orderMode, setOrderMode] = useState<OrderMode>("takeaway");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "" });
  const [note, setNote] = useState("");
  const [coupon, setCoupon] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [coins, setCoins] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const authenticated = await getCurrentCustomer();
      if (!authenticated) {
        window.location.assign("/login?returnTo=%2Fcheckout");
        return;
      }
      const [settingsResponse, cartResponse] = await Promise.allSettled([
        fetch("/api/v1/settings/public", { cache: "no-store" }),
        fetch("/api/v1/customer/cart", { cache: "no-store" }),
      ]);

      if (settingsResponse.status === "fulfilled" && settingsResponse.value.ok) {
        const body = (await settingsResponse.value.json()) as ApiEnvelope<{
          ordering?: Partial<PublicOrderingSettings>;
        }>;
        setSettings({
          ...DEFAULT_PUBLIC_ORDERING_SETTINGS,
          ...(body.data.ordering ?? {}),
        });
      }

      if (cartResponse.status === "fulfilled" && cartResponse.value.ok) {
        const body = (await cartResponse.value.json()) as ApiEnvelope<CartData>;
        setCart(body.data);
      }
    }
    void load();
  }, []);

  const slots = useMemo(() => generateSameDayOrderSlots(settings), [settings]);
  const items = useMemo(() => normaliseCart(cart), [cart]);
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const hasNonStackableDiscount = items.some((item) => item.isCombo || item.isDiscountedItem);
  const tax = cart?.taxTotal ?? 0;
  const packaging = 0;
  const applicableCouponDiscount = hasNonStackableDiscount ? 0 : couponDiscount;
  const requestedCoins = hasNonStackableDiscount ? 0 : coins;
  const coinDiscount = Math.min(
    requestedCoins,
    Math.floor(subtotal * 0.5),
    150,
  );
  const total = Math.max(
    subtotal + tax + packaging - applicableCouponDiscount - coinDiscount,
    0,
  );
  const loyaltyEligibleAmount = Math.max(
    0,
    subtotal - applicableCouponDiscount,
  );
  const coinsEarned = Math.floor(loyaltyEligibleAmount / 100) * 5;
  const accepting =
    settings.orderingEnabled &&
    settings.acceptingOrders &&
    settings.storeStatus !== "closed" &&
    settings.storeStatus !== "not_accepting_orders" &&
    slots.length > 0;

  const applyCoupon = async () => {
    if (hasNonStackableDiscount) {
      setCoupon("");
      setCouponDiscount(0);
      setMessage("Coupons and TRS Coin redemption are not available when the cart contains a combo or discounted menu item.");
      return;
    }

    const code = coupon.trim();
    if (!code) {
      setCouponDiscount(0);
      setMessage("Enter a coupon code.");
      return;
    }

    try {
      const response = await fetch("/api/v1/customer/rewards/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = (await response.json()) as ApiEnvelope<{
        discountAmount: number;
        freeItem?: { name: string } | null;
      }>;
      if (!response.ok) throw new Error(body.message);

      setCouponDiscount(body.data.discountAmount);
      setMessage(
        body.data.freeItem
          ? `${body.data.freeItem.name} is free with this coupon.`
          : `${code.toUpperCase()} applied. You saved ${money(body.data.discountAmount)}.`,
      );
    } catch (error) {
      setCouponDiscount(0);
      setMessage(error instanceof Error ? error.message : "Unable to apply coupon.");
    }
  };

  const startPayment = async () => {
    setMessage("");
    if (!accepting) {
      setMessage(settings.statusMessage || "TRS is not accepting orders now.");
      return;
    }
    if (!selectedSlot) {
      setMessage("Select a same-day order time.");
      return;
    }
    if (!customer.name.trim()) {
      setMessage("Enter your full name.");
      return;
    }
    const phone = customer.phone.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setMessage("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (!confirmed) {
      setMessage("Confirm that you will collect or consume the order at the selected time.");
      return;
    }
    if (!items.length) {
      setMessage("Your cart is empty. Add a real menu item before checkout.");
      return;
    }

    try {
      setLoading(true);
      const checkoutResponse = await fetch("/api/v1/customer/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderMode,
          tableNumber: "",
          requestedPickupAt: selectedSlot,
          customerNote: note,
          paymentMethod: "online",
          couponCode: hasNonStackableDiscount ? undefined : coupon.trim() || undefined,
          coinsToRedeem: hasNonStackableDiscount ? 0 : coinDiscount,
        }),
      });
      const checkoutBody = (await checkoutResponse.json()) as ApiEnvelope<CheckoutOrder>;
      if (!checkoutResponse.ok) throw new Error(checkoutBody.message);

      const applicationOrderId = checkoutBody.data.id ?? checkoutBody.data._id;
      if (!applicationOrderId) throw new Error("Order ID was not returned.");

      sessionStorage.setItem("trs.pendingPaymentOrderId", applicationOrderId);
      window.location.assign(`/payment?orderId=${encodeURIComponent(applicationOrderId)}`);
    } catch (error) {
      setLoading(false);
      setMessage(error instanceof Error ? error.message : "Unable to continue.");
    }
  };

  return (
    <>
      <main className="min-h-screen bg-[#FFFDF9] text-[#172536]">
        <div className="border-b border-[#222] bg-[#090909] text-white">
          <div className="mx-auto flex w-[min(100%-2rem,1180px)] justify-between gap-3 overflow-x-auto py-5">
            {["Cart", "Checkout", "Payment", "Success"].map((label, index) => (
              <div key={label} className="flex min-w-[115px] items-center gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-full border text-xs font-black ${index === 1 ? "border-[#E3172F] bg-[#E3172F]" : "border-[#555]"}`}>
                  {index === 0 ? <FontAwesomeIcon icon={faCheck} className="h-3" /> : index + 1}
                </span>
                <strong className={`text-[9px] font-black uppercase ${index === 1 ? "text-[#F22A3D]" : "text-white"}`}>{label}</strong>
              </div>
            ))}
          </div>
        </div>

        <section className="py-7 sm:py-10">
          <div className="mx-auto grid w-[min(100%-2rem,1180px)] gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
            <div className="rounded-3xl border border-[#E9E1D9] bg-white p-5 shadow-[0_18px_50px_rgba(54,35,20,.07)] sm:p-7">
              <div className="flex items-center justify-between border-b border-[#EEE5DC] pb-6">
                <div>
                  <h1 className="text-3xl font-black uppercase">Checkout</h1>
                  <p className="mt-2 flex items-center gap-2 text-[10px] text-[#6B625B]"><FontAwesomeIcon icon={faLock} className="h-3 text-green-700" />Secure online checkout powered by Razorpay.</p>
                </div>
                <span className={`rounded-full border px-3 py-2 text-[8px] font-black uppercase ${accepting ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                  {settings.storeStatus.replaceAll("_", " ")}
                </span>
              </div>

              <h2 className="mt-7 text-sm font-black uppercase">1. Order Type</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {([
                  ["takeaway", faBagShopping, "Takeaway / Pickup", "Collect your freshly prepared order."],
                  ["dine_in", faUtensils, "Prebook for Dine-In", "Order ahead, arrive at your selected time and skip preparation waiting."],
                ] as const).map(([mode, icon, title, text]) => (
                  <button key={mode} type="button" onClick={() => setOrderMode(mode)} className={`flex min-h-24 items-center gap-4 rounded-2xl border p-4 text-left ${orderMode === mode ? "border-[#E3172F] bg-[#FFF8F7]" : "border-[#DED7D0]"}`}>
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#FFF0EE] text-[#E3172F]"><FontAwesomeIcon icon={icon} className="h-5" /></span>
                    <span><strong className="block text-xs font-black uppercase">{title}</strong><span className="mt-1 block text-[9px] text-[#655E57]">{text}</span></span>
                  </button>
                ))}
              </div>

              <h2 className="mt-8 text-sm font-black uppercase">2. Contact Details</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="relative"><FontAwesomeIcon icon={faUser} className="absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#8C837C]" /><input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Full name" className="h-14 w-full rounded-xl border border-[#DDD5CE] pl-11 pr-4 text-xs outline-none focus:border-[#E3172F]" /></label>
                <label className="relative"><FontAwesomeIcon icon={faPhone} className="absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#8C837C]" /><input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="Mobile number" className="h-14 w-full rounded-xl border border-[#DDD5CE] pl-11 pr-4 text-xs outline-none focus:border-[#E3172F]" /></label>
                <label className="relative sm:col-span-2"><FontAwesomeIcon icon={faEnvelope} className="absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#8C837C]" /><input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="Email address (optional)" className="h-14 w-full rounded-xl border border-[#DDD5CE] pl-11 pr-4 text-xs outline-none focus:border-[#E3172F]" /></label>
              </div>

              <h2 className="mt-8 text-sm font-black uppercase">3. Same-Day Order Time</h2>
              <div className="mt-4 rounded-2xl border border-[#F0C77E] bg-[#FFF9EE] p-4 text-[9px] leading-5 text-[#6B5E4F]">
                <strong className="block text-[10px] text-[#172536]">Usually ready in {settings.preparationTimeMinutes} minutes</strong>
                Orders are available today only during working hours: {formatClock(settings.openingTime)}–{formatClock(settings.closingTime)}. Past slots are hidden. Multiple customers can choose the same time.
                {settings.storeStatus === "busy" && <p className="mt-2 font-bold text-[#9A5E00]">{settings.delayMessage}</p>}
              </div>
              <select value={selectedSlot} onChange={(e) => setSelectedSlot(e.target.value)} disabled={!accepting} className="mt-4 h-14 w-full rounded-xl border border-[#DDD5CE] bg-white px-4 text-xs font-bold outline-none disabled:bg-[#F1EEEB]">
                <option value="">{slots.length ? "Select a time today" : "No same-day slots available"}</option>
                {slots.map((slot) => <option key={slot.toISOString()} value={slot.toISOString()}>{formatTime(slot)}</option>)}
              </select>
              <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} rows={3} placeholder="Special instructions: no onion, less spicy, extra crispy..." className="mt-4 w-full resize-none rounded-xl border border-[#DDD5CE] p-4 text-xs outline-none focus:border-[#E3172F]" />

              <h2 className="mt-8 text-sm font-black uppercase">4. Payment</h2>
              <div className="mt-4 rounded-2xl border border-[#E3172F] bg-[#FFF8F7] p-5">
                <div className="flex gap-4"><span className="grid h-12 w-12 place-items-center rounded-xl bg-[#E3172F] text-white"><FontAwesomeIcon icon={faCreditCard} className="h-5" /></span><div><strong className="text-xs font-black uppercase">Secure online payment only</strong><p className="mt-2 text-[9px] leading-4 text-[#675D56]">Razorpay provides UPI, cards, net banking and wallets. Food preparation starts only after successful payment verification.</p></div></div>
              </div>
              <label className="mt-4 flex items-start gap-3 rounded-xl border border-[#E5DDD5] p-4"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 accent-[#E3172F]" /><span className="text-[9px] leading-4">I confirm I will collect the order or arrive for dine-in at the selected time. This is an order prebooking, not a table reservation.</span></label>
              {message && <div className="mt-5 flex gap-3 rounded-xl border border-[#F0C0C5] bg-[#FFF3F4] p-4 text-[10px] text-[#A30E20]"><FontAwesomeIcon icon={faCircleExclamation} className="mt-0.5 h-4" />{message}</div>}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
              <section className="rounded-3xl border border-[#E9E1D9] bg-white p-5 shadow-[0_18px_50px_rgba(54,35,20,.07)]">
                <div className="flex justify-between gap-3"><h2 className="text-sm font-black uppercase">Your Order ({items.reduce((s, i) => s + i.quantity, 0)})</h2><Link href="/cart" className="text-[9px] font-black text-[#E3172F]"><FontAwesomeIcon icon={faPen} className="mr-2 h-3" />Edit Cart</Link></div>
                <div className="mt-4 divide-y divide-[#EEE6DE]">
                  {items.map((item) => <div key={item.id} className="flex gap-3 py-4 first:pt-0">{item.imageUrl ? <Image src={item.imageUrl} alt={item.name} width={64} height={64} className="h-16 w-16 shrink-0 rounded-xl object-cover" /> : <MediaPlaceholder label={item.name} className="h-16 w-16 shrink-0 rounded-xl text-[7px]" />}<div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><strong className="text-[10px] font-black">{item.name}</strong><strong className="text-[10px]">{money(item.unitPrice * item.quantity)}</strong></div><p className="mt-1 text-[8px] text-[#746B64]">{item.variant} · Qty {item.quantity}</p>{item.modifiers.map((m) => <p key={m} className="mt-1 text-[8px]">+ {m}</p>)}</div></div>)}
                </div>
                {hasNonStackableDiscount ? (
                  <div className="rounded-xl border border-[#F2CF91] bg-[#FFF9EF] p-4">
                    <div className="flex gap-3">
                      <FontAwesomeIcon icon={faCircleExclamation} className="mt-0.5 h-4 text-[#E49100]" />
                      <div>
                        <strong className="block text-[10px] font-black uppercase text-[#172536]">Discount already applied</strong>
                        <p className="mt-1 text-[9px] leading-4 text-[#6B5E4F]">Coupons and TRS Coins cannot be redeemed when the cart contains a combo or a discounted menu item. You will still earn TRS Coins on the final selling price after successful payment.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-[#F2CF91] bg-[#FFF9EF] p-3"><div className="flex gap-2"><FontAwesomeIcon icon={faTag} className="mt-3 h-3 text-[#E49100]" /><input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon code" className="h-10 min-w-0 flex-1 rounded-lg border px-3 text-[9px] uppercase" /><button type="button" onClick={() => void applyCoupon()} className="rounded-lg bg-[#172536] px-4 text-[8px] font-black uppercase text-white">Apply</button></div></div>
                    <div className="mt-4 rounded-xl border p-3"><div className="flex justify-between text-[9px] font-black"><span><FontAwesomeIcon icon={faCoins} className="mr-2 h-3 text-[#E4A11B]" />Use TRS Coins</span><span>{coins}</span></div><input type="range" min={0} max={Math.min(150, Math.floor(subtotal * 0.5))} value={coins} onChange={(e) => setCoins(Number(e.target.value))} className="mt-3 w-full accent-[#E3172F]" /></div>
                  </>
                )}
                <div className="mt-5 space-y-3 border-b pb-5 text-[9px]"><div className="flex justify-between"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>{!hasNonStackableDiscount && <div className="flex justify-between text-green-700"><span>Coupon Discount</span><strong>−{money(couponDiscount)}</strong></div>}{!hasNonStackableDiscount && <div className="flex justify-between text-green-700"><span>TRS Coins Discount</span><strong>−{money(coinDiscount)}</strong></div>}<div className="flex justify-between"><span>Packaging</span><strong>{money(packaging)}</strong></div><div className="flex justify-between"><span>Taxes</span><strong>{money(tax)}</strong></div></div>
                <div className="mt-5 flex items-end justify-between"><span className="text-xs font-black uppercase">Total</span><strong className="text-2xl font-black text-[#E3172F]">{money(total)}</strong></div>
                <p className="mt-3 text-[9px]"><FontAwesomeIcon icon={faCoins} className="mr-2 h-3 text-[#E49A00]" />Earn <strong className="text-[#E3172F]">{coinsEarned} TRS Coins</strong></p>
                <button type="button" onClick={() => void startPayment()} disabled={!accepting || loading} className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#E3172F] text-[10px] font-black uppercase text-white disabled:bg-[#B7ADA8]">{loading ? "Opening Razorpay..." : "Proceed to Secure Payment"}<FontAwesomeIcon icon={faArrowRight} className="h-4" /></button>
                <p className="mt-3 text-center text-[8px] leading-4 text-[#746A63]">No cash or pay-at-counter orders. Preparation starts after verified payment.</p>
              </section>
              <section className="grid grid-cols-2 gap-3 rounded-2xl border bg-white p-4 text-[8px]"><span><FontAwesomeIcon icon={faShieldHalved} className="mr-2 h-4 text-[#E3172F]" /><strong>Secure Razorpay</strong></span><span><FontAwesomeIcon icon={faClock} className="mr-2 h-4 text-[#E3172F]" /><strong>{settings.preparationTimeMinutes} min estimate</strong></span></section>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
