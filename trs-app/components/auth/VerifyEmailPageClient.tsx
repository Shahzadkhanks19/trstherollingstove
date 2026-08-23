"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faCircleExclamation,
  faEnvelopeCircleCheck,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useEffect, useState } from "react";

type Status = "verifying" | "success" | "error";

export function VerifyEmailPageClient({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState("Verifying your email address...");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        if (!token) {
          setStatus("error");
          setMessage("The verification link is incomplete.");
          return;
        }

        try {
          const response = await fetch("/api/v1/auth/verify-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          const data = (await response.json().catch(() => null)) as
            | { message?: string }
            | null;

          if (!response.ok) {
            throw new Error(
              data?.message ?? "The verification link is invalid or expired.",
            );
          }

          setStatus("success");
          setMessage(data?.message ?? "Your email has been verified.");
        } catch (error) {
          setStatus("error");
          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to verify your email right now.",
          );
        }
      })();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [token]);

  return (
    <main className="grid min-h-[70vh] place-items-center bg-[#FFFDF9] px-4 py-16 text-[#172536]">
      <section className="w-full max-w-xl rounded-[2rem] border border-[#EDE3D8] bg-white p-7 text-center shadow-[0_24px_70px_rgba(50,30,15,.1)] sm:p-10">
        <span
          className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${
            status === "success"
              ? "bg-emerald-50 text-emerald-600"
              : status === "error"
                ? "bg-red-50 text-[#C8102E]"
                : "bg-[#FFF3E8] text-[#D99219]"
          }`}
        >
          <FontAwesomeIcon
            icon={
              status === "success"
                ? faCircleCheck
                : status === "error"
                  ? faCircleExclamation
                  : faSpinner
            }
            className={`h-9 ${status === "verifying" ? "animate-spin" : ""}`}
          />
        </span>

        <FontAwesomeIcon
          icon={faEnvelopeCircleCheck}
          className="mt-7 h-5 text-[#C8102E]"
        />
        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">
          Email Verification
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#655E57]">{message}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {status === "success" ? (
            <Link
              href="/login"
              className="rounded-xl bg-[#C8102E] px-6 py-3 text-xs font-black uppercase text-white"
            >
              Continue to Login
            </Link>
          ) : status === "error" ? (
            <Link
              href="/resend-verification"
              className="rounded-xl bg-[#C8102E] px-6 py-3 text-xs font-black uppercase text-white"
            >
              Resend Verification
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
