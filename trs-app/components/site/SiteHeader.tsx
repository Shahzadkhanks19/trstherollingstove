"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { CustomerAccountMenu } from "@/components/site/CustomerAccountMenu";
import { faArrowRight, faBars, faCartShopping, faTruckFast, faXmark } from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CART_UPDATED_EVENT } from "@/lib/cart-client";
import { fetchSharedActiveCart } from "@/lib/customer-session-client";

const links = [
  ["/", "Home"],
  ["/menu", "Menu"],
  ["/offers", "Offers"],
  ["/rewards", "Rewards"],
  ["/about", "About"],
  ["/gallery", "Gallery"],
  ["/contact", "Contact"],
] as const;

const mobileExtraLinks = [["/faq", "FAQ"]] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const closeMenu = (): void => setOpen(false);
  const toggleMenu = (): void => setOpen((currentOpen) => !currentOpen);

  useEffect(() => {
    let active = true;
    void fetchSharedActiveCart()
      .then(({ cart }) => {
        if (active) setCartCount(cart.itemCount);
      })
      .catch(() => {
        if (active) setCartCount(0);
      });

    const handleCartUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ itemCount?: number }>).detail;
      if (typeof detail?.itemCount === "number") setCartCount(detail.itemCount);
    };

    window.addEventListener(CART_UPDATED_EVENT, handleCartUpdated);
    return () => {
      active = false;
      window.removeEventListener(CART_UPDATED_EVENT, handleCartUpdated);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#EDE3D8] bg-[#FFFDF9]/95 shadow-[0_4px_18px_rgba(55,38,23,.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] w-[min(100%-1rem,1320px)] min-w-0 items-center justify-between gap-2 sm:w-[min(100%-1.5rem,1320px)] sm:gap-4 lg:h-[84px]">
          <Link href="/" prefetch={false} className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3" aria-label="The Rolling Stove home">
            <Image
              src="/images/trs-logo.png"
              alt="The Rolling Stove"
              width={70}
              height={70}
              priority
              sizes="68px"
              className="h-[54px] w-[54px] shrink-0 object-contain sm:h-[58px] sm:w-[58px] lg:h-[68px] lg:w-[68px]"
            />
            <div className="hidden sm:block">
              <div className="text-[26px] font-black leading-none tracking-[-0.05em] text-[#C8102E]">TRS</div>
              <div className="mt-1 text-[7px] font-black uppercase tracking-[0.22em] text-[#332B25]">The Rolling Stove<br />Pizzeria</div>
            </div>
          </Link>

          <nav className="hidden items-center xl:flex" aria-label="Primary navigation">
            {links.map(([href, label]) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={false}
                  className={`relative px-3 py-8 text-[10px] font-black uppercase transition-colors ${active ? "text-[#C8102E]" : "text-[#292520] hover:text-[#C8102E]"}`}
                >
                  {label}
                  <span className={`absolute inset-x-3 bottom-4 h-0.5 bg-[#C8102E] transition-transform ${active ? "scale-x-100" : "scale-x-0"}`} />
                </Link>
              );
            })}
          </nav>

          <div className="flex min-w-0 items-center gap-0.5 sm:gap-2">
            <Link href="/track-order" prefetch={false} aria-label="Track order" title="Track order" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#27313A] transition hover:bg-[#FFF1E7] hover:text-[#C8102E] sm:h-10 sm:w-10">
              <FontAwesomeIcon icon={faTruckFast} className="h-4 sm:h-[17px]" />
            </Link>

            <CustomerAccountMenu />

            <Link href="/cart" prefetch={false} aria-label="Cart" className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#27313A] transition hover:bg-[#FFF1E7] hover:text-[#C8102E] sm:h-10 sm:w-10">
              <FontAwesomeIcon icon={faCartShopping} className="h-[17px] sm:h-[18px]" />
              <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-[#C8102E] px-1 text-[8px] font-black text-white">{cartCount > 99 ? "99+" : cartCount}</span>
            </Link>

            <Link href="/menu" prefetch={false} className="hidden h-11 items-center gap-3 rounded-xl bg-[#C8102E] px-5 text-[10px] font-black uppercase text-white shadow-[0_10px_24px_rgba(215,25,32,.22)] transition hover:-translate-y-0.5 hover:bg-[#A50E27] sm:flex">
              Order Now
              <FontAwesomeIcon icon={faArrowRight} className="h-3" />
            </Link>

            <button type="button" onClick={toggleMenu} aria-expanded={open} aria-controls="mobile-site-navigation" aria-label="Open navigation menu" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#E7DACD] bg-white text-[#27313A] transition hover:border-[#C8102E] hover:text-[#C8102E] xl:hidden">
              <FontAwesomeIcon icon={faBars} className="h-5" />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="xl:hidden">
          <button type="button" aria-label="Close navigation menu" onClick={closeMenu} className="fixed inset-0 z-[60] bg-[#101820]/50 backdrop-blur-[2px]" />
          <aside id="mobile-site-navigation" role="dialog" aria-modal="true" aria-label="Mobile navigation" className="fixed bottom-0 right-0 top-0 z-[70] flex w-[min(88vw,360px)] flex-col overflow-hidden border-l border-[#EDE3D8] bg-[#FFFDF9] shadow-[-18px_0_50px_rgba(23,18,14,.22)]">
            <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-[#EDE3D8] px-4 sm:px-5">
              <Link href="/" prefetch={false} onClick={closeMenu} className="flex min-w-0 items-center gap-3" aria-label="The Rolling Stove home">
                <Image src="/images/trs-logo.png" alt="The Rolling Stove" width={48} height={48} sizes="44px" className="h-11 w-11 shrink-0 object-contain" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black uppercase text-[#172536]">The Rolling Stove</p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#C8102E]">Pizzeria</p>
                </div>
              </Link>
              <button type="button" onClick={closeMenu} aria-label="Close navigation menu" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#E7DACD] bg-white text-[#27313A] shadow-sm transition hover:border-[#C8102E] hover:bg-[#FFF1E7] hover:text-[#C8102E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E]">
                <FontAwesomeIcon icon={faXmark} className="h-5" />
              </button>
            </div>

            <div className="shrink-0 border-b border-[#EDE3D8] px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#C8102E]">Explore TRS</p>
              <p className="mt-1 text-sm font-semibold text-[#29333C]">Food, rewards and easy ordering</p>
            </div>

            <nav aria-label="Mobile navigation links" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              <div className="grid gap-2">
                {[...links, ...mobileExtraLinks].map(([href, label]) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      prefetch={false}
                      onClick={closeMenu}
                      className={`flex min-h-12 items-center justify-between rounded-xl px-4 text-xs font-black uppercase transition ${active ? "bg-[#C8102E] text-white shadow-[0_10px_24px_rgba(200,16,46,.18)]" : "border border-[#F0E6DC] bg-white text-[#2B2622] hover:border-[#E8A53A] hover:bg-[#FFF7EF] hover:text-[#C8102E]"}`}
                    >
                      {label}
                      <FontAwesomeIcon icon={faArrowRight} className="h-3" />
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="shrink-0 border-t border-[#EDE3D8] bg-[#FFFDF9] p-4">
              <Link href="/menu" prefetch={false} onClick={closeMenu} className="flex h-12 items-center justify-center gap-3 rounded-xl bg-[#C8102E] px-5 text-xs font-black uppercase text-white shadow-[0_12px_28px_rgba(200,16,46,.22)]">
                Order Now
                <FontAwesomeIcon icon={faArrowRight} className="h-3" />
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
