"use client";

import type { FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faEnvelope,
  faEye,
  faEyeSlash,
  faLock,
  faPhone,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useState } from "react";
import { AuthBenefitsPanel } from "@/components/auth/AuthBenefitsPanel";
import { AuthTrustStrip } from "@/components/auth/AuthTrustStrip";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";

type SignupForm = {
  name: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

const initialSignupForm: SignupForm = {
  name: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
};

export function SignupPageClient() {
  const [form, setForm] = useState<SignupForm>(initialSignupForm);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [referralCode] = useState(() =>
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase() ?? "",
  );

  const updateField = <Key extends keyof SignupForm>(
    field: Key,
    value: SignupForm[Key],
  ): void => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (form.name.trim().length < 2) {
      setStatus("error");
      setMessage("Please enter your full name.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
      setStatus("error");
      setMessage("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }

    if (form.password.length < 10) {
      setStatus("error");
      setMessage("Password must contain at least 10 characters.");
      return;
    }

    if (!/[A-Z]/.test(form.password)) {
      setStatus("error");
      setMessage("Password must include at least one uppercase letter.");
      return;
    }

    if (!/[a-z]/.test(form.password)) {
      setStatus("error");
      setMessage("Password must include at least one lowercase letter.");
      return;
    }

    if (!/\d/.test(form.password)) {
      setStatus("error");
      setMessage("Password must include at least one number.");
      return;
    }

    if (!/[^A-Za-z0-9]/.test(form.password)) {
      setStatus("error");
      setMessage("Password must include at least one special character.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    if (!form.acceptTerms) {
      setStatus("error");
      setMessage("Please accept the Terms and Privacy Policy.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          password: form.password,
          ...(referralCode ? { referralCode } : {}),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            message?: string;
            errors?: Array<{ field?: string; message?: string }>;
          }
        | null;

      if (!response.ok) {
        const validationMessage = payload?.errors?.find(
          (error) => typeof error.message === "string" && error.message.length > 0,
        )?.message;

        throw new Error(
          validationMessage ?? payload?.message ?? "Signup failed.",
        );
      }

      setStatus("success");
      setMessage(
        payload?.message ??
          "Account created successfully. Please verify your email before logging in.",
      );
      window.setTimeout(() => {
        window.location.assign("/login");
      }, 1200);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "We could not create your account. Please try again.",
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
                Join <span className="text-[#C8102E]">TRS!</span>
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#655E57]">
                Create an account to earn coins, access rewards and check out
                faster.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 border-b border-[#E5D9CD]">
              <Link
                href="/login"
                className="pb-3 text-center text-xs font-black uppercase text-[#2B2622] transition hover:text-[#C8102E]"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="border-b-2 border-[#C8102E] pb-3 text-center text-xs font-black uppercase text-[#C8102E]"
              >
                Sign Up
              </Link>
            </div>

            <form onSubmit={submitSignup} className="mt-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-[10px] font-black">
                  Full Name
                  <div className="relative mt-2">
                    <FontAwesomeIcon
                      icon={faUser}
                      className="absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#7B746D]"
                    />
                    <input
                      value={form.name}
                      onChange={(event) =>
                        updateField("name", event.target.value)
                      }
                      autoComplete="name"
                      placeholder="Enter your full name"
                      className="h-12 w-full rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] pl-11 pr-4 text-sm outline-none transition placeholder:text-[#9C938A] focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10"
                    />
                  </div>
                </label>

                <label className="block text-[10px] font-black">
                  Phone Number
                  <div className="relative mt-2">
                    <FontAwesomeIcon
                      icon={faPhone}
                      className="absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#7B746D]"
                    />
                    <input
                      value={form.phone}
                      onChange={(event) =>
                        updateField(
                          "phone",
                          event.target.value.replace(/\D/g, "").slice(0, 10),
                        )
                      }
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="Enter mobile number"
                      className="h-12 w-full rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] pl-11 pr-4 text-sm outline-none transition placeholder:text-[#9C938A] focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10"
                    />
                  </div>
                </label>
              </div>

              <label className="mt-4 block text-[10px] font-black">
                Email Address
                <div className="relative mt-2">
                  <FontAwesomeIcon
                    icon={faEnvelope}
                    className="absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#7B746D]"
                  />
                  <input
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your email"
                    className="h-12 w-full rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] pl-11 pr-4 text-sm outline-none transition placeholder:text-[#9C938A] focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10"
                  />
                </div>
              </label>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-[10px] font-black">
                  Password
                  <div className="relative mt-2">
                    <FontAwesomeIcon
                      icon={faLock}
                      className="absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#7B746D]"
                    />
                    <input
                      value={form.password}
                      onChange={(event) =>
                        updateField("password", event.target.value)
                      }
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Enter a strong password"
                      className="h-12 w-full rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] pl-11 pr-12 text-sm outline-none transition placeholder:text-[#9C938A] focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-4 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-[#655E57]"
                    >
                      <FontAwesomeIcon
                        icon={showPassword ? faEyeSlash : faEye}
                        className="h-4"
                      />
                    </button>
                  </div>
                  <span className="mt-2 block text-[9px] font-medium normal-case leading-4 text-[#7B746D]">Use 10–128 characters with uppercase, lowercase, a number and a special character.</span>
                </label>

                <label className="block text-[10px] font-black">
                  Confirm Password
                  <div className="relative mt-2">
                    <FontAwesomeIcon
                      icon={faLock}
                      className="absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#7B746D]"
                    />
                    <input
                      value={form.confirmPassword}
                      onChange={(event) =>
                        updateField("confirmPassword", event.target.value)
                      }
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Confirm password"
                      className="h-12 w-full rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] pl-11 pr-4 text-sm outline-none transition placeholder:text-[#9C938A] focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10"
                    />
                  </div>
                </label>
              </div>

              <label className="mt-5 flex items-start gap-3 text-[10px] leading-5 text-[#655E57]">
                <input
                  checked={form.acceptTerms}
                  onChange={(event) =>
                    updateField("acceptTerms", event.target.checked)
                  }
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#C8102E]"
                />
                <span>
                  I agree to the{" "}
                  <Link href="/terms" className="font-black text-[#C8102E]">
                    Terms &amp; Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="font-black text-[#C8102E]">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>

              {message && (
                <div
                  role={status === "error" ? "alert" : "status"}
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
                {status === "loading" ? "Creating Account..." : "Create Account"}
                <FontAwesomeIcon icon={faArrowRight} className="h-3" />
              </button>
            </form>

            <SocialAuthButtons mode="signup" />

            <p className="mt-7 text-center text-xs text-[#655E57]">
              Already have an account?{" "}
              <Link href="/login" className="font-black text-[#C8102E]">
                Login
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
