"use client";

import { CmsHeroMedia } from "@/components/site/CmsHeroMedia";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faCalendarDays,
  faCheck,
  faCoins,
  faGift,
  faPizzaSlice,
  faReceipt,
  faRotate,
  faTicket,
  faUserPlus,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SpinWheel } from "@/components/site/SpinWheel";

type IconContentItem = {
  icon: IconDefinition;
  title: string;
  text: string;
};

type LoyaltyDashboard = {
  wallet: {
    balance: number;
    lifetimeEarned: number;
    lifetimeRedeemed: number;
  };
  membership: {
    annualOrders: number;
    tierKey: string;
  };
  expiringSoon: {
    coins: number;
    nextExpiry: string | null;
  };
  catalog: RewardCatalogItem[];
};

type RewardCatalogItem = {
  _id: string;
  name: string;
  description: string;
  rewardType: "fixed_discount" | "percentage_discount" | "free_item" | "bonus_coins";
  coinCost: number;
  rewardValue: number;
  minimumOrderAmount: number;
  imageUrl?: string;
};

type PublicCoupon = {
  _id: string;
  code: string;
  name?: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscountAmount?: number | null;
  minimumOrderAmount?: number;
  firstOrderOnly?: boolean;
};

type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

const earningMethods: IconContentItem[] = [
  {
    icon: faCoins,
    title: "Order and earn",
    text: "Earn 5 TRS Coins for every eligible ₹100 spent.",
  },
  {
    icon: faUserPlus,
    title: "Create an account",
    text: "Receive a one-time signup bonus after verification.",
  },
  {
    icon: faTicket,
    title: "Special offers",
    text: "Earn bonus coins on selected promotional offers.",
  },
  {
    icon: faRotate,
    title: "Daily spin",
    text: "Spin once per eligible day for a chance to win.",
  },
];

const toneClasses = {
  gold: {
    card: "bg-[linear-gradient(180deg,#FFF9E8,#FFF5D6)]",
    badge: "bg-[#E8A53A]",
    button: "bg-[#D99219] hover:bg-[#B9780E]",
    title: "text-[#9A5E08]",
  },
  red: {
    card: "bg-[linear-gradient(180deg,#FFF3F1,#FFE8E3)]",
    badge: "bg-[#DF5A55]",
    button: "bg-[#C8102E] hover:bg-[#A50E27]",
    title: "text-[#B31824]",
  },
  green: {
    card: "bg-[linear-gradient(180deg,#F5FAEC,#EAF4D9)]",
    badge: "bg-[#7DB953]",
    button: "bg-[#3B7F23] hover:bg-[#2B6418]",
    title: "text-[#326D1E]",
  },
  purple: {
    card: "bg-[linear-gradient(180deg,#F8F2FF,#EFE4FA)]",
    badge: "bg-[#8D62B7]",
    button: "bg-[#6F3CA0] hover:bg-[#542A7E]",
    title: "text-[#5E318A]",
  },
} as const;

const processSteps: IconContentItem[] = [
  {
    icon: faPizzaSlice,
    title: "Order",
    text: "Place an eligible order.",
  },
  {
    icon: faCoins,
    title: "Earn Coins",
    text: "Earn 5 coins per ₹100.",
  },
  {
    icon: faWallet,
    title: "Save & Collect",
    text: "Track coins in your wallet.",
  },
  {
    icon: faTicket,
    title: "Redeem",
    text: "Apply an eligible reward.",
  },
  {
    icon: faGift,
    title: "Enjoy More",
    text: "Save on future orders.",
  },
];

export function RewardsPageClient() {
  const [dashboard, setDashboard] = useState<LoyaltyDashboard | null>(null);
  const [coupons, setCoupons] = useState<PublicCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadRewards() {
    setLoading(true);
    try {
      const [dashboardResponse, couponResponse] = await Promise.all([
        fetch("/api/v1/customer/loyalty/dashboard", { credentials: "include", cache: "no-store" }),
        fetch("/api/v1/public/offers", { cache: "no-store" }),
      ]);

      if (dashboardResponse.ok) {
        const payload = (await dashboardResponse.json()) as ApiEnvelope<LoyaltyDashboard>;
        setDashboard(payload.data);
      } else {
        setDashboard(null);
      }

      if (couponResponse.ok) {
        const payload = (await couponResponse.json()) as ApiEnvelope<{ items: PublicCoupon[] }>;
        setCoupons(payload.data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRewards();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function redeemReward(rewardId: string) {
    setRedeemingId(rewardId);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/customer/loyalty/redeem", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId }),
      });
      const payload = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok) throw new Error(payload.message || "Unable to redeem reward.");
      setMessage(payload.message || "Reward redeemed successfully.");
      await loadRewards();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to redeem reward.");
    } finally {
      setRedeemingId(null);
    }
  }

  const firstOrderCoupon = useMemo(
    () => coupons.find((coupon) => coupon.firstOrderOnly) ?? coupons[0] ?? null,
    [coupons],
  );

  const rewardStats = [
    { label: "Your TRS Coins", value: dashboard ? String(dashboard.wallet.balance) : "—", helper: "Available balance", icon: faCoins },
    { label: "Coins Earned", value: dashboard ? String(dashboard.wallet.lifetimeEarned) : "—", helper: "Lifetime earned", icon: faWallet },
    { label: "Eligible Orders", value: dashboard ? String(dashboard.membership.annualOrders) : "—", helper: "This year", icon: faReceipt },
    { label: "Expiring Soon", value: dashboard ? String(dashboard.expiringSoon.coins) : "—", helper: dashboard?.expiringSoon.nextExpiry ? `Next expiry ${new Date(dashboard.expiringSoon.nextExpiry).toLocaleDateString("en-IN")}` : "No coins expiring soon", icon: faCalendarDays },
  ];

  const redemptionOptions = dashboard?.catalog ?? [];

  return (
    <main className="overflow-x-hidden bg-[#FFFDF9] text-[#172536]">
      <section className="relative overflow-hidden border-b border-[#EDE3D8] bg-[radial-gradient(circle_at_72%_30%,rgba(232,165,58,.14),transparent_34%),linear-gradient(135deg,#FFFDF9,#FFF6EC)]">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(#E8A53A_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="relative mx-auto grid min-h-[500px] w-[min(100%-2rem,1320px)] min-w-0 items-center gap-10 py-12 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] lg:py-16">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-[0.12em] text-[#D99219] sm:text-base">
              Eat more, earn more
            </p>

            <h1 className="mt-3 max-w-[700px] break-words text-[clamp(3rem,8vw,6.2rem)] font-black uppercase leading-[.9] tracking-[-0.055em] text-[#14283B]">
              Get <span className="text-[#C8102E]">Rewarded</span>
            </h1>

            <p className="mt-6 max-w-[590px] text-base leading-7 text-[#4E4842] sm:text-lg">
              Earn TRS Coins on eligible orders and unlock practical food
              rewards, member-only offers and daily spin prizes.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {([
                {
                  title: "5 Coins",
                  text: "for every eligible ₹100 spent",
                  icon: faCoins,
                },
                {
                  title: "1 Coin",
                  text: "= ₹1 reward value",
                  icon: faWallet,
                },
                {
                  title: "Expiry applies",
                  text: "shown before redemption",
                  icon: faCalendarDays,
                },
              ] satisfies IconContentItem[]).map(({ title, text, icon }) => (
                <div
                  key={title}
                  className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#EDE3D8] bg-white/85 p-4 shadow-[0_12px_30px_rgba(44,28,14,.06)]"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FFF1E5] text-[#D99219]">
                    <FontAwesomeIcon icon={icon} className="h-5" />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm font-black">{title}</strong>
                    <span className="mt-1 block text-[10px] leading-4 text-[#6D655E]">
                      {text}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[340px] min-w-0 sm:min-h-[420px]">
            <CmsHeroMedia
              pageKey="rewards"
              label="TRS Coins rewards hero image"
              className="absolute inset-0 rounded-[2rem] border-[#E8D8C9] bg-[linear-gradient(135deg,#FFF4E3,#F9E3C6)] shadow-[0_28px_70px_rgba(88,56,24,.12)]"
            />
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-5 pb-12 sm:-mt-8">
        <div className="mx-auto grid w-[min(100%-2rem,1240px)] min-w-0 gap-px overflow-hidden rounded-3xl border border-[#9B1117] bg-[#9B1117] shadow-[0_22px_46px_rgba(137,0,8,.18)] sm:grid-cols-2 xl:grid-cols-4">
          {rewardStats.map(({ label, value, helper, icon }) => (
            <article
              key={label}
              className="min-w-0 bg-[linear-gradient(135deg,#A90008,#7F0007)] p-6 text-white sm:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/80">
                    {label}
                  </p>
                  <p className="mt-3 break-words text-4xl font-black text-[#FFD24D]">
                    {value}
                  </p>
                  <p className="mt-2 text-[10px] text-white/70">{helper}</p>
                </div>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-[#FFD24D]">
                  <FontAwesomeIcon icon={icon} className="h-5" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="pb-12">
        <div className="mx-auto grid w-[min(100%-2rem,1240px)] min-w-0 gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
          <div className="min-w-0 rounded-3xl border border-[#EDE3D8] bg-white p-5 shadow-[0_20px_45px_rgba(50,30,15,.07)] sm:p-7">
            <SpinWheel />
          </div>

          <div className="min-w-0 rounded-3xl border border-[#EDE3D8] bg-white p-6 shadow-[0_20px_45px_rgba(50,30,15,.07)] sm:p-8">
            <div className="grid min-w-0 items-center gap-7 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#C8102E]">
                  How to earn TRS Coins
                </p>

                <div className="mt-6 grid gap-4">
                  {earningMethods.map(({ icon, title, text }) => (
                    <div key={title} className="flex min-w-0 gap-4">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#FFF1E5] text-[#D99219]">
                        <FontAwesomeIcon icon={icon} className="h-4" />
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-sm font-black">{title}</h2>
                        <p className="mt-1 text-[11px] leading-5 text-[#645D57]">
                          {text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="relative h-[260px] w-[260px] sm:h-[300px] sm:w-[300px]">
                  <Image
                    src="/images/offers/trs-coin.png"
                    alt="TRS Coin"
                    fill
                    sizes="(max-width: 640px) 260px, 300px"
                    className="object-contain drop-shadow-[0_22px_38px_rgba(0,0,0,.32)]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-12">
        <div className="mx-auto w-[min(100%-2rem,1240px)] min-w-0">
          <div className="flex items-center justify-center gap-4">
            <span className="h-px w-16 bg-[#E8A53A]" />
            <h2 className="text-center text-xl font-black uppercase tracking-[-0.03em] sm:text-2xl">
              Redeem Your Coins
            </h2>
            <span className="h-px w-16 bg-[#E8A53A]" />
          </div>

          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-[#6A625B]">
            Rewards are deliberately moderate so the loyalty programme remains
            sustainable while still giving customers useful savings.
          </p>

          {message ? (
            <div className="mx-auto mt-5 max-w-xl rounded-xl border border-[#E8D8C9] bg-white px-4 py-3 text-center text-sm font-semibold text-[#5E5146]">
              {message}
            </div>
          ) : null}

          <div className="mt-7 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {redemptionOptions.map((reward, index) => {
              const toneKeys = ["gold", "red", "green", "purple"] as const;
              const tone = toneClasses[toneKeys[index % toneKeys.length]];

              return (
                <article
                  key={reward._id}
                  className={`min-w-0 rounded-3xl border border-[#EDE3D8] p-5 text-center shadow-[0_14px_32px_rgba(50,30,15,.06)] ${tone.card}`}
                >
                  <span
                    className={`inline-flex rounded-full px-4 py-2 text-[10px] font-black uppercase text-white ${tone.badge}`}
                  >
                    {reward.coinCost} Coins
                  </span>

                  <h3 className={`mt-6 text-3xl font-black ${tone.title}`}>
                    {reward.rewardType === "percentage_discount"
                      ? `${reward.rewardValue}% Off`
                      : reward.rewardType === "fixed_discount"
                        ? `₹${reward.rewardValue} Off`
                        : reward.rewardType === "bonus_coins"
                          ? `${reward.rewardValue} Bonus Coins`
                          : reward.name}
                  </h3>

                  <p className="mt-2 text-xs font-semibold text-[#4D4742]">
                    on your next eligible order
                  </p>

                  <div className="mx-auto mt-6 grid h-16 w-16 place-items-center rounded-2xl border border-current/10 bg-white/55">
                    <FontAwesomeIcon icon={faTicket} className="h-7 opacity-55" />
                  </div>

                  <button
                    type="button"
                    disabled={!dashboard || redeemingId === reward._id || dashboard.wallet.balance < reward.coinCost}
                    onClick={() => void redeemReward(reward._id)}
                    className={`mt-6 h-11 w-full rounded-xl text-[10px] font-black uppercase text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${tone.button}`}
                  >
                    {redeemingId === reward._id
                      ? "Redeeming..."
                      : !dashboard
                        ? "Login to Redeem"
                        : dashboard.wallet.balance < reward.coinCost
                          ? "Not Enough Coins"
                          : "Redeem Now"}
                  </button>

                  <p className="mt-3 text-[10px] font-semibold text-[#655E57]">
                    Minimum order ₹{reward.minimumOrderAmount}
                  </p>
                </article>
              );
            })}
            {!loading && redemptionOptions.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-[#E8D8C9] bg-white px-6 py-10 text-center text-sm font-semibold text-[#6A625B]">
                No active rewards are available in the admin-managed reward catalog.
              </div>
            ) : null}
          </div>

          <div className="mt-5 rounded-2xl border border-[#E8D8C9] bg-[#FFF9F0] p-4 text-[11px] leading-5 text-[#6A625B]">
            Final redemption eligibility, minimum order values, coin expiry and
            usage limits should come from the rewards API and remain editable
            from the admin dashboard.
          </div>
        </div>
      </section>

      <section className="pb-12">
        <div className="mx-auto w-[min(100%-2rem,1240px)] min-w-0 rounded-3xl border border-[#EDE3D8] bg-white p-6 shadow-[0_18px_40px_rgba(50,30,15,.06)] sm:p-8">
          <div className="flex items-center justify-center gap-4">
            <span className="h-px w-16 bg-[#E8A53A]" />
            <h2 className="text-center text-xl font-black uppercase tracking-[-0.03em] sm:text-2xl">
              How It Works
            </h2>
            <span className="h-px w-16 bg-[#E8A53A]" />
          </div>

          <div className="mt-8 grid min-w-0 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {processSteps.map(({ icon, title, text }, index) => (
              <article key={title} className="relative min-w-0 text-center">
                <span className="absolute left-2 top-0 grid h-6 w-6 place-items-center rounded-full bg-[#C8102E] text-[9px] font-black text-white">
                  {index + 1}
                </span>

                <span className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[#E8D8C9] bg-[#FFF7EE] text-[#D99219]">
                  <FontAwesomeIcon icon={icon} className="h-7" />
                </span>

                <h3 className="mt-4 text-xs font-black uppercase">{title}</h3>
                <p className="mx-auto mt-2 max-w-[180px] text-[10px] leading-4 text-[#655E57]">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-14">
        <div className="mx-auto grid w-[min(100%-2rem,1240px)] min-w-0 gap-5 lg:grid-cols-2">
          <article className="min-w-0 rounded-3xl border border-dashed border-[#E8A53A] bg-[#FFF8ED] p-6 sm:p-8">
            <div className="grid min-w-0 items-center gap-6 sm:grid-cols-[minmax(0,1fr)_180px]">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#C8102E]">
                  New user offer
                </p>
                <h2 className="mt-3 text-2xl font-black uppercase">
                  {firstOrderCoupon
                    ? firstOrderCoupon.discountType === "percentage"
                      ? `Get ${firstOrderCoupon.discountValue}% Off`
                      : `Get ₹${firstOrderCoupon.discountValue} Off`
                    : "Get 25 TRS Coins"}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#625B55]">
                  Earn a one-time signup bonus after placing your first eligible
                  order.
                </p>
                <span className="mt-5 inline-flex rounded-full border border-[#C8102E] px-4 py-2 text-[10px] font-black uppercase text-[#C8102E]">
                  {firstOrderCoupon ? `Code: ${firstOrderCoupon.code}` : "First order reward"}
                </span>
              </div>

              <div className="relative h-[180px] w-[180px]">
                <Image
                  src="/images/rewards/new-user-offer.webp"
                  alt="New user reward"
                  fill
                  sizes="180px"
                  className="object-contain"
                />
              </div>
            </div>
          </article>

          <article className="min-w-0 rounded-3xl border border-dashed border-[#E8A53A] bg-[#FFF8ED] p-6 sm:p-8">
            <div className="grid min-w-0 items-center gap-6 sm:grid-cols-[minmax(0,1fr)_180px]">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#C8102E]">
                  Share and earn
                </p>
                <h2 className="mt-3 text-2xl font-black uppercase">
                  Refer your friends
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#625B55]">
                  Referral rewards should be credited only after the referred
                  customer completes an eligible first order.
                </p>
                <Link
                  href="/signup"
                  className="mt-5 inline-flex h-11 items-center gap-3 rounded-xl bg-[#C8102E] px-5 text-[10px] font-black uppercase text-white transition hover:bg-[#A50E27]"
                >
                  Refer Now
                  <FontAwesomeIcon icon={faArrowRight} className="h-3" />
                </Link>
              </div>

              <div className="relative h-[180px] w-[180px]">
                <Image
                  src="/images/rewards/referral.webp"
                  alt="Referral rewards"
                  fill
                  sizes="180px"
                  className="object-contain"
                />
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="pb-14">
        <div className="mx-auto flex w-[min(100%-2rem,1240px)] min-w-0 flex-col gap-5 rounded-3xl bg-[#112536] p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#F5C84B]">
              Member benefits
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase">
              More value, without unrealistic discounts
            </h2>
            <div className="mt-4 grid gap-2 text-xs text-white/75 sm:grid-cols-2">
              {[
                "Early access to selected offers",
                "Birthday reward eligibility",
                "Priority reward notifications",
                "Transparent expiry information",
              ].map((benefit) => (
                <span key={benefit} className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheck} className="h-3 text-[#F5C84B]" />
                  {benefit}
                </span>
              ))}
            </div>
          </div>

          <Link
            href="/terms"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-3 rounded-xl border border-[#F5C84B] px-5 text-[10px] font-black uppercase text-[#F5C84B] transition hover:bg-[#F5C84B] hover:text-[#112536]"
          >
            View Reward Terms
            <FontAwesomeIcon icon={faArrowRight} className="h-3" />
          </Link>
        </div>
      </section>
    </main>
  );
}
