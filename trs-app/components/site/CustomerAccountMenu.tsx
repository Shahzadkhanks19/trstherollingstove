"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBagShopping,
  faChevronDown,
  faCoins,
  faGaugeHigh,
  faRightFromBracket,
  faUser,
  faUserPen,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  AUTH_UPDATED_EVENT,
  logoutCustomerPreservingCart,
} from "@/lib/cart-client";
import {
  getSharedCurrentCustomerData,
  invalidateSharedCustomerSession,
} from "@/lib/customer-session-client";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roleKey: string;
};

export function CustomerAccountMenu() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCustomer = (): void => {
      void getSharedCurrentCustomerData()
        .then((currentCustomer) => {
          if (!cancelled) setCustomer(currentCustomer);
        })
        .catch((error: unknown) => {
          console.error("Unable to load current customer:", error);
          if (!cancelled) setCustomer(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    const handleAuthUpdated = (): void => {
      invalidateSharedCustomerSession();
      fetchCustomer();
    };

    fetchCustomer();
    window.addEventListener(AUTH_UPDATED_EVENT, handleAuthUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_UPDATED_EVENT, handleAuthUpdated);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const logout = async (): Promise<void> => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await logoutCustomerPreservingCart();
      invalidateSharedCustomerSession();
      setCustomer(null);
      setOpen(false);
      window.location.assign("/");
    } catch (error) {
      console.error("Logout failed:", error);
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#27313A] sm:h-10 sm:w-10">
        <FontAwesomeIcon icon={faUser} className="h-4 opacity-40 sm:h-[17px]" />
      </span>
    );
  }

  if (!customer) {
    return (
      <Link
        href="/login"
        aria-label="Login or create account"
        title="Login or create account"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#27313A] transition hover:bg-[#FFF1E7] hover:text-[#C8102E] sm:h-10 sm:w-10"
      >
        <FontAwesomeIcon icon={faUser} className="h-4 sm:h-[17px]" />
      </Link>
    );
  }

  const firstName = customer.name.trim().split(/\s+/)[0] || "Account";

  const accountLinks = [
    { href: "/customer-dashboard", label: "Dashboard", icon: faGaugeHigh },
    { href: "/customer-dashboard/orders", label: "My Orders", icon: faBagShopping },
    { href: "/customer-dashboard/rewards", label: "TRS Coins", icon: faCoins },
    { href: "/customer-dashboard/profile", label: "Profile", icon: faUserPen },
  ] as const;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="customer-account-menu"
        aria-label="Open customer account menu"
        className="flex h-10 max-w-[145px] items-center gap-2 rounded-xl px-2 text-[#27313A] transition hover:bg-[#FFF1E7] hover:text-[#C8102E]"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#FFF1E7] text-[#C8102E]">
          <FontAwesomeIcon icon={faUser} className="h-3.5" />
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block text-[8px] font-bold uppercase text-[#81776E]">Hello</span>
          <span className="block truncate text-[10px] font-black">{firstName}</span>
        </span>
        <FontAwesomeIcon icon={faChevronDown} className={`hidden h-2.5 transition-transform sm:block ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          id="customer-account-menu"
          role="menu"
          aria-label="Customer account options"
          className="absolute right-0 top-[calc(100%+.7rem)] z-[90] w-[260px] overflow-hidden rounded-2xl border border-[#E8D8C9] bg-white shadow-[0_22px_55px_rgba(37,25,15,.18)]"
        >
          <div className="border-b border-[#EDE3D8] bg-[#FFF8F1] p-4">
            <p className="truncate text-sm font-black text-[#172536]">{customer.name}</p>
            <p className="mt-1 truncate text-[9px] font-semibold text-[#776E66]">{customer.email}</p>
          </div>

          <nav aria-label="Customer account" className="p-2">
            {accountLinks.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[10px] font-black uppercase text-[#342E29] transition hover:bg-[#FFF1E7] hover:text-[#C8102E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E]"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#FFF5EC] text-[#C8102E]">
                  <FontAwesomeIcon icon={icon} className="h-3.5" />
                </span>
                {label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-[#EDE3D8] p-2">
            <button
              type="button"
              role="menuitem"
              disabled={loggingOut}
              onClick={() => void logout()}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[10px] font-black uppercase text-[#A50E27] transition hover:bg-[#FFF0F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#FFF0F2]">
                <FontAwesomeIcon icon={faRightFromBracket} className="h-3.5" />
              </span>
              {loggingOut ? "Logging Out..." : "Logout"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
