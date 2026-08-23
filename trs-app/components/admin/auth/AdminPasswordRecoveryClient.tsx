"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Props = { mode: "forgot" | "reset" };
type ApiPayload = { success?: boolean; message?: string };

export function AdminPasswordRecoveryClient({ mode }: Props) {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const isReset = mode === "reset";
      if (isReset && password !== confirmPassword) throw new Error("Passwords do not match.");
      const token = params.get("token") || "";
      if (isReset && !token) throw new Error("Reset link is missing or invalid.");
      const response = await fetch(isReset ? "/api/v1/auth/reset-password" : "/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isReset ? { token, newPassword: password } : { email: email.trim() }),
      });
      const payload = (await response.json()) as ApiPayload;
      if (!response.ok || !payload.success) throw new Error(payload.message || "Request failed.");
      setSuccess(true);
      setMessage(payload.message || (isReset ? "Password reset successful." : "Reset instructions sent."));
    } catch (error) {
      setSuccess(false);
      setMessage(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#171717] px-4 py-10">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#fffaf2] p-7 shadow-[0_30px_80px_rgba(0,0,0,.4)] sm:p-9">
        <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#C8102E]">TRS Administration</p>
        <h1 className="mt-4 text-3xl font-black tracking-[-.04em] text-[#172536]">{mode === "reset" ? "Create new password" : "Reset admin password"}</h1>
        <p className="mt-3 text-sm leading-6 text-[#6c6259]">{mode === "reset" ? "Use a strong password with uppercase, lowercase, number and symbol." : "Enter the email connected to your staff account."}</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === "forgot" ? <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@trs.com" className="h-13 w-full rounded-xl border border-[#e4d8cc] bg-white px-4 text-sm outline-none focus:border-[#C8102E]" /> : <>
            <input required minLength={10} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className="h-13 w-full rounded-xl border border-[#e4d8cc] bg-white px-4 text-sm outline-none focus:border-[#C8102E]" />
            <input required minLength={10} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="h-13 w-full rounded-xl border border-[#e4d8cc] bg-white px-4 text-sm outline-none focus:border-[#C8102E]" />
          </>}
          {message ? <p role={success ? "status" : "alert"} className={`rounded-xl border px-4 py-3 text-xs font-bold ${success ? "border-[#bfe1c6] bg-[#effaf1] text-[#27713a]" : "border-[#efc7c7] bg-[#fff1f1] text-[#A50E27]"}`}>{message}</p> : null}
          {success && mode === "reset" ? <Link href="/admin/login" className="flex h-12 items-center justify-center rounded-xl bg-[#C8102E] text-xs font-black uppercase text-white">Return to admin login</Link> : <button disabled={loading} className="h-12 w-full rounded-xl bg-[#C8102E] text-xs font-black uppercase text-white disabled:opacity-60">{loading ? "Please wait..." : mode === "reset" ? "Reset password" : "Send reset link"}</button>}
        </form>
        <Link href="/admin/login" className="mt-6 inline-block text-xs font-bold text-[#6c6259] hover:text-[#C8102E]">← Back to admin login</Link>
      </section>
    </main>
  );
}
