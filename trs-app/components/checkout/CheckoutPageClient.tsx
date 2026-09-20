"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getCurrentCustomer } from "@/lib/cart-client";
import {
  DEFAULT_PUBLIC_ORDERING_SETTINGS,
  generateSameDayOrderSlots,
  type PublicOrderingSettings,
} from "@/lib/checkout/timeSlots";
import {
  money,
  normaliseCart,
  type ApiEnvelope,
  type CartData,
  type CheckoutOrder,
  type OrderMode,
} from "@/components/checkout/checkout-utils";
import { CheckoutOrderSummary } from "@/components/checkout/CheckoutOrderSummary";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export function CheckoutPageClient() {
  const router = useRouter();
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
        router.replace("/login?returnTo=%2Fcheckout");
        return;
      }
      const [settingsResponse, cartResponse] = await Promise.allSettled([
        fetch("/api/v1/settings/public", { cache: "no-store" }),
        fetch("/api/v1/customer/cart", { cache: "no-store" }),
      ]);

      if (
        settingsResponse.status === "fulfilled" &&
        settingsResponse.value.ok
      ) {
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
  }, [router]);

  const slots = useMemo(() => generateSameDayOrderSlots(settings), [settings]);
  const items = useMemo(() => normaliseCart(cart), [cart]);
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const hasNonStackableDiscount = items.some(
    (item) => item.isCombo || item.isDiscountedItem,
  );
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
      setMessage(
        "Coupons and TRS Coin redemption are not available when the cart contains a combo or discounted menu item.",
      );
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
      setMessage(
        error instanceof Error ? error.message : "Unable to apply coupon.",
      );
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
      setMessage(
        "Confirm that you will collect or consume the order at the selected time.",
      );
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
          couponCode: hasNonStackableDiscount
            ? undefined
            : coupon.trim() || undefined,
          coinsToRedeem: hasNonStackableDiscount ? 0 : coinDiscount,
        }),
      });
      const checkoutBody =
        (await checkoutResponse.json()) as ApiEnvelope<CheckoutOrder>;
      if (!checkoutResponse.ok) throw new Error(checkoutBody.message);

      const applicationOrderId = checkoutBody.data.id ?? checkoutBody.data._id;
      if (!applicationOrderId) throw new Error("Order ID was not returned.");

      sessionStorage.setItem("trs.pendingPaymentOrderId", applicationOrderId);
      router.push(`/payment?orderId=${encodeURIComponent(applicationOrderId)}`);
    } catch (error) {
      setLoading(false);
      setMessage(
        error instanceof Error ? error.message : "Unable to continue.",
      );
    }
  };

  return (
    <>
      <main className="min-h-screen bg-[#FFFDF9] text-[#172536]">
        <div className="border-b border-[#222] bg-[#090909] text-white">
          <div className="mx-auto flex w-[min(100%-2rem,1180px)] justify-between gap-3 overflow-x-auto py-5">
            {["Cart", "Checkout", "Payment", "Success"].map((label, index) => (
              <div
                key={label}
                className="flex min-w-[115px] items-center gap-3"
              >
                <span
                  className={`grid h-10 w-10 place-items-center rounded-full border text-xs font-black ${index === 1 ? "border-[#E3172F] bg-[#E3172F]" : "border-[#555]"}`}
                >
                  {index === 0 ? (
                    <FontAwesomeIcon icon={faCheck} className="h-3" />
                  ) : (
                    index + 1
                  )}
                </span>
                <strong
                  className={`text-[9px] font-black uppercase ${index === 1 ? "text-[#F22A3D]" : "text-white"}`}
                >
                  {label}
                </strong>
              </div>
            ))}
          </div>
        </div>

        <section className="py-7 sm:py-10">
          <div className="mx-auto grid w-[min(100%-2rem,1180px)] gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
            <CheckoutForm
              settings={settings}
              accepting={accepting}
              orderMode={orderMode}
              setOrderMode={setOrderMode}
              customer={customer}
              setCustomer={setCustomer}
              slots={slots}
              selectedSlot={selectedSlot}
              setSelectedSlot={setSelectedSlot}
              note={note}
              setNote={setNote}
              confirmed={confirmed}
              setConfirmed={setConfirmed}
              message={message}
            />

            <CheckoutOrderSummary
              items={items}
              hasNonStackableDiscount={hasNonStackableDiscount}
              coupon={coupon}
              setCoupon={setCoupon}
              couponDiscount={couponDiscount}
              applyCoupon={() => void applyCoupon()}
              coins={coins}
              setCoins={setCoins}
              subtotal={subtotal}
              coinDiscount={coinDiscount}
              packaging={packaging}
              tax={tax}
              total={total}
              coinsEarned={coinsEarned}
              accepting={accepting}
              loading={loading}
              startPayment={() => void startPayment()}
              settings={settings}
            />
          </div>
        </section>
      </main>
    </>
  );
}
