"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faEye,
  faEyeSlash,
  faLock,
  faShieldHalved,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

type ApiPayload = {
  success?: boolean;
  message?: string;
  data?: { redirectTo?: string };
};

export function AdminLoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    params.get("error") === "unauthorized"
      ? "This account does not have admin access."
      : "",
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/v1/admin/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: email.trim(),
          password,
          rememberMe,
        }),
      });

      const payload = (await response.json()) as ApiPayload;
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Unable to sign in.");
      }

      const requestedRedirect = params.get("redirect");
      const destination = requestedRedirect?.startsWith("/admin")
        ? requestedRedirect
        : payload.data?.redirectTo || "/admin/dashboard";

      router.replace(destination);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to sign in.",
      );
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#171717] px-4 py-10 text-[#211b17]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(201,143,35,.22),transparent_28%),radial-gradient(circle_at_85%_80%,rgba(200,16,46,.22),transparent_30%)]" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#fffaf2] shadow-[0_35px_100px_rgba(0,0,0,.45)] lg:grid-cols-[.9fr_1.1fr]">
        <aside className="hidden bg-[#211f1d] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#C8102E] shadow-lg">
              <FontAwesomeIcon icon={faShieldHalved} className="h-6" />
            </div>
            <p className="mt-8 text-xs font-black uppercase tracking-[.28em] text-[#d8a640]">
              The Rolling Stove
            </p>
            <h1 className="mt-4 text-5xl font-black leading-[.95] tracking-[-.05em]">
              Control every part of TRS.
            </h1>
            <p className="mt-6 max-w-sm text-sm leading-7 text-white/65">
              Secure access for orders, kitchen, inventory, purchasing,
              rewards, content and reporting.
            </p>
          </div>
          <p className="text-xs font-semibold text-white/40">
            Authorised staff access only
          </p>
        </aside>

        <section className="p-6 sm:p-10 lg:p-12">
          <div className="lg:hidden">
            <p className="text-xs font-black uppercase tracking-[.24em] text-[#C8102E]">
              TRS Administration
            </p>
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-[-.04em] text-[#172536]">
            Admin Login
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#6c6259]">
            Sign in with your staff or administrator account.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block text-[11px] font-black uppercase tracking-wide">
              Email address
              <span className="relative mt-2 block">
                <FontAwesomeIcon
                  icon={faUser}
                  className="absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#877d73]"
                />
                <input
                  required
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-13 w-full rounded-xl border border-[#e4d8cc] bg-white pl-11 pr-4 text-sm outline-none focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10"
                  placeholder="admin@trs.com"
                />
              </span>
            </label>

            <label className="block text-[11px] font-black uppercase tracking-wide">
              Password
              <span className="relative mt-2 block">
                <FontAwesomeIcon
                  icon={faLock}
                  className="absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#877d73]"
                />
                <input
                  required
                  minLength={1}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-13 w-full rounded-xl border border-[#e4d8cc] bg-white pl-11 pr-12 text-sm outline-none focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center"
                >
                  <FontAwesomeIcon
                    icon={showPassword ? faEyeSlash : faEye}
                    className="h-4 text-[#6c6259]"
                  />
                </button>
              </span>
            </label>

            <div className="flex items-center justify-between gap-3 text-xs">
              <label className="flex items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 accent-[#C8102E]"
                />
                Remember me
              </label>
              <Link
                href="/admin/forgot-password"
                className="font-black text-[#C8102E]"
              >
                Forgot password?
              </Link>
            </div>

            {message ? (
              <p
                role="alert"
                className="rounded-xl border border-[#efc7c7] bg-[#fff1f1] px-4 py-3 text-xs font-bold text-[#A50E27]"
              >
                {message}
              </p>
            ) : null}

            <button
              disabled={loading}
              className="flex h-13 w-full items-center justify-center gap-3 rounded-xl bg-[#C8102E] px-6 text-xs font-black uppercase tracking-wide text-white shadow-[0_14px_30px_rgba(200,16,46,.24)] transition hover:-translate-y-0.5 hover:bg-[#A50E27] disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Login to dashboard"}
              <FontAwesomeIcon icon={faArrowRight} className="h-3" />
            </button>
          </form>

          <Link
            href="/"
            className="mt-7 inline-block text-xs font-bold text-[#6c6259] hover:text-[#C8102E]"
          >
            ← Return to TRS website
          </Link>
        </section>
      </div>
    </main>
  );
}
