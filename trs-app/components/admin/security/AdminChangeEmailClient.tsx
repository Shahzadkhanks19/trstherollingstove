"use client";

import {
  useState,
  type FormEvent,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAt,
  faCheck,
  faEnvelope,
  faEye,
  faEyeSlash,
  faLock,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type Props = {
  currentEmail: string;
};

export function AdminChangeEmailClient({
  currentEmail,
}: Props) {
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] =
    useState("");
  const [passwordVisible, setPasswordVisible] =
    useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const normalizedCurrentEmail =
    currentEmail.trim().toLowerCase();
  const normalizedNewEmail =
    newEmail.trim().toLowerCase();

  const canSubmit =
    !saving &&
    normalizedNewEmail.length > 0 &&
    normalizedNewEmail !== normalizedCurrentEmail &&
    currentPassword.length > 0;

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canSubmit) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        "/api/v1/auth/change-email",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({
            newEmail: normalizedNewEmail,
            currentPassword,
          }),
        },
      );

      const body =
        (await response.json()) as ApiResponse<{
          email: string;
        }>;

      if (!response.ok || !body.success) {
        throw new Error(
          body.message ||
            "Unable to change the login email.",
        );
      }

      setNotice(
        body.message ||
          "Login email changed. Sign in again.",
      );

      window.setTimeout(() => {
        window.location.assign(
          `/admin/login?message=email-changed&email=${encodeURIComponent(
            normalizedNewEmail,
          )}`,
        );
      }, 1200);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to change the login email.",
      );
      setSaving(false);
    }
  }

  const inputClass =
    "h-12 w-full rounded-xl border border-[#e4d8ce] bg-white pl-11 pr-12 text-sm font-semibold text-[#173044] outline-none transition placeholder:text-[#a69a91] focus:border-[#C8102E] focus:ring-4 focus:ring-[#C8102E]/10";

  return (
    <form
      onSubmit={submit}
      className="rounded-[28px] border border-[#e4d8ce] bg-[#fffdf9] p-5 shadow-sm sm:p-7"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#173044] text-[#E8A53A]">
          <FontAwesomeIcon icon={faAt} />
        </span>

        <div>
          <h2 className="text-xl font-black text-[#173044]">
            Change login email
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Update the email used to sign in to this
            administrator account.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[#eadfd6] bg-[#fffaf6] px-4 py-3">
        <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#9a8f87]">
          Current login email
        </p>
        <p className="mt-1 break-all text-sm font-black text-[#173044]">
          {currentEmail}
        </p>
      </div>

      <div className="mt-5 space-y-5">
        <label className="block">
          <span className="mb-2 block text-xs font-black text-[#173044]">
            New login email
          </span>
          <span className="relative block">
            <FontAwesomeIcon
              icon={faEnvelope}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9a8f87]"
            />
            <input
              type="email"
              value={newEmail}
              onChange={(event) =>
                setNewEmail(event.currentTarget.value)
              }
              autoComplete="email"
              inputMode="email"
              placeholder="Enter new login email"
              required
              className={inputClass}
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-black text-[#173044]">
            Current password
          </span>
          <span className="relative block">
            <FontAwesomeIcon
              icon={faLock}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9a8f87]"
            />
            <input
              type={
                passwordVisible ? "text" : "password"
              }
              value={currentPassword}
              onChange={(event) =>
                setCurrentPassword(
                  event.currentTarget.value,
                )
              }
              autoComplete="current-password"
              placeholder="Confirm with current password"
              required
              className={inputClass}
            />
            <button
              type="button"
              onClick={() =>
                setPasswordVisible((current) => !current)
              }
              aria-label={
                passwordVisible
                  ? "Hide current password"
                  : "Show current password"
              }
              className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[#756b63] transition hover:bg-[#f4ece6]"
            >
              <FontAwesomeIcon
                icon={
                  passwordVisible
                    ? faEyeSlash
                    : faEye
                }
              />
            </button>
          </span>
        </label>
      </div>

      {error ? (
        <p className="mt-5 flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          <FontAwesomeIcon
            icon={faTriangleExclamation}
            className="mt-0.5"
          />
          {error}
        </p>
      ) : null}

      {notice ? (
        <p className="mt-5 flex items-start gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <FontAwesomeIcon
            icon={faCheck}
            className="mt-0.5"
          />
          {notice}
        </p>
      ) : null}

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-900">
        Changing the login email signs this account out
        from every device. Use the new email for the next
        login.
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-6 h-12 w-full rounded-xl bg-[#C8102E] px-5 text-xs font-black uppercase tracking-[.08em] text-white shadow-lg shadow-red-900/10 transition hover:bg-[#a90d27] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {saving
          ? "Changing email…"
          : "Change login email"}
      </button>
    </form>
  );
}
