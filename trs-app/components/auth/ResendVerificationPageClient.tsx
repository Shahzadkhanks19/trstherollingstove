"use client";

import type { FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useState } from "react";

export function ResendVerificationPageClient() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setIsError(true);
      setMessage("Enter a valid registered email address.");
      return;
    }

    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/v1/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.message ?? "Unable to send verification email.");
      }

      setMessage(
        data?.message ??
          "If an unverified account exists, a verification link has been sent.",
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to send verification email right now.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-[70vh] place-items-center bg-[#FFFDF9] px-4 py-16 text-[#172536]">
      <section className="w-full max-w-xl rounded-[2rem] border border-[#EDE3D8] bg-white p-7 shadow-[0_24px_70px_rgba(50,30,15,.1)] sm:p-10">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-[#FFF3E8] text-[#C8102E]">
          <FontAwesomeIcon icon={faEnvelope} className="h-7" />
        </span>
        <h1 className="mt-6 text-3xl font-black tracking-[-0.04em]">
          Resend Verification
        </h1>
        <p className="mt-3 text-sm leading-7 text-[#655E57]">
          Enter the email used for your TRS account and we will send a fresh
          verification link.
        </p>

        <form onSubmit={submit} className="mt-7">
          <label className="block text-[10px] font-black uppercase">
            Registered Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="mt-2 h-12 w-full rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] px-4 text-sm outline-none focus:border-[#C8102E]"
            />
          </label>

          {message ? (
            <div
              role={isError ? "alert" : "status"}
              className={`mt-5 rounded-xl border px-4 py-3 text-xs font-semibold ${
                isError
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#C8102E] px-6 text-[11px] font-black uppercase text-white disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Verification Link"}
            <FontAwesomeIcon icon={faPaperPlane} className="h-3" />
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#655E57]">
          Already verified?{" "}
          <Link href="/login" className="font-black text-[#C8102E]">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}
