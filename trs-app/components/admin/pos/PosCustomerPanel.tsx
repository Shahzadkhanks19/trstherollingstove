"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPhone, faUser, faUserPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import type { PosCustomer } from "@/types/pos";

type CustomerApiResponse<T> = { success: boolean; message: string; data: T };

export function PosCustomerPanel({
  customer,
  onChange,
}: {
  customer: PosCustomer;
  onChange: (customer: PosCustomer) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PosCustomer[]>([]);
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [guestDetails, setGuestDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });

  const visibleResults =
    !open || creating || query.trim().length < 2 ? [] : results;

  useEffect(() => {
    if (!open || creating || query.trim().length < 2) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/v1/pos/customers?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const json = (await response.json()) as CustomerApiResponse<
          PosCustomer[]
        >;
        if (!response.ok)
          throw new Error(json.message || "Unable to search customers.");
        setResults(json.data);
        setMessage("");
      } catch (error) {
        if ((error as Error).name !== "AbortError")
          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to search customers.",
          );
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [creating, open, query]);

  async function createCustomer() {
    const name = form.name.trim();
    const phone = form.phone.replace(/\D/g, "");
    const email = form.email.trim().toLowerCase();
    if (name.length < 2) {
      setMessage("Customer name must contain at least 2 characters.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setMessage("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage("Enter a valid email address.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/pos/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone, email }),
      });
      const json = (await response.json()) as CustomerApiResponse<PosCustomer>;
      if (!response.ok)
        throw new Error(json.message || "Unable to create customer.");
      onChange(json.data);
      setOpen(false);
      setCreating(false);
      setForm({ name: "", phone: "", email: "" });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to create customer.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4 rounded-2xl border border-[#e5d9cf] bg-[#fffdf9] p-3">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#111820] text-[#E8A53A]">
          <FontAwesomeIcon icon={faUser} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#8b7e75]">
            Customer
          </p>
          <p className="truncate text-sm font-black text-[#122b3c]">
            {customer.name}
          </p>
          {customer.phone && (
            <p className="text-[10px] font-bold text-[#8b7e75]">
              <FontAwesomeIcon icon={faPhone} className="mr-1" />
              {customer.phone}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl border border-[#d9ccc2] bg-white px-3 py-2 text-[10px] font-black text-[#122b3c]"
        >
          {customer.isWalkIn ? "Select" : "Change"}
        </button>
        {!customer.isWalkIn && (
          <button
            type="button"
            onClick={() =>
              onChange({
                id: "",
                name: "Walk-in customer",
                phone: "",
                email: "",
                isWalkIn: true,
              })
            }
            className="grid h-9 w-9 place-items-center rounded-xl text-[#C8102E]"
            aria-label="Use walk-in customer"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        )}
      </div>
      {open && (
        <div className="fixed inset-0 z-[80] grid place-items-end bg-black/50 p-0 sm:place-items-center sm:p-6">
          <button
            className="absolute inset-0"
            onClick={() => setOpen(false)}
            aria-label="Close customer selector"
          />
          <div className="relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#C8102E]">
                  POS customer
                </p>
                <h3 className="text-xl font-black text-[#122b3c]">
                  {guestDetails
                    ? "Guest details"
                    : creating
                      ? "Create customer"
                      : "Find customer"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-xl bg-[#f3ece5]"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            {!creating && !guestDetails ? (
              <>
                <div className="mt-5 flex gap-2">
                  <div className="relative flex-1">
                    <FontAwesomeIcon
                      icon={faMagnifyingGlass}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a8e85]"
                    />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.currentTarget.value)}
                      placeholder="Name, phone or email"
                      className="h-12 w-full rounded-xl border border-[#e5d9cf] pl-10 pr-3 text-sm font-semibold outline-none focus:border-[#C8102E]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="grid h-12 w-12 place-items-center rounded-xl bg-[#111820] text-white"
                    aria-label="Create customer"
                  >
                    <FontAwesomeIcon icon={faUserPlus} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setGuestDetails(true);
                    setForm({
                      name:
                        customer.isWalkIn &&
                        customer.name !== "Walk-in customer"
                          ? customer.name
                          : "",
                      phone: customer.phone,
                      email: customer.email,
                    });
                  }}
                  className="mt-3 h-11 w-full rounded-xl border border-amber-300 bg-amber-50 text-xs font-black text-amber-900"
                >
                  Add guest name/details without creating account
                </button>
                <div className="mt-4 space-y-2">
                  {loading && (
                    <p className="py-8 text-center text-sm font-bold text-[#8b7e75]">
                      Searching...
                    </p>
                  )}
                  {!loading &&
                    query.trim().length >= 2 &&
                    !visibleResults.length && (
                      <p className="py-8 text-center text-sm font-bold text-[#8b7e75]">
                        No customers found.
                      </p>
                    )}
                  {visibleResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onChange(item);
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl border border-[#eadfd6] p-3 text-left hover:border-[#C8102E]"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f3ece5] text-[#C8102E]">
                        <FontAwesomeIcon icon={faUser} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-[#122b3c]">
                          {item.name}
                        </span>
                        <span className="block text-[11px] font-semibold text-[#8b7e75]">
                          {item.phone || item.email}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : guestDetails ? (
              <GuestDetailsForm
                form={form}
                setForm={setForm}
                message={message}
                setMessage={setMessage}
                onBack={() => setGuestDetails(false)}
                onUse={(guest) => {
                  onChange(guest);
                  setGuestDetails(false);
                  setOpen(false);
                }}
              />
            ) : (
              <div className="mt-5 space-y-3">
                {(
                  [
                    ["name", "Name"],
                    ["phone", "10-digit phone"],
                    ["email", "Email (optional)"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="block text-[10px] font-black text-[#756960]"
                  >
                    {label}
                    <input
                      value={form[key]}
                      onChange={(event) => {
                        const rawValue = event.currentTarget.value;
                        const value =
                          key === "phone"
                            ? rawValue.replace(/\D/g, "").slice(0, 10)
                            : rawValue;
                        setForm((current) => ({ ...current, [key]: value }));
                        if (message) setMessage("");
                      }}
                      inputMode={key === "phone" ? "numeric" : undefined}
                      maxLength={
                        key === "phone" ? 10 : key === "name" ? 120 : 254
                      }
                      className="mt-1 h-11 w-full rounded-xl border border-[#e5d9cf] px-3 text-sm font-semibold outline-none focus:border-[#C8102E]"
                    />
                  </label>
                ))}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreating(false)}
                    className="h-11 rounded-xl border border-[#d9ccc2] text-xs font-black"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={createCustomer}
                    className="h-11 rounded-xl bg-[#C8102E] text-xs font-black text-white disabled:opacity-50"
                  >
                    Create & select
                  </button>
                </div>
              </div>
            )}
            {message && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                {message}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


export function GuestDetailsForm({
  form,
  setForm,
  message,
  setMessage,
  onBack,
  onUse,
}: {
  form: { name: string; phone: string; email: string };
  setForm: Dispatch<
    SetStateAction<{ name: string; phone: string; email: string }>
  >;
  message: string;
  setMessage: (value: string) => void;
  onBack: () => void;
  onUse: (customer: PosCustomer) => void;
}) {
  return (
    <div className="mt-5 space-y-3">
      <p className="rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-900">
        These details print on this bill only. Create or link the customer later
        from Bill History.
      </p>
      {(
        [
          ["name", "Name"],
          ["phone", "Phone (optional)"],
          ["email", "Email (optional)"],
        ] as const
      ).map(([key, label]) => (
        <label
          key={key}
          className="block text-[10px] font-black text-[#756960]"
        >
          {label}
          <input
            value={form[key]}
            onChange={(event) => {
              const raw = event.currentTarget.value;
              const value =
                key === "phone" ? raw.replace(/\D/g, "").slice(0, 10) : raw;
              setForm((current) => ({ ...current, [key]: value }));
              if (message) setMessage("");
            }}
            className="mt-1 h-11 w-full rounded-xl border border-[#e5d9cf] px-3 text-sm font-semibold"
          />
        </label>
      ))}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onBack}
          className="h-11 rounded-xl border text-xs font-black"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => {
            const phone = form.phone.replace(/\D/g, "");
            if (phone && !/^[6-9]\d{9}$/.test(phone)) {
              setMessage("Enter a valid 10-digit phone or leave it blank.");
              return;
            }
            onUse({
              id: "",
              name: form.name.trim() || "Guest customer",
              phone,
              email: form.email.trim().toLowerCase(),
              isWalkIn: true,
            });
          }}
          className="h-11 rounded-xl bg-amber-500 text-xs font-black"
        >
          Use guest details
        </button>
      </div>
    </div>
  );
}
