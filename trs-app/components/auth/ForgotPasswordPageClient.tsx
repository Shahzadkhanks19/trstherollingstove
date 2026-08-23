"use client";

import type { FormEvent } from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRight,
  faCheck,
  faClock,
  faEnvelope,
  faLightbulb,
  faLock,
  faMobileScreenButton,
  faPaperPlane,
  faShieldHeart,
  faStore,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useState } from "react";
import { MediaPlaceholder } from "@/components/site/MediaPlaceholder";

type ResetMethod = "email" | "mobile";
type RequestStatus = "idle" | "submitting" | "success" | "error";

type TrustItem = {
  icon: IconDefinition;
  title: string;
  text: string;
};

const trustItems: TrustItem[] = [
  {
    icon: faUtensils,
    title: "100% Vegetarian",
    text: "Pure vegetarian menu",
  },
  {
    icon: faStore,
    title: "Dine-in or Takeaway",
    text: "Choose your order type",
  },
  {
    icon: faShieldHeart,
    title: "Secure Account",
    text: "Protected reset process",
  },
  {
    icon: faClock,
    title: "Quick Recovery",
    text: "Reset access securely",
  },
];

export function ForgotPasswordPageClient() {
  const [method, setMethod] = useState<ResetMethod>("email");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [message, setMessage] = useState("");

  const resetFeedback = (): void => {
    if (status !== "idle") {
      setStatus("idle");
      setMessage("");
    }
  };

  const submitRequest = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedMobile = mobile.replace(/\D/g, "");

    if (
      method === "email" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      setStatus("error");
      setMessage("Enter a valid registered email address.");
      return;
    }

    if (method === "mobile" && !/^[6-9]\d{9}$/.test(normalizedMobile)) {
      setStatus("error");
      setMessage("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          method === "email"
            ? {
                method: "email",
                email: normalizedEmail,
              }
            : {
                method: "mobile",
                phone: normalizedMobile,
              },
        ),
      });

      const data = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          data?.message ?? "Unable to process the reset request.",
        );
      }

      setStatus("success");
      setMessage(
        data?.message ??
          (method === "email"
            ? "If an account exists for this email, a reset link has been sent."
            : "If an account exists for this mobile number, a reset OTP has been sent."),
      );
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to process the reset request right now.",
      );
    }
  };

  return (
    <main className="overflow-x-hidden bg-[#FFFDF9] text-[#172536]">
      <section className="relative overflow-hidden border-b border-[#EDE3D8] bg-[linear-gradient(135deg,#FFFDF9,#FFF6EC)]">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(#E8A53A_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="relative mx-auto grid min-h-[680px] w-[min(100%-2rem,1240px)] min-w-0 items-center gap-8 py-12 lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)] lg:py-16">
          <section className="min-w-0 rounded-[2rem] border border-[#EDE3D8] bg-white/80 p-5 shadow-[0_18px_42px_rgba(50,30,15,.06)] backdrop-blur-sm sm:p-8">
            <span className="grid h-16 w-16 place-items-center rounded-full border border-[#E8D8C9] bg-[#FFF7EE] text-[#C8102E]">
              <FontAwesomeIcon icon={faLock} className="h-7" />
            </span>

            <div className="mt-6 inline-flex items-center gap-3 text-sm font-black italic text-[#C8102E]">
              <span className="h-px w-10 bg-[#E8A53A]" />
              Secure Account Recovery
            </div>

            <h1 className="mt-5 max-w-[620px] break-words text-[clamp(2.9rem,7vw,5.4rem)] font-black uppercase leading-[.9] tracking-[-0.055em] text-[#14283B]">
              Forgot Your
              <br />
              <span className="text-[#C8102E]">Password?</span>
            </h1>

            <p className="mt-6 max-w-[560px] text-base leading-8 text-[#4F4943]">
              Enter your registered email address or mobile number and we will
              help you securely regain access to your TRS account.
            </p>

            <MediaPlaceholder
              label="TRS forgot-password illustration"
              className="mt-8 min-h-[220px] rounded-[1.75rem] border-[#E8D8C9] bg-[linear-gradient(135deg,#FFF4E3,#F5D5B3)]"
            />

            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#F0DFC8] bg-[#FFF7EA] p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#D99219]">
                <FontAwesomeIcon icon={faShieldHeart} className="h-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[10px] font-black uppercase">
                  Secure &amp; Trusted
                </h2>
                <p className="mt-1 text-[9px] leading-4 text-[#655E57]">
                  We never ask for your password, OTP or payment PIN through
                  email, phone or WhatsApp.
                </p>
              </div>
            </div>
          </section>

          <section className="min-w-0 rounded-[2rem] border border-[#EDE3D8] bg-white p-5 shadow-[0_24px_64px_rgba(50,30,15,.09)] sm:p-8 lg:p-10">
            <div className="text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#FFF1E5] text-[#C8102E]">
                <FontAwesomeIcon icon={faEnvelope} className="h-7" />
              </span>

              <h2 className="mt-5 text-2xl font-black uppercase tracking-[-0.04em] sm:text-3xl">
                Reset Your Password
              </h2>

              <div className="mx-auto mt-4 flex max-w-[180px] items-center gap-3">
                <span className="h-px flex-1 bg-[#E8A53A]" />
                <span className="text-[#E8A53A]">★</span>
                <span className="h-px flex-1 bg-[#E8A53A]" />
              </div>

              <p className="mx-auto mt-4 max-w-[560px] text-[11px] leading-6 text-[#655E57]">
                Choose how you want to receive the password reset instructions.
              </p>
            </div>

            <div className="mt-7 grid grid-cols-2 overflow-hidden rounded-xl border border-[#E5D9CD] bg-[#FFFDF9]">
              <button
                type="button"
                onClick={() => {
                  setMethod("email");
                  resetFeedback();
                }}
                className={`flex h-12 items-center justify-center gap-2 border-b-2 text-[9px] font-black uppercase transition ${
                  method === "email"
                    ? "border-[#C8102E] bg-white text-[#C8102E]"
                    : "border-transparent text-[#655E57]"
                }`}
              >
                <FontAwesomeIcon icon={faEnvelope} className="h-4" />
                Email
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod("mobile");
                  resetFeedback();
                }}
                className={`flex h-12 items-center justify-center gap-2 border-b-2 text-[9px] font-black uppercase transition ${
                  method === "mobile"
                    ? "border-[#C8102E] bg-white text-[#C8102E]"
                    : "border-transparent text-[#655E57]"
                }`}
              >
                <FontAwesomeIcon
                  icon={faMobileScreenButton}
                  className="h-4"
                />
                Mobile Number
              </button>
            </div>

            <form onSubmit={submitRequest} className="mt-7">
              {method === "email" ? (
                <label className="block text-[9px] font-black uppercase">
                  Registered Email Address
                  <div className="relative mt-2">
                    <FontAwesomeIcon
                      icon={faEnvelope}
                      className="pointer-events-none absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#8E857D]"
                    />
                    <input
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        resetFeedback();
                      }}
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your email address"
                      className="h-12 w-full min-w-0 rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] pl-11 pr-4 text-sm font-medium normal-case outline-none transition focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10"
                    />
                  </div>
                </label>
              ) : (
                <label className="block text-[9px] font-black uppercase">
                  Registered Mobile Number
                  <div className="relative mt-2">
                    <FontAwesomeIcon
                      icon={faMobileScreenButton}
                      className="pointer-events-none absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#8E857D]"
                    />
                    <input
                      value={mobile}
                      onChange={(event) => {
                        setMobile(
                          event.target.value.replace(/\D/g, "").slice(0, 10),
                        );
                        resetFeedback();
                      }}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="Enter your 10-digit mobile number"
                      className="h-12 w-full min-w-0 rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] pl-11 pr-4 text-sm font-medium normal-case outline-none transition focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10"
                    />
                  </div>
                  <span className="mt-2 block text-[9px] font-medium normal-case leading-4 text-[#655E57]">Enter exactly 10 digits without +91, spaces or dashes.</span>
                </label>
              )}

              {message && (
                <div
                  role={status === "error" ? "alert" : "status"}
                  className={`mt-4 rounded-xl border px-4 py-3 text-[10px] font-semibold leading-5 ${
                    status === "success"
                      ? "border-[#B8DFC0] bg-[#F1FBF3] text-[#287238]"
                      : "border-[#F1C6C6] bg-[#FFF3F3] text-[#A50E27]"
                  }`}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#C8102E] px-6 text-[10px] font-black uppercase text-white shadow-[0_14px_32px_rgba(200,16,46,.2)] transition hover:bg-[#A50E27] disabled:cursor-not-allowed disabled:opacity-65"
              >
                {status === "submitting"
                  ? "Sending..."
                  : method === "email"
                    ? "Send Reset Link"
                    : "Send Reset OTP"}
                <FontAwesomeIcon icon={faPaperPlane} className="h-3" />
              </button>
            </form>

            <div className="my-6 flex items-center gap-4">
              <span className="h-px flex-1 bg-[#EDE3D8]" />
              <span className="text-[9px] font-black uppercase text-[#8A8179]">
                Helpful Information
              </span>
              <span className="h-px flex-1 bg-[#EDE3D8]" />
            </div>

            <section className="rounded-2xl border border-[#F0DFC8] bg-[#FFF7EA] p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#D99219]">
                  <FontAwesomeIcon icon={faLightbulb} className="h-4" />
                </span>
                <h3 className="text-[10px] font-black uppercase">
                  Before You Retry
                </h3>
              </div>

              <div className="mt-4 grid gap-3">
                {[
                  "Check your inbox, spam or promotions folder.",
                  "Reset links and OTPs expire after a limited period.",
                  "Never share the OTP or reset link with another person.",
                  "Use Contact Support if you no longer have access to the registered email or mobile number.",
                ].map((item) => (
                  <p
                    key={item}
                    className="flex gap-3 text-[9px] leading-4 text-[#655E57]"
                  >
                    <FontAwesomeIcon
                      icon={faCheck}
                      className="mt-0.5 h-3 shrink-0 text-[#287238]"
                    />
                    {item}
                  </p>
                ))}
              </div>
            </section>
          </section>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto flex w-[min(100%-2rem,1240px)] min-w-0 flex-col gap-5 rounded-[2rem] border border-[#E8D8C9] bg-[linear-gradient(135deg,#FFF8ED,#FFF1E2)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-[#C8102E]">
              <FontAwesomeIcon icon={faArrowLeft} className="h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#C8102E]">
                Remember Your Password?
              </p>
              <p className="mt-2 text-[10px] leading-5 text-[#655E57]">
                Return to login and continue ordering your favourites.
              </p>
            </div>
          </div>

          <Link
            href="/login"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-3 rounded-xl border border-[#C8102E] bg-white px-5 text-[9px] font-black uppercase text-[#C8102E] transition hover:bg-[#C8102E] hover:text-white"
          >
            Back to Login
            <FontAwesomeIcon icon={faArrowRight} className="h-3" />
          </Link>
        </div>
      </section>

      <section className="pb-14">
        <div className="mx-auto grid w-[min(100%-2rem,1240px)] grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#EDE3D8] bg-[#EDE3D8] shadow-[0_14px_32px_rgba(50,30,15,.05)] lg:grid-cols-4">
          {trustItems.map(({ icon, title, text }) => (
            <article
              key={title}
              className="flex min-w-0 items-center gap-2.5 bg-white p-3 sm:gap-3 sm:p-5"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FFF1E5] text-[#D99219] sm:h-11 sm:w-11">
                <FontAwesomeIcon icon={icon} className="h-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[8px] font-black uppercase text-[#172536] sm:text-[9px]">
                  {title}
                </h2>
                <p className="mt-1 text-[7px] leading-3 text-[#655E57] sm:text-[8px]">
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
