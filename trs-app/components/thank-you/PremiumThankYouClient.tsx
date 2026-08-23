"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const highlights = [
  { label: "Made fresh", value: "With care" },
  { label: "100% vegetarian", value: "Always" },
  { label: "TRS experience", value: "Premium" },
];

export function PremiumThankYouClient() {
  return (
    <main className="relative isolate min-h-[calc(100vh-5rem)] overflow-hidden bg-[#fff8eb] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_12%_18%,rgba(226,177,68,0.22),transparent_26%),radial-gradient(circle_at_88%_10%,rgba(200,16,46,0.14),transparent_25%),linear-gradient(145deg,#fffaf1_0%,#fff4dd_48%,#fffaf3_100%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.28] [background-image:linear-gradient(rgba(90,36,24,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(90,36,24,0.06)_1px,transparent_1px)] [background-size:34px_34px]"
        aria-hidden="true"
      />

      <motion.div
        className="pointer-events-none absolute -left-20 top-16 h-64 w-64 rounded-full border border-[#d6a941]/25"
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        aria-hidden="true"
      >
        <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-[#c8102e] shadow-[0_0_28px_rgba(200,16,46,0.55)]" />
      </motion.div>

      <motion.div
        className="pointer-events-none absolute -right-24 bottom-2 h-80 w-80 rounded-full border border-[#c8102e]/15"
        animate={{ rotate: -360 }}
        transition={{ duration: 34, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        aria-hidden="true"
      >
        <span className="absolute bottom-8 left-4 h-4 w-4 rounded-full bg-[#d6a941] shadow-[0_0_30px_rgba(214,169,65,0.6)]" />
      </motion.div>

      <div className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-6xl items-center justify-center">
        <motion.section
          initial={{ opacity: 0, y: 24, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full overflow-hidden rounded-[2.25rem] border border-white/80 bg-white/88 shadow-[0_35px_110px_rgba(88,47,24,0.18)] backdrop-blur-xl"
        >
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#7f091e] via-[#c8102e] to-[#d6a941]" aria-hidden="true" />

          <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
            <div className="relative flex flex-col justify-center px-6 py-12 text-center sm:px-10 sm:py-16 lg:px-14 lg:py-20 lg:text-left">
              <motion.div
                initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ delay: 0.16, type: "spring", stiffness: 180, damping: 15 }}
                className="mx-auto grid h-24 w-24 place-items-center rounded-[2rem] bg-gradient-to-br from-[#d7193f] to-[#a80723] text-white shadow-[0_20px_45px_rgba(200,16,46,0.30)] lg:mx-0"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <motion.path
                    d="m5 12 4 4L19 6"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.42, duration: 0.55, ease: "easeOut" }}
                  />
                </svg>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24, duration: 0.45 }}
                className="mt-7 text-xs font-black uppercase tracking-[0.3em] text-[#b27b16]"
              >
                The Rolling Stove
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.55 }}
                className="mt-3 text-5xl font-black tracking-[-0.055em] text-[#4b1d14] sm:text-6xl lg:text-7xl"
              >
                Thank You<span className="text-[#c8102e]">.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38, duration: 0.5 }}
                className="mx-auto mt-5 max-w-xl text-xl font-bold leading-relaxed text-[#643224] lg:mx-0 sm:text-2xl"
              >
                Thanks for choosing TRS.
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.46, duration: 0.5 }}
                className="mx-auto mt-2 max-w-lg text-base leading-7 text-[#7b655c] lg:mx-0"
              >
                Your support means a lot to us. We hope every bite made your day a little better—and we cannot wait to serve you again.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.54, duration: 0.5 }}
                className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start"
              >
                <Link
                  href="/"
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#c8102e] px-7 py-3.5 text-sm font-black text-white shadow-[0_14px_30px_rgba(200,16,46,0.25)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#a90d27] hover:shadow-[0_18px_38px_rgba(200,16,46,0.32)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c8102e]/25"
                >
                  Back to Home
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
                <Link
                  href="/menu"
                  className="inline-flex min-h-13 items-center justify-center rounded-full border border-[#d9bd82] bg-[#fffaf0] px-7 py-3.5 text-sm font-black text-[#5a2418] transition duration-300 hover:-translate-y-0.5 hover:border-[#c8102e]/35 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d6a941]/25"
                >
                  Explore Menu
                </Link>
              </motion.div>
            </div>

            <div className="relative hidden min-h-[620px] overflow-hidden bg-[#201712] lg:block">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_25%,rgba(214,169,65,0.28),transparent_28%),radial-gradient(circle_at_30%_78%,rgba(200,16,46,0.24),transparent_30%),linear-gradient(145deg,#2d2019_0%,#17110e_100%)]" />
              <div className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle,#fff_1px,transparent_1px)] [background-size:24px_24px]" />

              <motion.div
                initial={{ opacity: 0, scale: 0.9, rotate: -4 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.36, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-10 rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 backdrop-blur-sm"
              >
                <div className="flex h-full flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 text-[#e2b144]">
                      <span className="h-px w-10 bg-current" />
                      <span className="text-xs font-black uppercase tracking-[0.24em]">Until next time</span>
                    </div>
                    <p className="mt-7 max-w-sm text-4xl font-black leading-tight tracking-[-0.04em] text-white">
                      Good food.<br />Great moments.<br /><span className="text-[#e2b144]">Made for you.</span>
                    </p>
                  </div>

                  <div className="space-y-3">
                    {highlights.map((item, index) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, x: 18 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.62 + index * 0.1, duration: 0.45 }}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.07] px-5 py-4"
                      >
                        <span className="text-sm font-semibold text-white/65">{item.label}</span>
                        <span className="text-sm font-black text-white">{item.value}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="border-t border-[#ead9b9] bg-[#fffaf1] px-6 py-4 text-center text-xs font-semibold text-[#836d63] sm:px-10">
            See you again soon — with the same warmth, flavour, and TRS hospitality.
          </div>
        </motion.section>
      </div>
    </main>
  );
}
