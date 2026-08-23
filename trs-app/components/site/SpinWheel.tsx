"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import { faCheck, faCopy, faGift, faLock, faRotate, faRightToBracket, faWandMagicSparkles, faXmark } from "@fortawesome/free-solid-svg-icons";
import { AUTH_UPDATED_EVENT, getCurrentCustomer } from "@/lib/cart-client";

type Prize = { id: string; label: string };
type PublicCampaignPayload = { campaign: { id: string; name: string; description: string; prizes: Prize[] } | null };
type EligibilityPayload = PublicCampaignPayload & { remainingSpins: number };
type SpinPayload = {
  prize: Prize & { type: "coins" | "coupon" | "try_again"; value: number; couponCode: string };
  rewardGranted: boolean;
  rewardMessage: string;
  remainingSpins: number;
};
type ApiResponse<T> = { success: boolean; message: string; data?: T };

const segmentColors = ["#2da84b", "#d71920", "#f0ad22", "#1d67b1", "#6a2db7", "#e03030"];

export function SpinWheel() {
  const pathname = usePathname();
  const [campaign, setCampaign] = useState<PublicCampaignPayload["campaign"]>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [remainingSpins, setRemainingSpins] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const [rewardResult, setRewardResult] = useState<SpinPayload | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);

      try {
        const publicResponse = await fetch("/api/v1/public/spin-wheel", {
          cache: "no-store",
        });
        const publicBody =
          (await publicResponse.json()) as ApiResponse<PublicCampaignPayload>;

        if (!publicResponse.ok || !publicBody.success || !publicBody.data) {
          throw new Error(publicBody.message || "Unable to load spin wheel.");
        }

        if (!active) return;
        setCampaign(publicBody.data.campaign);

        const signedIn = await getCurrentCustomer();
        if (!active) return;

        setAuthenticated(signedIn);
        setRemainingSpins(0);

        if (signedIn) {
          const response = await fetch("/api/v1/customer/rewards/spin-wheel", {
            cache: "no-store",
            credentials: "include",
          });
          const body = (await response.json()) as ApiResponse<EligibilityPayload>;

          if (!active) return;

          if (response.ok && body.success && body.data) {
            setCampaign(body.data.campaign);
            setRemainingSpins(body.data.remainingSpins);
          } else {
            throw new Error(body.message || "Unable to load spin eligibility.");
          }
        }
      } catch (reason) {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load spin wheel.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    function refreshAfterAuthChange() {
      setError(null);
      void load();
    }

    void load();
    window.addEventListener(AUTH_UPDATED_EVENT, refreshAfterAuthChange);
    window.addEventListener("focus", refreshAfterAuthChange);

    return () => {
      active = false;
      window.removeEventListener(AUTH_UPDATED_EVENT, refreshAfterAuthChange);
      window.removeEventListener("focus", refreshAfterAuthChange);
    };
  }, [pathname]);

  const prizes = useMemo<Prize[]>(() => campaign?.prizes ?? [], [campaign]);
  const wheelBackground = useMemo(() => {
    if (prizes.length === 0) return "#ece7df";
    const slice = 360 / prizes.length;
    return `conic-gradient(${prizes.map((_, index) => `${segmentColors[index % segmentColors.length]} ${index * slice}deg ${(index + 1) * slice}deg`).join(",")})`;
  }, [prizes]);

  function signInToSpin() {
    window.location.assign(`/login?returnTo=${encodeURIComponent(pathname || "/rewards")}`);
  }

  async function spin() {
    if (!authenticated) {
      signInToSpin();
      return;
    }
    if (spinning || remainingSpins <= 0 || prizes.length === 0) return;
    setSpinning(true);
    setResult(null);
    setRewardResult(null);
    setCopied(false);
    setError(null);
    try {
      const response = await fetch("/api/v1/customer/rewards/spin-wheel", { method: "POST", credentials: "include" });
      const body = (await response.json()) as ApiResponse<SpinPayload>;
      if (!response.ok || !body.success || !body.data) throw new Error(body.message || "Unable to spin right now.");
      const selectedIndex = Math.max(0, prizes.findIndex((prize) => prize.id === body.data?.prize.id));
      const slice = 360 / prizes.length;
      const targetCenter = selectedIndex * slice + slice / 2;
      const currentModulo = ((rotation % 360) + 360) % 360;
      setRotation(rotation + 360 * 6 + (360 - targetCenter - currentModulo));
      setRemainingSpins(body.data.remainingSpins);
      window.setTimeout(() => {
        const payload = body.data;
        const prize = payload?.prize;
        const suffix = prize?.type === "coupon" && prize.couponCode ? ` — code ${prize.couponCode}` : "";
        setResult(`${prize?.label ?? "Prize"}${suffix}`);
        if (payload) setRewardResult(payload);
        setSpinning(false);
      }, 4200);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to spin right now.");
      setSpinning(false);
    }
  }


  async function copyCouponCode() {
    const code = rewardResult?.prize.couponCode;
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Unable to copy the coupon code. Please copy it manually.");
    }
  }

  function closeRewardPopup() {
    setRewardResult(null);
    setCopied(false);
  }

  const disabled = loading || spinning || (authenticated && (remainingSpins <= 0 || prizes.length === 0));
  const buttonLabel = !authenticated ? "Sign In to Spin" : spinning ? "Spinning..." : remainingSpins > 0 ? "Spin Now" : "Come Back Tomorrow";

  return (
    <div className="grid h-full gap-5 lg:grid-cols-[.78fr_1.22fr] lg:items-center">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-[#fff1dd] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a45c06]"><FontAwesomeIcon icon={faWandMagicSparkles} className="h-3" /> Daily reward</div>
        <h3 className="mt-3 text-2xl font-black uppercase tracking-[-0.04em] text-[#25211d]">{campaign?.name ?? "Daily Spin & Win"}</h3>
        <p className="mt-1 text-sm font-extrabold text-[#d71920]">{loading ? "Loading today’s campaign..." : !authenticated ? "Sign in to unlock your daily spin." : campaign ? `${remainingSpins} spin${remainingSpins === 1 ? "" : "s"} remaining today.` : "No active campaign right now."}</p>
        {campaign?.description ? <p className="mt-3 text-xs font-semibold text-[#62574e]">{campaign.description}</p> : null}
        <button type="button" onClick={authenticated ? spin : signInToSpin} disabled={disabled} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[#d71920] px-5 text-[11px] font-black uppercase text-white shadow-[0_12px_24px_rgba(215,25,32,.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
          <FontAwesomeIcon icon={!authenticated ? faRightToBracket : spinning ? faRotate : faGift} className={`h-3.5 ${spinning ? "animate-spin" : ""}`} />{buttonLabel}
        </button>
        <div className="mt-3 min-h-6 text-xs font-black" aria-live="polite">{result ? <span className="text-[#26733b]">You won {result}!</span> : null}{error ? <span className="text-[#b42318]">{error}</span> : null}</div>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-[255px]">
        <div className="absolute left-1/2 top-[-8px] z-20 -translate-x-1/2 border-x-[11px] border-t-[22px] border-x-transparent border-t-[#1f2327] drop-shadow-md" />
        <div className="absolute inset-0 rounded-full bg-[#efc06e] p-[10px] shadow-[0_18px_42px_rgba(72,42,18,.2)]"><div className="h-full rounded-full bg-[#7e4d15] p-[7px]"><div className="relative h-full rounded-full border-[5px] border-[#f8df9e] transition-transform duration-[4200ms] ease-[cubic-bezier(.12,.7,.08,1)]" style={{ background: wheelBackground, transform: `rotate(${rotation}deg)` }}>{prizes.map((prize, index) => { const angle = index * (360 / prizes.length) + 360 / prizes.length / 2; return <span key={prize.id} className="pointer-events-none absolute left-1/2 top-1/2 flex w-[62px] items-center justify-center text-center text-[8px] font-black uppercase leading-[1.05] text-white drop-shadow-[0_1px_1px_rgba(0,0,0,.45)]" style={{ transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-72px) rotate(${-angle}deg)` }}>{prize.label}</span>; })}</div></div></div>
        {!authenticated ? <div className="absolute inset-[17px] z-10 grid place-items-center rounded-full bg-black/35 backdrop-blur-[1px]"><div className="grid h-20 w-20 place-items-center rounded-full border-4 border-[#f2bd54] bg-[#fff7dd] text-[#34200a] shadow-xl"><FontAwesomeIcon icon={faLock} className="h-7" /></div></div> : null}
        <button type="button" onClick={authenticated ? spin : signInToSpin} disabled={disabled} className="absolute left-1/2 top-1/2 z-20 grid h-[68px] w-[68px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[5px] border-[#f2bd54] bg-[#ffd74f] text-[10px] font-black uppercase text-[#34200a] shadow-[0_5px_14px_rgba(42,24,7,.35)] disabled:cursor-not-allowed disabled:opacity-70" aria-label={authenticated ? "Spin the reward wheel" : "Sign in to unlock the reward wheel"}>{authenticated ? "Spin" : <FontAwesomeIcon icon={faLock} className="h-5" />}</button>
      </div>

      <AnimatePresence>
        {rewardResult ? (
          <motion.div
            className="fixed inset-0 z-[100] grid place-items-center bg-black/60 px-4 py-8 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="presentation"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) closeRewardPopup();
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="spin-reward-title"
              aria-describedby="spin-reward-description"
              initial={{ opacity: 0, scale: 0.9, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/70 bg-[#fffaf3] p-6 text-center shadow-[0_30px_90px_rgba(0,0,0,.35)] sm:p-8"
            >
              <button
                type="button"
                onClick={closeRewardPopup}
                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-black/5 text-[#34200a] transition hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d71920]"
                aria-label="Close reward popup"
              >
                <FontAwesomeIcon icon={faXmark} className="h-4" />
              </button>

              <motion.div
                initial={{ rotate: -12, scale: 0.7 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.08, type: "spring", stiffness: 280, damping: 18 }}
                className="mx-auto grid h-24 w-24 place-items-center rounded-full border-[7px] border-[#f4c960] bg-gradient-to-br from-[#ffe994] to-[#ffc72c] text-[#542f00] shadow-[0_18px_36px_rgba(216,151,17,.28)]"
              >
                <FontAwesomeIcon icon={rewardResult.prize.type === "try_again" ? faRotate : faGift} className="h-9" />
              </motion.div>

              <p className="mt-5 text-[11px] font-black uppercase tracking-[0.18em] text-[#d71920]">
                {rewardResult.rewardGranted ? "Reward granted" : "Spin completed"}
              </p>
              <h3 id="spin-reward-title" className="mt-2 text-3xl font-black uppercase tracking-[-0.045em] text-[#25211d]">
                {rewardResult.prize.label}
              </h3>
              <p id="spin-reward-description" className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-6 text-[#62574e]">
                {rewardResult.rewardMessage}
              </p>

              {rewardResult.prize.type === "coupon" && rewardResult.prize.couponCode ? (
                <div className="mt-5 rounded-2xl border border-dashed border-[#d9b15a] bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8b6a22]">Your coupon code</p>
                  <div className="mt-2 flex items-center justify-center gap-3">
                    <span className="text-xl font-black tracking-[0.12em] text-[#25211d]">{rewardResult.prize.couponCode}</span>
                    <button
                      type="button"
                      onClick={copyCouponCode}
                      className="grid h-9 w-9 place-items-center rounded-xl bg-[#f7ead0] text-[#7a5310] transition hover:bg-[#f1ddb7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d71920]"
                      aria-label="Copy coupon code"
                    >
                      <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="h-3.5" />
                    </button>
                  </div>
                  {copied ? <p className="mt-2 text-xs font-black text-[#26733b]" aria-live="polite">Coupon code copied.</p> : null}
                </div>
              ) : null}

              <button
                type="button"
                onClick={closeRewardPopup}
                className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#d71920] px-5 text-xs font-black uppercase tracking-[0.08em] text-white shadow-[0_14px_28px_rgba(215,25,32,.24)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d71920] focus-visible:ring-offset-2"
              >
                {rewardResult.prize.type === "coupon" ? "Use at checkout" : "Awesome"}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
