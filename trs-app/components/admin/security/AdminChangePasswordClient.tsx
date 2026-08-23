"use client";

import {
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faEye,
  faEyeSlash,
  faKey,
  faLock,
  faShieldHalved,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";

type PasswordField =
  | "current"
  | "new"
  | "confirm";

type ApiResponse = {
  success?: boolean;
  message?: string;
};

const rules = [
  {
    label: "At least 10 characters",
    test: (value: string) => value.length >= 10,
  },
  {
    label: "Uppercase letter",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    label: "Lowercase letter",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    label: "Number",
    test: (value: string) => /\d/.test(value),
  },
  {
    label: "Special character",
    test: (value: string) =>
      /[^A-Za-z0-9]/.test(value),
  },
];

export function AdminChangePasswordClient() {
  const [currentPassword, setCurrentPassword] =
    useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [visible, setVisible] = useState<
    Record<PasswordField, boolean>
  >({
    current: false,
    new: false,
    confirm: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const passedRules = useMemo(
    () =>
      rules.filter((rule) =>
        rule.test(newPassword),
      ).length,
    [newPassword],
  );

  const strengthLabel =
    passedRules <= 2
      ? "Weak"
      : passedRules <= 4
        ? "Good"
        : "Strong";

  function toggle(field: PasswordField) {
    setVisible((current) => ({
      ...current,
      [field]: !current[field],
    }));
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        "/api/v1/auth/change-password",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        },
      );

      const body = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          body.message ||
            "Unable to change the password.",
        );
      }

      setNotice(
        body.message ||
          "Password changed. Sign in again.",
      );

      window.setTimeout(() => {
        window.location.assign(
          "/admin/login?message=password-changed",
        );
      }, 1200);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to change the password.",
      );
      setSaving(false);
    }
  }

  const inputClass =
    "h-12 w-full rounded-xl border border-[#e4d8ce] bg-white pl-11 pr-12 text-sm font-semibold text-[#173044] outline-none transition placeholder:text-[#a69a91] focus:border-[#C8102E] focus:ring-4 focus:ring-[#C8102E]/10";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#C8102E]">
          Account security
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-.04em] text-[#173044] sm:text-4xl">
          Change Admin Password
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Verify your current password and create a
          stronger replacement. For security, changing
          the password signs this account out from every
          device.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form
          onSubmit={submit}
          className="rounded-[28px] border border-[#e4d8ce] bg-[#fffdf9] p-5 shadow-sm sm:p-7"
        >
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#173044] text-[#E8A53A]">
              <FontAwesomeIcon icon={faKey} />
            </span>
            <div>
              <h2 className="text-xl font-black text-[#173044]">
                Update credentials
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                All fields are required.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <PasswordInput
              label="Current password"
              value={currentPassword}
              visible={visible.current}
              autoComplete="current-password"
              placeholder="Enter current password"
              inputClass={inputClass}
              onChange={setCurrentPassword}
              onToggle={() => toggle("current")}
            />

            <PasswordInput
              label="New password"
              value={newPassword}
              visible={visible.new}
              autoComplete="new-password"
              placeholder="Create a strong password"
              inputClass={inputClass}
              onChange={setNewPassword}
              onToggle={() => toggle("new")}
            />

            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-black">
                <span className="text-slate-500">
                  Password strength
                </span>
                <span
                  className={
                    passedRules === rules.length
                      ? "text-emerald-700"
                      : passedRules >= 3
                        ? "text-amber-700"
                        : "text-red-700"
                  }
                >
                  {strengthLabel}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {rules.map((rule, index) => (
                  <span
                    key={rule.label}
                    className={`h-2 rounded-full ${
                      index < passedRules
                        ? passedRules === rules.length
                          ? "bg-emerald-500"
                          : "bg-[#E8A53A]"
                        : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
            </div>

            <PasswordInput
              label="Confirm new password"
              value={confirmPassword}
              visible={visible.confirm}
              autoComplete="new-password"
              placeholder="Repeat the new password"
              inputClass={inputClass}
              onChange={setConfirmPassword}
              onToggle={() => toggle("confirm")}
            />
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

          <button
            type="submit"
            disabled={
              saving ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword
            }
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#C8102E] px-5 text-sm font-black text-white shadow-lg transition hover:bg-[#a90d27] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <FontAwesomeIcon icon={faLock} />
            {saving
              ? "Updating password..."
              : "Change password"}
          </button>
        </form>

        <aside className="space-y-4">
          <section className="rounded-[28px] bg-[#173044] p-6 text-white">
            <FontAwesomeIcon
              icon={faShieldHalved}
              className="text-2xl text-[#E8A53A]"
            />
            <h2 className="mt-4 text-xl font-black">
              Password requirements
            </h2>
            <div className="mt-5 space-y-3">
              {rules.map((rule) => {
                const passed = rule.test(newPassword);
                return (
                  <div
                    key={rule.label}
                    className="flex items-center gap-3"
                  >
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-full text-[10px] ${
                        passed
                          ? "bg-emerald-500 text-white"
                          : "bg-white/10 text-white/50"
                      }`}
                    >
                      <FontAwesomeIcon icon={faCheck} />
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        passed
                          ? "text-white"
                          : "text-white/55"
                      }`}
                    >
                      {rule.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
            <h3 className="font-black text-amber-950">
              After changing the password
            </h3>
            <p className="mt-2 text-sm leading-6 text-amber-900/75">
              Every active session is revoked. You will
              be redirected to the admin login page and
              must sign in using the new password.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function PasswordInput({
  label,
  value,
  visible,
  autoComplete,
  placeholder,
  inputClass,
  onChange,
  onToggle,
}: {
  label: string;
  value: string;
  visible: boolean;
  autoComplete: string;
  placeholder: string;
  inputClass: string;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-[#173044]">
        {label}
      </span>
      <span className="relative block">
        <FontAwesomeIcon
          icon={faLock}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9a8e85]"
        />
        <input
          type={visible ? "text" : "password"}
          value={value}
          required
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(event) =>
            onChange(event.currentTarget.value)
          }
          className={inputClass}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[#756960] hover:bg-[#f3ece5]"
          aria-label={
            visible ? `Hide ${label}` : `Show ${label}`
          }
        >
          <FontAwesomeIcon
            icon={visible ? faEyeSlash : faEye}
          />
        </button>
      </span>
    </label>
  );
}
