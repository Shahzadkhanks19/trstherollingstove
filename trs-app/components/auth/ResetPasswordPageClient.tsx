"use client";

import type { FormEvent } from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRight,
  faCheck,
  faCircleExclamation,
  faClock,
  faEye,
  faEyeSlash,
  faKey,
  faLock,
  faMobileScreenButton,
  faPaperPlane,
  faShieldHeart,
  faStore,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { MediaPlaceholder } from "@/components/site/MediaPlaceholder";

type ResetMethod = "email" | "mobile";
type ResetStage = "verify-otp" | "create-password" | "completed";
type RequestStatus = "idle" | "submitting" | "success" | "error";

type TrustItem = {
  icon: IconDefinition;
  title: string;
  text: string;
};

type PasswordRule = {
  label: string;
  passed: boolean;
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
    title: "Secure Recovery",
    text: "Protected reset process",
  },
  {
    icon: faClock,
    title: "Short-Lived Access",
    text: "Links and OTPs expire",
  },
];

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.length < 4) return "your registered mobile number";

  return `******${digits.slice(-4)}`;
}

function getPasswordScore(password: string): number {
  return [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
}

function getStrengthLabel(score: number): string {
  if (score <= 1) return "Very weak";
  if (score === 2) return "Weak";
  if (score === 3) return "Fair";
  if (score === 4) return "Strong";
  return "Very strong";
}

export function ResetPasswordPageClient() {
  const searchParams = useSearchParams();

  const method: ResetMethod =
    searchParams.get("method") === "mobile" ? "mobile" : "email";

  const emailToken = searchParams.get("token") ?? "";
  const requestedPhone = searchParams.get("phone") ?? "";

  const hasEmailToken = method === "email" && emailToken.length > 0;

  const [stage, setStage] = useState<ResetStage>(
    method === "mobile" ? "verify-otp" : "create-password",
  );
  const [resetToken, setResetToken] = useState(
    method === "email" ? emailToken : "",
  );

  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [status, setStatus] = useState<RequestStatus>("idle");
  const [message, setMessage] = useState("");

  const passwordRules = useMemo<PasswordRule[]>(
    () => [
      {
        label: "At least 8 characters",
        passed: password.length >= 8,
      },
      {
        label: "One uppercase letter (A–Z)",
        passed: /[A-Z]/.test(password),
      },
      {
        label: "One lowercase letter (a–z)",
        passed: /[a-z]/.test(password),
      },
      {
        label: "One number (0–9)",
        passed: /\d/.test(password),
      },
      {
        label: "One special character",
        passed: /[^A-Za-z0-9]/.test(password),
      },
    ],
    [password],
  );

  const passwordScore = getPasswordScore(password);
  const passwordValid = passwordRules.every((rule) => rule.passed);
  const passwordsMatch =
    confirmPassword.length > 0 && confirmPassword === password;

  const resetFeedback = (): void => {
    if (status !== "idle") {
      setStatus("idle");
      setMessage("");
    }
  };

  const verifyOtp = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    const normalizedPhone = requestedPhone.replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      setStatus("error");
      setMessage(
        "The mobile reset request is incomplete. Start again from Forgot Password.",
      );
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setStatus("error");
      setMessage("Enter the 6-digit OTP sent to your registered mobile number.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/v1/auth/verify-reset-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: normalizedPhone,
          otp,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            message?: string;
            resetToken?: string;
          }
        | null;

      if (!response.ok || !data?.resetToken) {
        throw new Error(
          data?.message ?? "The OTP is invalid or has expired.",
        );
      }

      setResetToken(data.resetToken);
      setStage("create-password");
      setStatus("success");
      setMessage("Mobile number verified. Create your new password.");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The OTP could not be verified.",
      );
    }
  };

  const submitNewPassword = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    if (!resetToken) {
      setStatus("error");
      setMessage(
        method === "email"
          ? "This reset link is missing or invalid. Request a new reset link."
          : "Verify the mobile OTP before creating a new password.",
      );
      return;
    }

    if (!passwordValid) {
      setStatus("error");
      setMessage("Create a password that meets all security requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("The new password and confirmation do not match.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
  token: resetToken,
  newPassword: password,
}),
      });

      const data = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          data?.message ?? "The password could not be reset.",
        );
      }

      setStage("completed");
      setStatus("success");
      setMessage(
        data?.message ??
          "Your password has been reset successfully. You can now log in.",
      );
      setPassword("");
      setConfirmPassword("");
      setOtp("");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The password could not be reset right now.",
      );
    }
  };

  const resendOtp = async (): Promise<void> => {
    const normalizedPhone = requestedPhone.replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      setStatus("error");
      setMessage("Start a new mobile reset request from Forgot Password.");
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
        body: JSON.stringify({
          method: "mobile",
          phone: normalizedPhone,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.message ?? "Unable to resend the OTP.");
      }

      setStatus("success");
      setMessage(
        data?.message ??
          "If an account exists for this number, a new OTP has been sent.",
      );
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to resend the OTP.",
      );
    }
  };

  const invalidEmailLink = method === "email" && !hasEmailToken;

  return (
    <main className="overflow-x-hidden bg-[#FFFDF9] text-[#172536]">
      <section className="relative overflow-hidden border-b border-[#EDE3D8] bg-[linear-gradient(135deg,#FFFDF9,#FFF6EC)]">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(#E8A53A_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="relative mx-auto grid min-h-[720px] w-[min(100%-2rem,1240px)] min-w-0 items-center gap-8 py-12 lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)] lg:py-16">
          <section className="min-w-0 rounded-[2rem] border border-[#EDE3D8] bg-white/80 p-5 shadow-[0_18px_42px_rgba(50,30,15,.06)] backdrop-blur-sm sm:p-8">
            <span className="grid h-16 w-16 place-items-center rounded-full border border-[#E8D8C9] bg-[#FFF7EE] text-[#C8102E]">
              <FontAwesomeIcon icon={faKey} className="h-7" />
            </span>

            <div className="mt-6 inline-flex items-center gap-3 text-sm font-black italic text-[#C8102E]">
              <span className="h-px w-10 bg-[#E8A53A]" />
              Almost There
            </div>

            <h1 className="mt-5 max-w-[620px] break-words text-[clamp(2.9rem,7vw,5.4rem)] font-black uppercase leading-[.9] tracking-[-0.055em] text-[#14283B]">
              Reset Your
              <br />
              <span className="text-[#C8102E]">Password</span>
            </h1>

            <p className="mt-6 max-w-[560px] text-base leading-8 text-[#4F4943]">
              {method === "email"
                ? "Your email reset link securely authorises this password change."
                : "Verify the OTP sent to your registered mobile number, then create a strong new password."}
            </p>

            <MediaPlaceholder
              label="TRS reset-password illustration"
              className="mt-8 min-h-[230px] rounded-[1.75rem] border-[#E8D8C9] bg-[linear-gradient(135deg,#FFF4E3,#F5D5B3)]"
            />

            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#F0DFC8] bg-[#FFF7EA] p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#D99219]">
                <FontAwesomeIcon icon={faShieldHeart} className="h-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[10px] font-black uppercase">
                  Secure &amp; Protected
                </h2>
                <p className="mt-1 text-[9px] leading-4 text-[#655E57]">
                  Reset tokens and OTPs must be short-lived, single-use and
                  stored securely by the backend.
                </p>
              </div>
            </div>
          </section>

          <section className="min-w-0 rounded-[2rem] border border-[#EDE3D8] bg-white p-5 shadow-[0_24px_64px_rgba(50,30,15,.09)] sm:p-8 lg:p-10">
            {stage === "completed" ? (
              <div className="py-8 text-center">
                <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#F1FBF3] text-[#287238]">
                  <FontAwesomeIcon icon={faCheck} className="h-8" />
                </span>
                <h2 className="mt-6 text-2xl font-black uppercase tracking-[-0.04em] sm:text-3xl">
                  Password Reset Complete
                </h2>
                <p className="mx-auto mt-4 max-w-[520px] text-[11px] leading-6 text-[#655E57]">
                  {message}
                </p>
                <Link
                  href="/login"
                  className="mt-7 inline-flex h-12 items-center gap-3 rounded-xl bg-[#C8102E] px-6 text-[10px] font-black uppercase text-white"
                >
                  Continue to Login
                  <FontAwesomeIcon icon={faArrowRight} className="h-3" />
                </Link>
              </div>
            ) : invalidEmailLink ? (
              <div className="py-8 text-center">
                <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#FFF3F3] text-[#C8102E]">
                  <FontAwesomeIcon
                    icon={faCircleExclamation}
                    className="h-8"
                  />
                </span>
                <h2 className="mt-6 text-2xl font-black uppercase tracking-[-0.04em] sm:text-3xl">
                  Invalid Reset Link
                </h2>
                <p className="mx-auto mt-4 max-w-[520px] text-[11px] leading-6 text-[#655E57]">
                  This email reset link is missing, invalid or has expired.
                  Request a fresh link to continue.
                </p>
                <Link
                  href="/forgot-password"
                  className="mt-7 inline-flex h-12 items-center gap-3 rounded-xl bg-[#C8102E] px-6 text-[10px] font-black uppercase text-white"
                >
                  Request New Link
                  <FontAwesomeIcon icon={faArrowRight} className="h-3" />
                </Link>
              </div>
            ) : stage === "verify-otp" ? (
              <>
                <div className="text-center">
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#FFF1E5] text-[#C8102E]">
                    <FontAwesomeIcon
                      icon={faMobileScreenButton}
                      className="h-7"
                    />
                  </span>
                  <h2 className="mt-5 text-2xl font-black uppercase tracking-[-0.04em] sm:text-3xl">
                    Verify Mobile OTP
                  </h2>
                  <p className="mx-auto mt-4 max-w-[520px] text-[11px] leading-6 text-[#655E57]">
                    Enter the 6-digit OTP sent to {maskPhone(requestedPhone)}.
                  </p>
                </div>

                <form onSubmit={verifyOtp} className="mt-7">
                  <label className="block text-[9px] font-black uppercase">
                    Reset OTP
                    <div className="relative mt-2">
                      <FontAwesomeIcon
                        icon={faKey}
                        className="pointer-events-none absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#8E857D]"
                      />
                      <input
                        value={otp}
                        onChange={(event) => {
                          setOtp(
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                          );
                          resetFeedback();
                        }}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="Enter 6-digit OTP"
                        className="h-12 w-full rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] pl-11 pr-4 text-center text-lg font-black tracking-[0.35em] outline-none transition focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10"
                      />
                    </div>
                  </label>

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
                    {status === "submitting" ? "Verifying..." : "Verify OTP"}
                    <FontAwesomeIcon icon={faArrowRight} className="h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={resendOtp}
                    disabled={status === "submitting"}
                    className="mt-3 flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-[#C8102E] bg-white px-5 text-[9px] font-black uppercase text-[#C8102E] transition hover:bg-[#C8102E] hover:text-white disabled:opacity-60"
                  >
                    Resend OTP
                    <FontAwesomeIcon icon={faPaperPlane} className="h-3" />
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="text-center">
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#FFF1E5] text-[#C8102E]">
                    <FontAwesomeIcon icon={faLock} className="h-7" />
                  </span>

                  <h2 className="mt-5 text-2xl font-black uppercase tracking-[-0.04em] sm:text-3xl">
                    Create New Password
                  </h2>

                  <div className="mx-auto mt-4 flex max-w-[180px] items-center gap-3">
                    <span className="h-px flex-1 bg-[#E8A53A]" />
                    <span className="text-[#E8A53A]">★</span>
                    <span className="h-px flex-1 bg-[#E8A53A]" />
                  </div>

                  <p className="mx-auto mt-4 max-w-[520px] text-[11px] leading-6 text-[#655E57]">
                    Create a strong password that you have not used before.
                  </p>
                </div>

                <form onSubmit={submitNewPassword} className="mt-7">
                  <label className="block text-[9px] font-black uppercase">
                    New Password
                    <div className="relative mt-2">
                      <FontAwesomeIcon
                        icon={faLock}
                        className="pointer-events-none absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#8E857D]"
                      />
                      <input
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          resetFeedback();
                        }}
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Enter your new password"
                        className="h-12 w-full rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] pl-11 pr-12 text-sm font-medium normal-case outline-none transition focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#655E57]"
                      >
                        <FontAwesomeIcon
                          icon={showPassword ? faEyeSlash : faEye}
                          className="h-4"
                        />
                      </button>
                    </div>
                    <span className="mt-2 block text-[9px] font-medium normal-case leading-4 text-[#655E57]">Use 10–128 characters with uppercase, lowercase, a number and a special character.</span>
                  </label>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <span className="text-[9px] font-semibold text-[#655E57]">
                      Password strength:
                    </span>
                    <strong
                      className={`text-[9px] ${
                        passwordScore >= 4
                          ? "text-[#287238]"
                          : passwordScore >= 3
                            ? "text-[#D99219]"
                            : "text-[#C8102E]"
                      }`}
                    >
                      {getStrengthLabel(passwordScore)}
                    </strong>
                    <div className="flex flex-1 gap-1.5">
                      {[1, 2, 3, 4, 5].map((segment) => (
                        <span
                          key={segment}
                          className={`h-1.5 flex-1 rounded-full ${
                            passwordScore >= segment
                              ? passwordScore >= 4
                                ? "bg-[#287238]"
                                : passwordScore >= 3
                                  ? "bg-[#D99219]"
                                  : "bg-[#C8102E]"
                              : "bg-[#E5E0DA]"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <label className="mt-5 block text-[9px] font-black uppercase">
                    Confirm New Password
                    <div className="relative mt-2">
                      <FontAwesomeIcon
                        icon={faLock}
                        className="pointer-events-none absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#8E857D]"
                      />
                      <input
                        value={confirmPassword}
                        onChange={(event) => {
                          setConfirmPassword(event.target.value);
                          resetFeedback();
                        }}
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Confirm your new password"
                        className="h-12 w-full rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] pl-11 pr-12 text-sm font-medium normal-case outline-none transition focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword((current) => !current)
                        }
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirmation password"
                            : "Show confirmation password"
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#655E57]"
                      >
                        <FontAwesomeIcon
                          icon={showConfirmPassword ? faEyeSlash : faEye}
                          className="h-4"
                        />
                      </button>
                    </div>
                  </label>

                  <section className="mt-5 rounded-2xl border border-[#D6E7D8] bg-[#F4FAF5] p-4">
                    <h3 className="text-[10px] font-black uppercase text-[#287238]">
                      Your Password Must Include
                    </h3>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {passwordRules.map(({ label, passed }) => (
                        <p
                          key={label}
                          className={`flex gap-2 text-[9px] leading-4 ${
                            passed ? "text-[#287238]" : "text-[#655E57]"
                          }`}
                        >
                          <span
                            className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ${
                              passed
                                ? "bg-[#287238] text-white"
                                : "border border-[#BEB7AF] bg-white text-transparent"
                            }`}
                          >
                            <FontAwesomeIcon icon={faCheck} className="h-2" />
                          </span>
                          {label}
                        </p>
                      ))}

                      <p
                        className={`flex gap-2 text-[9px] leading-4 ${
                          passwordsMatch ? "text-[#287238]" : "text-[#655E57]"
                        }`}
                      >
                        <span
                          className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ${
                            passwordsMatch
                              ? "bg-[#287238] text-white"
                              : "border border-[#BEB7AF] bg-white text-transparent"
                          }`}
                        >
                          <FontAwesomeIcon icon={faCheck} className="h-2" />
                        </span>
                        Both password fields match
                      </p>
                    </div>
                  </section>

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
                      ? "Resetting Password..."
                      : "Reset Password"}
                    <FontAwesomeIcon icon={faPaperPlane} className="h-3" />
                  </button>
                </form>
              </>
            )}

            {stage !== "completed" && (
              <>
                <div className="my-6 flex items-center gap-4">
                  <span className="h-px flex-1 bg-[#EDE3D8]" />
                  <span className="text-[9px] font-black uppercase text-[#8A8179]">
                    Or
                  </span>
                  <span className="h-px flex-1 bg-[#EDE3D8]" />
                </div>

                <Link
                  href="/login"
                  className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-[#C8102E] bg-white px-5 text-[9px] font-black uppercase text-[#C8102E] transition hover:bg-[#C8102E] hover:text-white"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="h-3" />
                  Back to Login
                </Link>
              </>
            )}
          </section>
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
