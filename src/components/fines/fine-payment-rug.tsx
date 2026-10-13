"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Copy, Landmark, X } from "lucide-react";
import { toast } from "sonner";
import {
  FINE_PAYMENT_ACCOUNT,
  fineRugCaptionForToday,
} from "@/lib/fines/payment-account";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "ut_fine_rug_collapsed";

/**
 * Hanging “rug” under the header: rolls down, then swings gently.
 * Compact so it doesn’t block dashboard actions; can collapse to a tab.
 */
export function FinePaymentRug() {
  const [ready, setReady] = useState(false);
  const [swinging, setSwinging] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const caption = fineRugCaptionForToday();

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // ignore
    }
    const t = window.setTimeout(() => setReady(true), 400);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready || collapsed) return;
    const t = window.setTimeout(() => setSwinging(true), 1100);
    return () => window.clearTimeout(t);
  }, [ready, collapsed]);

  function setCollapsedPersist(next: boolean) {
    setCollapsed(next);
    if (next) setSwinging(false);
    try {
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  }

  async function copyAccount() {
    try {
      await navigator.clipboard.writeText(FINE_PAYMENT_ACCOUNT.accountNumber);
      setCopied(true);
      toast.success("Account number copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select the number manually");
    }
  }

  if (collapsed) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-3">
        <button
          type="button"
          onClick={() => setCollapsedPersist(false)}
          className="pointer-events-auto mt-0 flex items-center gap-1.5 rounded-b-xl border border-t-0 border-[#7b1e3a]/40 bg-[#5c1228] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-100 shadow-lg shadow-[#5c1228]/30 hover:bg-[#7b1e3a] transition-colors"
        >
          Fine pay account
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-3 sm:px-4"
      aria-label="Fine payment account"
    >
      <div className={cn("pointer-events-auto w-full max-w-[20.5rem] origin-top", swinging && "fine-rug-swing")}>
        <div className={cn(ready ? "fine-rug-roll" : "opacity-0 -translate-y-full")}>
        {/* Cord / hang points */}
        <div className="mx-auto flex w-[70%] justify-between px-4" aria-hidden>
          <span className="h-2.5 w-0.5 rounded-full bg-[#7b1e3a]/50" />
          <span className="h-2.5 w-0.5 rounded-full bg-[#7b1e3a]/50" />
        </div>

        <div className="relative overflow-hidden rounded-b-2xl border border-[#7b1e3a]/35 border-t-0 bg-gradient-to-b from-[#5c1228] via-[#7b1e3a] to-[#3d0c1c] shadow-xl shadow-[#5c1228]/35">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)",
              backgroundSize: "14px 14px",
            }}
          />
          <div className="pointer-events-none absolute -right-8 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

          <button
            type="button"
            onClick={() => setCollapsedPersist(true)}
            className="absolute right-2 top-2 z-10 rounded-full bg-white/10 p-1 text-rose-100/80 hover:bg-white/20 hover:text-white"
            aria-label="Collapse fine payment banner"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="relative px-4 pb-4 pt-3.5 text-center text-white">
            <p className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-rose-100/90">
              <Landmark className="h-3 w-3" />
              Fine payment
            </p>

            <h2 className="mt-2 text-[15px] sm:text-base font-extrabold leading-snug tracking-tight uppercase">
              {caption}
            </h2>

            <div className="mt-3 rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-left backdrop-blur-[2px]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-200/80">
                Pay into this account
              </p>
              <p className="mt-1 text-sm font-bold text-white">{FINE_PAYMENT_ACCOUNT.bank}</p>
              <p className="mt-0.5 text-xs text-rose-50/90 leading-snug">
                {FINE_PAYMENT_ACCOUNT.accountName}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="font-mono text-lg font-extrabold tracking-wider tabular-nums text-white">
                  {FINE_PAYMENT_ACCOUNT.accountNumber}
                </p>
                <button
                  type="button"
                  onClick={() => void copyAccount()}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/15 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white hover:bg-white/25 transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>

          {/* Fringe */}
          <div className="relative flex justify-center gap-1.5 px-4 pb-1.5" aria-hidden>
            {Array.from({ length: 11 }).map((_, i) => (
              <span
                key={i}
                className="h-2.5 w-0.5 rounded-full bg-rose-200/35"
                style={{ height: i % 2 === 0 ? 10 : 7 }}
              />
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
