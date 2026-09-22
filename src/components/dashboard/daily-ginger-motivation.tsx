"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame, PartyPopper, Sparkles, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "ut_daily_ginger_v1";

const MESSAGES = [
  {
    headline: "Your next order is loading…",
    body: "Stay sharp today. Every account you open and every message you send puts you closer to the win.",
  },
  {
    headline: "Ginger up — the team needs you!",
    body: "Even on quiet days, consistency builds the breakthrough. Log your prospects, keep applying, keep believing.",
  },
  {
    headline: "Orders love consistent hustlers",
    body: "Show up for your gigs today. One strong outreach can turn into the order that changes your week.",
  },
  {
    headline: "You're built for this",
    body: "UNSTOPPABLE TEAM doesn't wait for luck — we create it. Push your goals today and celebrate every small win.",
  },
  {
    headline: "Keep the fire burning",
    body: "No order yet? Perfect. That means today's work still has room to surprise you. Stay in motion.",
  },
  {
    headline: "Today's seed = tomorrow's order",
    body: "Prospects, messages, and accounts are your pipeline. Fill it with energy and the orders will follow.",
  },
];

function todayLagos(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function alreadyShownToday(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === todayLagos();
  } catch {
    return false;
  }
}

function markShownToday() {
  try {
    localStorage.setItem(STORAGE_KEY, todayLagos());
  } catch {
    // ignore
  }
}

function pickMessage() {
  const day = todayLagos();
  let hash = 0;
  for (let i = 0; i < day.length; i++) hash = (hash + day.charCodeAt(i) * (i + 1)) % MESSAGES.length;
  return MESSAGES[hash] ?? MESSAGES[0];
}

/**
 * Once-per-day motivational popup for every logged-in member —
 * shows even when nobody recorded an order, to ginger the team.
 */
export function DailyGingerMotivation({ displayName }: { displayName?: string }) {
  const [open, setOpen] = useState(false);
  const message = useMemo(() => pickMessage(), []);
  const firstName = displayName?.split(" ")[0] || "champ";

  const pieces = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: `${(i * 17) % 100}%`,
        delay: `${(i % 12) * 0.08}s`,
        duration: `${2.3 + (i % 5) * 0.3}s`,
        color: ["#7b1e3a", "#a33b5c", "#5c1228", "#f6e8ec", "#c4a484", "#ffffff"][i % 6],
        size: 6 + (i % 5) * 2,
      })),
    []
  );

  useEffect(() => {
    if (alreadyShownToday()) return;
    const t = setTimeout(() => setOpen(true), 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function close() {
    markShownToday();
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[78] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#2a0a14]/70 backdrop-blur-sm" onClick={close} />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {pieces.map((p) => (
          <span
            key={p.id}
            className="order-confetti absolute top-[-12px] rounded-sm"
            style={{
              left: p.left,
              width: p.size,
              height: p.size * 1.4,
              background: p.color,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#5c1228] via-[#7b1e3a] to-[#3d0c1c] p-8 text-center text-white shadow-2xl order-win-pop">
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 rounded-full bg-white/10 p-1.5 hover:bg-white/20"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#7b1e3a] shadow-lg order-win-bounce">
          <Flame className="h-8 w-8" />
        </div>
        <p className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-100">
          <Sparkles className="h-3.5 w-3.5 text-rose-200" />
          Daily ginger · once a day
        </p>
        <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
          {message.headline}
        </h2>
        <p className="mt-3 text-rose-50/90 text-sm sm:text-base leading-relaxed">
          Hey <strong className="text-white">{firstName}</strong> — {message.body}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-rose-100/80">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
            <Trophy className="h-3.5 w-3.5" /> Orders are coming
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
            Stay consistent
          </span>
        </div>
        <div className="mt-6 flex justify-center">
          <Button
            onClick={close}
            className="bg-white text-[#5c1228] hover:bg-rose-50 font-semibold gap-2"
          >
            <PartyPopper className="h-4 w-4" />
            I&apos;m ready — let&apos;s go
          </Button>
        </div>
      </div>
    </div>
  );
}
