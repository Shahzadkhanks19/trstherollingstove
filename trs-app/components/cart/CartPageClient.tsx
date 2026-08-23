"use client";

import { CmsHeroMedia } from "@/components/site/CmsHeroMedia";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faBagShopping, faMinus, faPlus, faReceipt, faRotateRight, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MediaPlaceholder } from "@/components/site/MediaPlaceholder";
import { fetchActiveCart, publishCartUpdated, removeGuestCartItem, updateGuestCartItem, writeGuestCart, type CartApiData } from "@/lib/cart-client";

function money(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
}

export function CartPageClient() {
  const [cart, setCart] = useState<CartApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [message, setMessage] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const loadCart = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const active = await fetchActiveCart();
      setAuthenticated(active.authenticated);
      setCart(active.cart);
      publishCartUpdated(active.cart.itemCount);
    } catch (error) {
      setCart(null);
      setMessage(error instanceof Error ? error.message : "Unable to load cart.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchActiveCart()
      .then(({ cart: nextCart, authenticated: isAuthenticated }) => {
        if (cancelled) return;
        setAuthenticated(isAuthenticated);
        setCart(nextCart);
        publishCartUpdated(nextCart.itemCount);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCart(null);
        setMessage(error instanceof Error ? error.message : "Unable to load cart.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function mutate(url: string, method: "PATCH" | "DELETE", body?: object) {
    const response = await fetch(url, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = (await response.json()) as { message?: string; data?: CartApiData };
    if (!response.ok || !result.data) throw new Error(result.message || "Cart update failed.");
    setCart(result.data);
    publishCartUpdated(result.data.itemCount);
  }

  async function updateQuantity(itemId: string, quantity: number) {
    if (quantity < 1 || quantity > 50) return;
    setWorkingId(itemId);
    setMessage("");
    try {
      if (authenticated) await mutate(`/api/v1/customer/cart/items/${itemId}`, "PATCH", { quantity });
      else setCart(updateGuestCartItem(itemId, quantity));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update quantity."); }
    finally { setWorkingId(""); }
  }

  async function removeItem(itemId: string) {
    setWorkingId(itemId);
    setMessage("");
    try {
      if (authenticated) await mutate(`/api/v1/customer/cart/items/${itemId}`, "DELETE");
      else setCart(removeGuestCartItem(itemId));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to remove item."); }
    finally { setWorkingId(""); }
  }

  async function clearCart() {
    setWorkingId("clear");
    setMessage("");
    try {
      if (authenticated) await mutate("/api/v1/customer/cart", "DELETE");
      else setCart(writeGuestCart({ items: [], subtotal: 0, taxTotal: 0, discountTotal: 0, grandTotal: 0, itemCount: 0 }));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to clear cart."); }
    finally { setWorkingId(""); }
  }

  return (
    <main className="min-h-screen bg-[#FFFDF9] text-[#172536]">
      <section className="overflow-hidden border-b border-[#EDE3D8] bg-[linear-gradient(135deg,#FFFDF9,#FFF6EC)]">
        <div className="mx-auto grid min-h-[390px] w-[min(100%-2rem,1240px)] items-center gap-8 py-10 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] lg:py-12">
          <div>
            <p className="text-sm font-black italic text-[#C8102E]">Review Your Selection</p>
            <h1 className="mt-3 text-[clamp(3rem,8vw,6rem)] font-black uppercase leading-none tracking-[-.055em]">Your <span className="text-[#C8102E]">Cart</span></h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#655E57]">Real menu items, configurations and server-verified prices. Review everything before continuing to checkout.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/menu" className="inline-flex items-center gap-2 rounded-xl border border-[#C8102E] bg-white px-5 py-3 text-[10px] font-black uppercase text-[#C8102E]">Continue Shopping <FontAwesomeIcon icon={faArrowRight} /></Link>
              <span className="inline-flex items-center rounded-xl bg-[#FFF1E5] px-5 py-3 text-[10px] font-black uppercase text-[#7F0007]">{cart?.itemCount ?? 0} items selected</span>
            </div>
          </div>
          <CmsHeroMedia
            pageKey="cart"
            label="TRS cart hero image"
            className="min-h-[300px] rounded-[2rem] border border-[#E8D8C9] shadow-[0_28px_70px_rgba(88,56,24,.14)] sm:min-h-[360px]"
          />
        </div>
      </section>

      <section className="mx-auto grid w-[min(100%-2rem,1240px)] gap-5 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-3xl border border-[#EDE3D8] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-4 border-b border-[#EDE3D8] pb-5">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#FFF1E5] text-[#C8102E]"><FontAwesomeIcon icon={faBagShopping} /></span><h2 className="text-lg font-black uppercase">{cart?.itemCount ?? 0} Items</h2></div>
            {!!cart?.items.length && <button type="button" disabled={workingId === "clear"} onClick={() => void clearCart()} className="rounded-xl border border-[#C8102E] px-4 py-3 text-[9px] font-black uppercase text-[#C8102E] disabled:opacity-50"><FontAwesomeIcon icon={faTrashCan} className="mr-2" />Clear Cart</button>}
          </div>

          {message && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{message}<button type="button" onClick={() => void loadCart()} className="ml-3 font-black underline"><FontAwesomeIcon icon={faRotateRight} className="mr-1" />Retry</button></div>}
          {loading ? <div className="py-16 text-center text-sm font-bold text-[#655E57]">Loading your cart…</div> : !cart?.items.length ? <div className="py-16 text-center"><h3 className="text-xl font-black">Your cart is empty</h3><p className="mt-2 text-sm text-[#655E57]">Choose an item from the live menu to begin.</p><Link href="/menu" className="mt-5 inline-flex rounded-xl bg-[#C8102E] px-6 py-4 text-xs font-black uppercase text-white">Browse Menu</Link></div> : <div className="divide-y divide-[#EDE3D8]">
            {cart.items.map((item) => <article key={item._id} className="grid gap-4 py-5 sm:grid-cols-[110px_minmax(0,1fr)_150px] sm:items-center">
              {item.imageUrl ? <Image src={item.imageUrl} alt={item.name} width={110} height={110} className="aspect-square w-full rounded-2xl object-cover" /> : <MediaPlaceholder label={`${item.name} image`} className="aspect-square rounded-2xl" />}
              <div><h3 className="font-black">{item.name}</h3>{item.variantName && <p className="mt-1 text-[10px] font-bold text-[#655E57]">{item.variantName}</p>}{item.modifiers?.map((modifier, index) => modifier.optionName ? <p key={`${modifier.optionName}-${index}`} className="mt-1 text-[9px] text-[#655E57]">+ {modifier.optionName}</p> : null)}{item.specialInstructions && <p className="mt-2 text-[9px] italic text-[#655E57]">Note: {item.specialInstructions}</p>}<p className="mt-3 font-black text-[#C8102E]">{money(item.lineUnitPrice)} each</p></div>
              <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end"><div className="flex items-center gap-2"><button type="button" disabled={workingId === item._id || item.quantity <= 1} onClick={() => void updateQuantity(item._id, item.quantity - 1)} className="grid h-9 w-9 place-items-center rounded-lg border disabled:opacity-40"><FontAwesomeIcon icon={faMinus} /></button><strong className="w-7 text-center">{item.quantity}</strong><button type="button" disabled={workingId === item._id || item.quantity >= 50} onClick={() => void updateQuantity(item._id, item.quantity + 1)} className="grid h-9 w-9 place-items-center rounded-lg border disabled:opacity-40"><FontAwesomeIcon icon={faPlus} /></button></div><strong>{money(item.lineTotal)}</strong><button type="button" disabled={workingId === item._id} onClick={() => void removeItem(item._id)} className="text-[9px] font-black uppercase text-[#C8102E] disabled:opacity-40"><FontAwesomeIcon icon={faTrashCan} className="mr-2" />Remove</button></div>
            </article>)}
          </div>}
        </section>

        <aside className="h-fit rounded-3xl border border-[#EDE3D8] bg-white p-6 shadow-sm lg:sticky lg:top-28">
          <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#FFF1E5] text-[#C8102E]"><FontAwesomeIcon icon={faReceipt} /></span><h2 className="text-lg font-black uppercase">Order Summary</h2></div>
          <div className="mt-6 space-y-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><strong>{money(cart?.subtotal ?? 0)}</strong></div><div className="flex justify-between"><span>Taxes</span><strong>{money(cart?.taxTotal ?? 0)}</strong></div><div className="flex justify-between border-t pt-4 text-lg"><span className="font-black">Total</span><strong className="text-[#C8102E]">{money(cart?.grandTotal ?? 0)}</strong></div></div>
          <Link href={cart?.items.length ? (authenticated ? "/checkout" : "/login?returnTo=%2Fcheckout") : "/menu"} className="mt-6 flex h-12 items-center justify-center gap-3 rounded-xl bg-[#C8102E] px-5 text-[10px] font-black uppercase text-white">{cart?.items.length ? (authenticated ? "Proceed to Checkout" : "Sign In to Checkout") : "Browse Menu"}<FontAwesomeIcon icon={faArrowRight} /></Link>
          <p className="mt-4 text-[9px] leading-4 text-[#655E57]">Final coupon, coin and availability checks are performed by the server during checkout.</p>
        </aside>
      </section>
    </main>
  );
}
