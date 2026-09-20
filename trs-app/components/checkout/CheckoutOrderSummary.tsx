import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faCircleExclamation,
  faClock,
  faCoins,
  faPen,
  faShieldHalved,
  faTag,
} from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";
import Link from "next/link";

import { MediaPlaceholder } from "@/components/site/MediaPlaceholder";
import { money, type CheckoutItem } from "@/components/checkout/checkout-utils";
import type { PublicOrderingSettings } from "@/lib/checkout/timeSlots";

type CheckoutOrderSummaryProps = {
  items: CheckoutItem[];
  hasNonStackableDiscount: boolean;
  coupon: string;
  setCoupon: (value: string) => void;
  couponDiscount: number;
  applyCoupon: () => void;
  coins: number;
  setCoins: (value: number) => void;
  subtotal: number;
  coinDiscount: number;
  packaging: number;
  tax: number;
  total: number;
  coinsEarned: number;
  accepting: boolean;
  loading: boolean;
  startPayment: () => void;
  settings: PublicOrderingSettings;
};

export function CheckoutOrderSummary({
  items,
  hasNonStackableDiscount,
  coupon,
  setCoupon,
  couponDiscount,
  applyCoupon,
  coins,
  setCoins,
  subtotal,
  coinDiscount,
  packaging,
  tax,
  total,
  coinsEarned,
  accepting,
  loading,
  startPayment,
  settings,
}: CheckoutOrderSummaryProps) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
      <section className="rounded-3xl border border-[#E9E1D9] bg-white p-5 shadow-[0_18px_50px_rgba(54,35,20,.07)]">
        <div className="flex justify-between gap-3">
          <h2 className="text-sm font-black uppercase">
            Your Order ({items.reduce((sum, item) => sum + item.quantity, 0)})
          </h2>
          <Link href="/cart" className="text-[9px] font-black text-[#E3172F]">
            <FontAwesomeIcon icon={faPen} className="mr-2 h-3" />
            Edit Cart
          </Link>
        </div>
        <div className="mt-4 divide-y divide-[#EEE6DE]">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3 py-4 first:pt-0">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  width={64}
                  height={64}
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <MediaPlaceholder
                  label={item.name}
                  className="h-16 w-16 shrink-0 rounded-xl text-[7px]"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2">
                  <strong className="text-[10px] font-black">{item.name}</strong>
                  <strong className="text-[10px]">
                    {money(item.unitPrice * item.quantity)}
                  </strong>
                </div>
                <p className="mt-1 text-[8px] text-[#746B64]">
                  {item.variant} · Qty {item.quantity}
                </p>
                {item.modifiers.map((modifier) => (
                  <p key={modifier} className="mt-1 text-[8px]">
                    + {modifier}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
        {hasNonStackableDiscount ? (
          <div className="rounded-xl border border-[#F2CF91] bg-[#FFF9EF] p-4">
            <div className="flex gap-3">
              <FontAwesomeIcon
                icon={faCircleExclamation}
                className="mt-0.5 h-4 text-[#E49100]"
              />
              <div>
                <strong className="block text-[10px] font-black uppercase text-[#172536]">
                  Discount already applied
                </strong>
                <p className="mt-1 text-[9px] leading-4 text-[#6B5E4F]">
                  Coupons and TRS Coins cannot be redeemed when the cart
                  contains a combo or a discounted menu item. You will still
                  earn TRS Coins on the final selling price after successful
                  payment.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-[#F2CF91] bg-[#FFF9EF] p-3">
              <div className="flex gap-2">
                <FontAwesomeIcon
                  icon={faTag}
                  className="mt-3 h-3 text-[#E49100]"
                />
                <input
                  value={coupon}
                  onChange={(event) => setCoupon(event.target.value)}
                  placeholder="Coupon code"
                  className="h-10 min-w-0 flex-1 rounded-lg border px-3 text-[9px] uppercase"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  className="rounded-lg bg-[#172536] px-4 text-[8px] font-black uppercase text-white"
                >
                  Apply
                </button>
              </div>
            </div>
            <div className="mt-4 rounded-xl border p-3">
              <div className="flex justify-between text-[9px] font-black">
                <span>
                  <FontAwesomeIcon
                    icon={faCoins}
                    className="mr-2 h-3 text-[#E4A11B]"
                  />
                  Use TRS Coins
                </span>
                <span>{coins}</span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.min(150, Math.floor(subtotal * 0.5))}
                value={coins}
                onChange={(event) => setCoins(Number(event.target.value))}
                className="mt-3 w-full accent-[#E3172F]"
              />
            </div>
          </>
        )}
        <div className="mt-5 space-y-3 border-b pb-5 text-[9px]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <strong>{money(subtotal)}</strong>
          </div>
          {!hasNonStackableDiscount && (
            <div className="flex justify-between text-green-700">
              <span>Coupon Discount</span>
              <strong>−{money(couponDiscount)}</strong>
            </div>
          )}
          {!hasNonStackableDiscount && (
            <div className="flex justify-between text-green-700">
              <span>TRS Coins Discount</span>
              <strong>−{money(coinDiscount)}</strong>
            </div>
          )}
          <div className="flex justify-between">
            <span>Packaging</span>
            <strong>{money(packaging)}</strong>
          </div>
          <div className="flex justify-between">
            <span>Taxes</span>
            <strong>{money(tax)}</strong>
          </div>
        </div>
        <div className="mt-5 flex items-end justify-between">
          <span className="text-xs font-black uppercase">Total</span>
          <strong className="text-2xl font-black text-[#E3172F]">
            {money(total)}
          </strong>
        </div>
        <p className="mt-3 text-[9px]">
          <FontAwesomeIcon
            icon={faCoins}
            className="mr-2 h-3 text-[#E49A00]"
          />
          Earn{" "}
          <strong className="text-[#E3172F]">{coinsEarned} TRS Coins</strong>
        </p>
        <button
          type="button"
          onClick={startPayment}
          disabled={!accepting || loading}
          className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#E3172F] text-[10px] font-black uppercase text-white disabled:bg-[#B7ADA8]"
        >
          {loading ? "Opening Razorpay..." : "Proceed to Secure Payment"}
          <FontAwesomeIcon icon={faArrowRight} className="h-4" />
        </button>
        <p className="mt-3 text-center text-[8px] leading-4 text-[#746A63]">
          No cash or pay-at-counter orders. Preparation starts after verified
          payment.
        </p>
      </section>
      <section className="grid grid-cols-2 gap-3 rounded-2xl border bg-white p-4 text-[8px]">
        <span>
          <FontAwesomeIcon
            icon={faShieldHalved}
            className="mr-2 h-4 text-[#E3172F]"
          />
          <strong>Secure Razorpay</strong>
        </span>
        <span>
          <FontAwesomeIcon
            icon={faClock}
            className="mr-2 h-4 text-[#E3172F]"
          />
          <strong>{settings.preparationTimeMinutes} min estimate</strong>
        </span>
      </section>
    </aside>
  );
}
