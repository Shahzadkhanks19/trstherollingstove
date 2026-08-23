"use client";

import type { FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faEye,
  faEyeSlash,
  faLock,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useState } from "react";

import { AuthBenefitsPanel } from "@/components/auth/AuthBenefitsPanel";
import { AuthTrustStrip } from "@/components/auth/AuthTrustStrip";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { mergeGuestCart } from "@/lib/cart-client";

type LoginResponse = {
  success?: boolean;
  message?: string;

  errors?: Array<{
    path?: Array<string | number | symbol>;
    message?: string;
  }>;

  error?: {
    code?: string;
    message?: string;

    details?: Array<{
      path?: Array<string | number | symbol>;
      message?: string;
    }>;
  };
};

function getLoginErrorMessage(
  data: LoginResponse | null,
): string {
  return (
    data?.errors?.[0]?.message ??
    data?.error?.details?.[0]?.message ??
    data?.error?.message ??
    data?.message ??
    "Login failed."
  );
}

export function LoginPageClient() {
  const [identifier, setIdentifier] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [rememberMe, setRememberMe] =
    useState(true);

  const [showPassword, setShowPassword] =
    useState(false);

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const [message, setMessage] =
    useState("");

  const submitLogin = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    const normalizedIdentifier =
      identifier.trim();

    if (normalizedIdentifier.length < 5) {
      setStatus("error");
      setMessage(
        "Enter your registered phone number or email.",
      );
      return;
    }

    if (password.length < 1) {
      setStatus("error");
      setMessage("Enter your password.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch(
        "/api/v1/auth/login",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            identifier: normalizedIdentifier,
            password,
            rememberMe,
          }),
        },
      );

      const data =
        (await response
          .json()
          .catch(() => null)) as LoginResponse | null;

      if (!response.ok) {
        throw new Error(
          getLoginErrorMessage(data),
        );
      }

 try {
  await mergeGuestCart();
} catch (cartError) {
  console.error(
    "Guest cart merge failed after login:",
    cartError,
  );
}

const requestedReturn =
  new URLSearchParams(
    window.location.search,
  ).get("returnTo");

const safeReturn =
  requestedReturn?.startsWith("/") &&
  !requestedReturn.startsWith("//") &&
  requestedReturn !== "/login" &&
  requestedReturn !== "/signup" &&
  requestedReturn !==
    "/customer-dashboard"
    ? requestedReturn
    : "/";

setStatus("success");
setMessage("Login successful.");

window.location.assign(
  safeReturn,
);
    } catch (error) {
      setStatus("error");

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to login right now. Please try again.",
      );
    }
  };

  return (
    <main className="overflow-x-hidden bg-[#FFFDF9] text-[#172536]">
      <section className="px-4 py-10 sm:px-6 lg:py-14">
        <div className="mx-auto grid w-full max-w-[1180px] min-w-0 overflow-hidden rounded-[2rem] border border-[#EDE3D8] bg-white shadow-[0_24px_70px_rgba(50,30,15,.1)] lg:grid-cols-2">
          <section className="min-w-0 p-6 sm:p-10 lg:p-12">
            <div>
              <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Welcome{" "}
                <span className="text-[#C8102E]">
                  Back!
                </span>
              </h1>

              <p className="mt-3 text-sm leading-6 text-[#655E57]">
                Login to continue enjoying delicious
                food and exclusive rewards.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 border-b border-[#E5D9CD]">
              <Link
                href="/login"
                className="border-b-2 border-[#C8102E] pb-3 text-center text-xs font-black uppercase text-[#C8102E]"
              >
                Login
              </Link>

              <Link
                href="/signup"
                className="pb-3 text-center text-xs font-black uppercase text-[#2B2622] transition hover:text-[#C8102E]"
              >
                Sign Up
              </Link>
            </div>

            <form
              onSubmit={submitLogin}
              className="mt-8"
            >
              <label className="block text-[10px] font-black">
                Phone Number or Email

                <div className="relative mt-2">
                  <FontAwesomeIcon
                    icon={faUser}
                    className="absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#7B746D]"
                  />

                  <input
                    value={identifier}
                    onChange={(event) => {
                      setIdentifier(
                        event.target.value,
                      );

                      if (status === "error") {
                        setStatus("idle");
                        setMessage("");
                      }
                    }}
                    autoComplete="username"
                    inputMode="email"
                    placeholder="Enter your phone number or email"
                    className="h-12 w-full rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] pl-11 pr-4 text-sm outline-none transition placeholder:text-[#9C938A] focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10"
                  />
                </div>
              </label>

              <label className="mt-5 block text-[10px] font-black">
                Password

                <div className="relative mt-2">
                  <FontAwesomeIcon
                    icon={faLock}
                    className="absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#7B746D]"
                  />

                  <input
                    value={password}
                    onChange={(event) => {
                      setPassword(
                        event.target.value,
                      );

                      if (status === "error") {
                        setStatus("idle");
                        setMessage("");
                      }
                    }}
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="h-12 w-full rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] pl-11 pr-12 text-sm outline-none transition placeholder:text-[#9C938A] focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current,
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    className="absolute right-4 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-[#655E57]"
                  >
                    <FontAwesomeIcon
                      icon={
                        showPassword
                          ? faEyeSlash
                          : faEye
                      }
                      className="h-4"
                    />
                  </button>
                </div>
              </label>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[10px]">
                <label className="flex items-center gap-2 font-semibold text-[#4F4943]">
                  <input
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(
                        event.target.checked,
                      )
                    }
                    type="checkbox"
                    className="h-4 w-4 accent-[#C8102E]"
                  />

                  Remember me
                </label>

                <Link
                  href="/forgot-password"
                  className="font-black text-[#C8102E] transition hover:text-[#A50E27]"
                >
                  Forgot Password?
                </Link>
              </div>

              {message && (
                <div
                  role={
                    status === "error"
                      ? "alert"
                      : "status"
                  }
                  className={`mt-5 rounded-xl border px-4 py-3 text-xs font-semibold ${
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
                disabled={status === "loading"}
                className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#C8102E] px-6 text-[11px] font-black uppercase text-white shadow-[0_12px_28px_rgba(200,16,46,.22)] transition hover:-translate-y-0.5 hover:bg-[#A50E27] disabled:cursor-not-allowed disabled:opacity-65"
              >
                {status === "loading"
                  ? "Logging In..."
                  : "Login"}

                <FontAwesomeIcon
                  icon={faArrowRight}
                  className="h-3"
                />
              </button>
            </form>

            <SocialAuthButtons mode="login" />

            <p className="mt-7 text-center text-xs text-[#655E57]">
              Don&apos;t have an account?{" "}

              <Link
                href="/signup"
                className="font-black text-[#C8102E]"
              >
                Sign up
              </Link>
            </p>
          </section>

          <AuthBenefitsPanel />
        </div>
      </section>

      <AuthTrustStrip />
    </main>
  );
}