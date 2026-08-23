"use client";

import { CmsHeroMedia } from "@/components/site/CmsHeroMedia";
import type { FormEvent } from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faBagShopping,
  faCheck,
  faClock,
  faHeadset,
  faPhone,
  faReceipt,
  faRotate,
  faShieldHeart,
  faStore,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { MediaPlaceholder } from "@/components/site/MediaPlaceholder";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

type OrderType = "takeaway" | "dine-in";
type TrackingStatus =
  | "placed"
  | "accepted"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled"
  | "rejected";

type OrderItem = {
  id: string;
  name: string;
  variant: string;
  quantity: number;
  unitPrice: number;
};

type TrackingResult = {
  orderId: string;
  entityId: string;
  orderType: OrderType;
  status: TrackingStatus;
  placedAt: string;
  acceptedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  completedAt?: string;
  estimatedReadyWindow?: string;
  items: OrderItem[];
  subtotal: number;
  coinDiscount: number;
  total: number;
};

type StatusStep = {
  id: TrackingStatus;
  title: string;
  description: string;
  time?: string;
  icon: IconDefinition;
};

const statusOrder: TrackingStatus[] = [
  "placed",
  "accepted",
  "preparing",
  "ready",
  "completed",
];

const heroFeatures: {
  icon: IconDefinition;
  title: string;
  text: string;
}[] = [
  {
    icon: faClock,
    title: "Real-Time Updates",
    text: "Follow each preparation stage",
  },
  {
    icon: faUtensils,
    title: "Fresh Preparation",
    text: "Made fresh for your order",
  },
  {
    icon: faStore,
    title: "Dine-in or Takeaway",
    text: "Status adapts to your order type",
  },
];

const trustItems: {
  icon: IconDefinition;
  title: string;
  text: string;
}[] = [
  {
    icon: faUtensils,
    title: "100% Vegetarian",
    text: "Pure vegetarian menu",
  },
  {
    icon: faUtensils,
    title: "Fresh Ingredients",
    text: "Prepared with care",
  },
  {
    icon: faShieldHeart,
    title: "Secure Payments",
    text: "Protected transactions",
  },
  {
    icon: faStore,
    title: "Dine-in or Takeaway",
    text: "Choose your order type",
  },
];



function getReadyCopy(orderType: OrderType): {
  title: string;
  description: string;
} {
  if (orderType === "takeaway") {
    return {
      title: "Ready for Pickup",
      description: "Your takeaway order is ready to collect",
    };
  }

  return {
    title: "Ready to Serve",
    description: "Your dine-in order is ready to be served",
  };
}

function getCompletedCopy(orderType: OrderType): {
  title: string;
  description: string;
} {
  if (orderType === "takeaway") {
    return {
      title: "Picked Up",
      description: "Your takeaway order has been collected",
    };
  }

  return {
    title: "Served",
    description: "Your dine-in order has been served",
  };
}

function buildStatusSteps(result: TrackingResult): StatusStep[] {
  const ready = getReadyCopy(result.orderType);
  const completed = getCompletedCopy(result.orderType);

  return [
    {
      id: "placed",
      title: "Order Placed",
      description: "Your order has been received",
      time: result.placedAt,
      icon: faReceipt,
    },
    {
      id: "accepted",
      title: "Order Confirmed",
      description: "Your order has been accepted by TRS",
      time: result.acceptedAt,
      icon: faCheck,
    },
    {
      id: "preparing",
      title: "Preparing",
      description: "Your order is being prepared fresh",
      time: result.preparingAt,
      icon: faUtensils,
    },
    {
      id: "ready",
      title: ready.title,
      description: ready.description,
      time: result.readyAt,
      icon: result.orderType === "takeaway" ? faBagShopping : faUtensils,
    },
    {
      id: "completed",
      title: completed.title,
      description: completed.description,
      time: result.completedAt,
      icon: faCheck,
    },
  ];
}

export function TrackOrderPageClient() {
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);

  const steps = useMemo(
    () => (result ? buildStatusSteps(result) : []),
    [result],
  );

  const currentStatusIndex = result
    ? statusOrder.indexOf(result.status)
    : -1;

  const loadTrackedOrder = useCallback(async () => {
    const response = await fetch("/api/v1/public/orders/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: orderId.trim(), phone: phone.trim() }),
      cache: "no-store",
    });
    const payload = (await response.json()) as { success?: boolean; message?: string; data?: TrackingResult };
    if (!response.ok || !payload.data) throw new Error(payload.message || "Order not found");
    setResult(payload.data);
    return payload.data;
  }, [orderId, phone]);

  useRealtimeRefresh({
    events: ["order.updated", "order.status_changed", "order.cancelled", "order.payment_updated", "payment.updated"],
    enabled: Boolean(result),
    onEvent: async (event) => {
      const eventOrderId = String(event.data.orderId ?? event.entityId ?? "");
      if (result && (eventOrderId === result.entityId || eventOrderId === result.orderId)) {
        await loadTrackedOrder();
      }
    },
  });

  const submitTracking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (orderId.trim().length < 4) {
      setStatus("error");
      setMessage("Please enter a valid order ID.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      setStatus("error");
      setMessage("Please enter the registered 10-digit mobile number.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      await loadTrackedOrder();
      setStatus("success");
      setMessage("Order details updated successfully.");
    } catch {
      setStatus("error");
      setMessage(
        "We could not find that order. Check the order ID and registered phone number.",
      );
    }
  };

  return (
    <main className="overflow-x-hidden bg-[#FFFDF9] text-[#172536]">
      <section className="relative overflow-hidden border-b border-[#EDE3D8] bg-[linear-gradient(135deg,#FFFDF9,#FFF6EC)]">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(#E8A53A_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="relative mx-auto grid min-h-[520px] w-[min(100%-2rem,1320px)] min-w-0 items-center gap-10 py-12 lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)] lg:py-16">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-3 text-sm font-black italic text-[#C8102E]">
              <span className="h-px w-10 bg-[#E8A53A]" />
              Track Every Step
              <span className="h-px w-10 bg-[#E8A53A]" />
            </div>

            <h1 className="mt-6 break-words text-[clamp(3.2rem,8vw,6.2rem)] font-black uppercase leading-[.88] tracking-[-0.055em] text-[#14283B]">
              Track Your
              <br />
              <span className="text-[#C8102E]">Order</span>
            </h1>

            <p className="mt-6 max-w-[560px] text-base leading-8 text-[#4F4943] sm:text-lg">
              Follow your TRS order from confirmation through preparation,
              pickup or table service.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {heroFeatures.map(({ icon, title, text }) => (
                <article
                  key={title}
                  className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#EDE3D8] bg-white/90 p-4 shadow-[0_12px_30px_rgba(44,28,14,.06)]"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#E8A53A] bg-[#FFF8EE] text-[#C8102E]">
                    <FontAwesomeIcon icon={icon} className="h-4" />
                  </span>

                  <span className="min-w-0">
                    <strong className="block text-[10px] font-black uppercase">
                      {title}
                    </strong>
                    <span className="mt-1 block text-[9px] leading-4 text-[#6D655E]">
                      {text}
                    </span>
                  </span>
                </article>
              ))}
            </div>
          </div>

          <div className="relative min-h-[340px] min-w-0 sm:min-h-[440px]">
            <CmsHeroMedia
              pageKey="track-order"
              label="TRS order tracking hero image"
              className="absolute inset-0 rounded-[2rem] border-[#E8D8C9] bg-[linear-gradient(135deg,#FFF4E3,#F5D5B3)] shadow-[0_28px_70px_rgba(88,56,24,.14)]"
            />
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-4 pb-10 sm:-mt-8">
        <form
          onSubmit={submitTracking}
          className="mx-auto w-[min(100%-2rem,1240px)] min-w-0 rounded-3xl border border-[#EDE3D8] bg-white p-5 shadow-[0_20px_48px_rgba(50,30,15,.09)] sm:p-7"
        >
          <div className="flex items-center gap-3">
            <span className="text-[#E8A53A]">★</span>
            <h2 className="text-base font-black uppercase sm:text-lg">
              Enter Your Order Details
            </h2>
            <span className="text-[#E8A53A]">★</span>
          </div>

          <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_250px] lg:items-end">
            <label className="min-w-0 text-[10px] font-black uppercase">
              Order ID
              <input
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
                placeholder="Enter your order ID"
                className="mt-2 h-12 w-full min-w-0 rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] px-4 text-sm font-medium normal-case outline-none transition placeholder:text-[#9C938A] focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10"
              />
            </label>

            <label className="min-w-0 text-[10px] font-black uppercase">
              Registered Phone Number
              <input
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
                }
                type="tel"
                inputMode="numeric"
                placeholder="Enter your registered mobile number"
                className="mt-2 h-12 w-full min-w-0 rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] px-4 text-sm font-medium normal-case outline-none transition placeholder:text-[#9C938A] focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10"
              />
            </label>

            <button
              type="submit"
              disabled={status === "loading"}
              className="flex h-12 items-center justify-center gap-3 rounded-xl bg-[#C8102E] px-6 text-[10px] font-black uppercase text-white shadow-[0_12px_28px_rgba(200,16,46,.22)] transition hover:-translate-y-0.5 hover:bg-[#A50E27] disabled:cursor-not-allowed disabled:opacity-65"
            >
              {status === "loading" ? "Tracking..." : "Track Order"}
              <FontAwesomeIcon icon={faArrowRight} className="h-3" />
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 text-[10px] text-[#655E57] sm:flex-row sm:items-center sm:justify-between">
            <span>
              Your order ID is available in your confirmation message.
            </span>

            <span className="flex flex-wrap items-center gap-2">
              Need help?
              <a
                href="https://wa.me/919166694786"
                target="_blank"
                rel="noopener noreferrer"
                className="font-black text-[#287238]"
              >
                WhatsApp +91 91666 94786
              </a>
              or
              <a
                href="tel:+917300052777"
                className="font-black text-[#C8102E]"
              >
                call +91 73000 52777
              </a>
            </span>
          </div>

          {message && (
            <div
              role={status === "error" ? "alert" : "status"}
              className={`mt-4 rounded-xl border px-4 py-3 text-xs font-semibold ${
                status === "success"
                  ? "border-[#B8DFC0] bg-[#F1FBF3] text-[#287238]"
                  : "border-[#F1C6C6] bg-[#FFF3F3] text-[#A50E27]"
              }`}
            >
              {message}
            </div>
          )}
        </form>
      </section>

      {result && (
        <>
          <section className="pb-10">
            <div className="mx-auto w-[min(100%-2rem,1240px)] min-w-0">
              <div className="flex items-center justify-center gap-4">
                <span className="h-px w-16 bg-[#E8A53A]" />
                <h2 className="text-center text-xl font-black uppercase tracking-[-0.03em] sm:text-2xl">
                  Order Status
                </h2>
                <span className="h-px w-16 bg-[#E8A53A]" />
              </div>

              <div className="relative mt-8 grid min-w-0 gap-7 sm:grid-cols-2 lg:grid-cols-5">
                <div className="absolute left-[12.5%] right-[12.5%] top-9 hidden h-0.5 bg-[#D8D0C8] lg:block" />

                {steps.map((step, index) => {
                  const complete = index < currentStatusIndex;
                  const active = index === currentStatusIndex;

                  return (
                    <article
                      key={step.id}
                      className="relative z-10 min-w-0 text-center"
                    >
                      <span
                        className={`mx-auto grid h-[72px] w-[72px] place-items-center rounded-full border-2 bg-[#FFFDF9] transition ${
                          complete || active
                            ? "border-[#C8102E] text-[#C8102E]"
                            : "border-[#A6A6A6] text-[#8A8A8A]"
                        }`}
                      >
                        <FontAwesomeIcon icon={step.icon} className="h-6" />
                      </span>

                      <h3 className="mt-4 text-[11px] font-black uppercase">
                        {step.title}
                      </h3>
                      <p className="mx-auto mt-2 max-w-[190px] text-[10px] leading-4 text-[#655E57]">
                        {step.description}
                      </p>
                      <p className="mt-2 text-[10px] font-bold text-[#3E3935]">
                        {step.time ?? "—"}
                      </p>
                    </article>
                  );
                })}
              </div>

              {result.estimatedReadyWindow && (
                <div className="mt-7 flex min-w-0 flex-col gap-4 rounded-2xl border border-[#F0DFC8] bg-[#FFF7EA] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-[#C8102E]">
                      <FontAwesomeIcon
                        icon={
                          result.orderType === "takeaway"
                            ? faBagShopping
                            : faUtensils
                        }
                        className="h-5"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black">
                        Estimated{" "}
                        {result.orderType === "takeaway"
                          ? "Pickup"
                          : "Serving"}{" "}
                        Time:{" "}
                        <span className="text-[#C8102E]">
                          {result.estimatedReadyWindow}
                        </span>
                      </p>
                      <p className="mt-1 text-[10px] leading-4 text-[#655E57]">
                        {result.orderType === "takeaway"
                          ? "Please carry your order ID when collecting your takeaway order."
                          : "Please remain available at your selected dine-in table or seating area."}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-[#C8102E] px-4 text-[9px] font-black uppercase text-[#C8102E]">
                    {result.orderType === "takeaway"
                      ? "Takeaway Order"
                      : "Dine-in Order"}
                  </span>
                </div>
              )}
            </div>
          </section>

          <section className="pb-10">
            <div className="mx-auto grid w-[min(100%-2rem,1240px)] min-w-0 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
              <section className="min-w-0 rounded-3xl border border-[#EDE3D8] bg-white p-5 shadow-[0_18px_42px_rgba(50,30,15,.06)] sm:p-7">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#FFF1E5] text-[#C8102E]">
                    <FontAwesomeIcon icon={faBagShopping} className="h-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black uppercase">
                      Your Order Summary
                    </h2>
                    <p className="mt-1 text-[10px] text-[#655E57]">
                      Order #{result.orderId}
                    </p>
                  </div>
                </div>

                <div className="mt-6 divide-y divide-[#EDE3D8]">
                  {result.items.map((item) => (
                    <article
                      key={item.id}
                      className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)_44px_72px] items-center gap-3 py-4"
                    >
                      <MediaPlaceholder
                        label={`${item.name} image`}
                        className="aspect-square rounded-xl"
                      />

                      <div className="min-w-0">
                        <h3 className="truncate text-[11px] font-black">
                          {item.name}
                        </h3>
                        <p className="mt-1 text-[9px] text-[#655E57]">
                          {item.variant}
                        </p>
                        <p className="mt-1 text-[10px] font-bold">
                          ₹{item.unitPrice}
                        </p>
                      </div>

                      <span className="grid h-9 place-items-center rounded-lg border border-[#E5D9CD] bg-[#FFFDF9] text-xs font-black">
                        {item.quantity}
                      </span>

                      <strong className="text-right text-sm">
                        ₹{item.quantity * item.unitPrice}
                      </strong>
                    </article>
                  ))}
                </div>

                <div className="mt-5 space-y-3 border-t border-[#EDE3D8] pt-5 text-xs">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <strong>₹{result.subtotal}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>TRS Coins Discount</span>
                    <strong className="text-[#287238]">
                      -₹{result.coinDiscount}
                    </strong>
                  </div>
                  <div className="flex justify-between border-t border-[#EDE3D8] pt-3 text-base">
                    <span className="font-black">Total Amount</span>
                    <strong className="text-[#C8102E]">₹{result.total}</strong>
                  </div>
                </div>
              </section>

              <div className="min-w-0 space-y-5">
                <section className="rounded-3xl border border-[#EDE3D8] bg-white p-5 shadow-[0_18px_42px_rgba(50,30,15,.06)] sm:p-7">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FFF1E5] text-[#C8102E]">
                      <FontAwesomeIcon icon={faHeadset} className="h-5" />
                    </span>
                    <div>
                      <h2 className="text-lg font-black uppercase">
                        Need Help?
                      </h2>
                      <p className="mt-1 text-[10px] text-[#655E57]">
                        Contact the TRS team about your order.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <a
                      href="https://wa.me/919166694786"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 items-center justify-between rounded-2xl border border-[#EDE3D8] p-4 transition hover:border-[#25D366]"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <FontAwesomeIcon
                          icon={faWhatsapp}
                          className="h-6 shrink-0 text-[#25D366]"
                        />
                        <span className="min-w-0">
                          <strong className="block text-[10px] uppercase">
                            WhatsApp Us
                          </strong>
                          <span className="mt-1 block text-xs font-bold">
                            +91 91666 94786
                          </span>
                        </span>
                      </span>
                      <FontAwesomeIcon icon={faArrowRight} className="h-3" />
                    </a>

                    <a
                      href="tel:+917300052777"
                      className="flex min-w-0 items-center justify-between rounded-2xl border border-[#EDE3D8] p-4 transition hover:border-[#C8102E]"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <FontAwesomeIcon
                          icon={faPhone}
                          className="h-5 shrink-0 text-[#C8102E]"
                        />
                        <span className="min-w-0">
                          <strong className="block text-[10px] uppercase">
                            Call Us
                          </strong>
                          <span className="mt-1 block text-xs font-bold">
                            +91 73000 52777
                          </span>
                        </span>
                      </span>
                      <FontAwesomeIcon icon={faArrowRight} className="h-3" />
                    </a>
                  </div>
                </section>

                <section className="grid min-w-0 items-center gap-5 rounded-3xl border border-[#F0DFC8] bg-[#FFF7EA] p-5 sm:grid-cols-[minmax(0,1fr)_150px]">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[#C8102E]">
                      Earn TRS Coins
                    </p>
                    <h2 className="mt-2 text-xl font-black uppercase">
                      Save on future orders
                    </h2>
                    <p className="mt-3 text-[10px] leading-5 text-[#655E57]">
                      Earn 5 TRS Coins for every eligible ₹100 spent.
                    </p>
                    <Link
                      href="/rewards"
                      className="mt-4 inline-flex h-10 items-center gap-3 rounded-xl border border-[#C8102E] px-4 text-[9px] font-black uppercase text-[#C8102E] transition hover:bg-[#C8102E] hover:text-white"
                    >
                      View Rewards
                      <FontAwesomeIcon icon={faArrowRight} className="h-3" />
                    </Link>
                  </div>

                  <MediaPlaceholder
                    label="TRS Coins reward image"
                    className="aspect-square w-full rounded-2xl bg-[#FFF1E5]"
                  />
                </section>
              </div>
            </div>
          </section>

          <section className="pb-10">
            <div className="mx-auto grid w-[min(100%-2rem,1240px)] min-w-0 overflow-hidden rounded-3xl bg-[#112536] text-white shadow-[0_22px_50px_rgba(17,37,54,.18)] lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)]">
              <div className="flex min-w-0 flex-col justify-center p-7 sm:p-9">
                <p className="text-xl font-black italic text-[#FFD24D]">
                  Made Fresh. Served Hot.
                </p>
                <h2 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em]">
                  Thank You for Choosing TRS!
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/75">
                  We appreciate your order and look forward to serving you
                  again.
                </p>
                <Link
                  href="/menu"
                  className="mt-6 inline-flex h-11 w-fit items-center gap-3 rounded-xl bg-[#FFD24D] px-5 text-[10px] font-black uppercase text-[#2B2307]"
                >
                  Order Again
                  <FontAwesomeIcon icon={faRotate} className="h-3" />
                </Link>
              </div>

              <MediaPlaceholder
                label="TRS favourites banner image"
                className="min-h-[260px] rounded-none border-0 bg-white/10"
              />
            </div>
          </section>
        </>
      )}

      <section className="pb-14">
        <div className="mx-auto grid w-[min(100%-2rem,1240px)] min-w-0 gap-px overflow-hidden rounded-2xl border border-[#EDE3D8] bg-[#EDE3D8] shadow-[0_14px_32px_rgba(50,30,15,.05)] sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map(({ icon, title, text }) => (
            <article
              key={title}
              className="flex min-w-0 items-center gap-3 bg-white p-5"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#FFF1E5] text-[#D99219]">
                <FontAwesomeIcon icon={icon} className="h-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[10px] font-black uppercase">{title}</h2>
                <p className="mt-1 text-[9px] leading-4 text-[#655E57]">
                  {text}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
