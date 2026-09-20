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
  normaliseCart,
  type ApiEnvelope,
  type CartData,
  type OrderMode,
} from "@/components/checkout/checkout-utils";
import { CheckoutOrderSummary } from "@/components/checkout/CheckoutOrderSummary";
import { CheckoutProgress } from "@/components/checkout/CheckoutProgress";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import {
  createCheckoutOrder,
  validateCheckoutCoupon,
} from "@/components/checkout/checkout-api";
import { calculateCheckoutPricing } from "@/components/checkout/checkout-pricing";
import {
  isCheckoutAcceptingOrders,
  validateCheckoutSubmission,
} from "@/components/checkout/checkout-validation";

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
  const {
    subtotal,
    hasNonStackableDiscount,
    tax,
    packaging,
    coinDiscount,
    total,
    coinsEarned,
  } = calculateCheckoutPricing(cart, couponDiscount, coins);
  const accepting = isCheckoutAcceptingOrders(settings, slots.length);

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
      const result = await validateCheckoutCoupon(code);
      setCouponDiscount(result.discountAmount);
      setMessage(result.message);
    } catch (error) {
      setCouponDiscount(0);
      setMessage(
        error instanceof Error ? error.message : "Unable to apply coupon.",
      );
    }
  };

  const startPayment = async () => {
    setMessage("");
    const validationMessage = validateCheckoutSubmission({
      accepting,
      statusMessage: settings.statusMessage,
      selectedSlot,
      customerName: customer.name,
      customerPhone: customer.phone,
      confirmed,
      itemCount: items.length,
    });
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    try {
      setLoading(true);
      const applicationOrderId = await createCheckoutOrder({
        orderMode,
        selectedSlot,
        note,
        couponCode: hasNonStackableDiscount
          ? undefined
          : coupon.trim() || undefined,
        coinsToRedeem: hasNonStackableDiscount ? 0 : coinDiscount,
      });

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
        <CheckoutProgress />

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
