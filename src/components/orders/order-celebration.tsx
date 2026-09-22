"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Gift, PartyPopper, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  enqueueOrderGift,
  loadOrderGiftJobs,
  markOrderGiftShown,
  msUntilNextOrderGift,
  ORDER_GIFT_ELIGIBLE_MS,
  peekDueOrderGift,
  type OrderGiftJob,
} from "@/lib/orders/order-gift-queue";
import type { TeamLiveEvent } from "@/types/database";

interface OrderCelebrationProps {
  open: boolean;
  memberName: string;
  gigName?: string | null;
  amountLabel?: string | null;
  onClose: () => void;
  /** When true, copy is "You got an order!" for the recorder */
  selfWin?: boolean;
}

/** Full-screen win celebration when a member records an order (recorder's own screen). */
export function OrderCelebration({
  open,
  memberName,
  gigName,
  amountLabel,
  onClose,
  selfWin = true,
}: OrderCelebrationProps) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        id: i,
        left: `${(i * 17) % 100}%`,
        delay: `${(i % 12) * 0.08}s`,
        duration: `${2.4 + (i % 5) * 0.35}s`,
        color: ["#7b1e3a", "#a33b5c", "#5c1228", "#c4a484", "#f6e8ec", "#ffffff"][i % 6],
        rotate: `${(i * 47) % 360}deg`,
        size: 6 + (i % 5) * 2,
      })),
    []
  );

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(onClose, 6500);
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-emerald-950/70 backdrop-blur-sm" onClick={onClose} />
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
              transform: `rotate(${p.rotate})`,
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-[#5c1228] via-[#7b1e3a] to-[#3d0c1c] p-8 text-center text-white shadow-2xl order-win-pop">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full bg-white/10 p-1.5 hover:bg-white/20"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#7b1e3a] shadow-lg order-win-bounce">
          <Gift className="h-8 w-8" />
        </div>
        <p className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-100">
          <Sparkles className="h-3.5 w-3.5 text-rose-200" />
          Order win
        </p>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight">
          {selfWin ? "You got an order!" : `${memberName} got an order!`}
        </h2>
        <p className="mt-2 text-rose-50/90 text-base">
          {selfWin ? (
            <>
              <strong className="text-white">{memberName}</strong> just locked in a win for the team.
            </>
          ) : (
            <>Celebrate with them — keep the wins coming.</>
          )}
        </p>
        {(gigName || amountLabel) && (
          <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-sm">
            {gigName && <p className="font-semibold text-white">{gigName}</p>}
            {amountLabel && <p className="text-rose-200 font-bold mt-1">{amountLabel}</p>}
          </div>
        )}
        <div className="mt-6 flex justify-center">
          <Button
            onClick={onClose}
            className="bg-white text-[#5c1228] hover:bg-rose-50 font-semibold gap-2"
          >
            <PartyPopper className="h-4 w-4" />
            Keep the momentum
          </Button>
        </div>
      </div>
    </div>
  );
}

type GiftPhase = "idle" | "box" | "explode" | "reveal";

/**
 * Team-wide gift-box celebration:
 * - Shows on every member dashboard when someone records an order
 * - Gift appears, then auto-explodes open with the winner's name
 * - Repeats a second time after 30 minutes (persisted if they left the site)
 */
export function OrderGiftBroadcast() {
  const supabase = createClient();
  const [phase, setPhase] = useState<GiftPhase>("idle");
  const [active, setActive] = useState<OrderGiftJob | null>(null);
  const phaseRef = useRef<GiftPhase>("idle");

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: `${(i * 19) % 100}%`,
        delay: `${(i % 10) * 0.07}s`,
        duration: `${2.1 + (i % 4) * 0.3}s`,
        color: ["#7b1e3a", "#a33b5c", "#5c1228", "#c4a484", "#fbbf24", "#fff"][i % 6],
        size: 7 + (i % 4) * 2,
      })),
    []
  );

  const runShow = useCallback((job: OrderGiftJob) => {
    setActive(job);
    setPhase("box");
  }, []);

  const tryShowNext = useCallback(() => {
    if (phaseRef.current !== "idle") return;
    const due = peekDueOrderGift();
    if (due) runShow(due);
  }, [runShow]);

  const finishShow = useCallback(() => {
    if (active) markOrderGiftShown(active.id);
    setActive(null);
    setPhase("idle");
    phaseRef.current = "idle";
    setTimeout(() => tryShowNext(), 450);
  }, [active, tryShowNext]);

  // Animation timeline: box → explode → reveal → done
  useEffect(() => {
    if (phase === "box") {
      const t = setTimeout(() => setPhase("explode"), 1600);
      return () => clearTimeout(t);
    }
    if (phase === "explode") {
      const t = setTimeout(() => setPhase("reveal"), 900);
      return () => clearTimeout(t);
    }
    if (phase === "reveal") {
      const t = setTimeout(() => finishShow(), 5200);
      return () => clearTimeout(t);
    }
  }, [phase, finishShow]);

  // Boot: sync recent order events into the gift queue + schedule
  useEffect(() => {
    let cancelled = false;
    let waitTimer: ReturnType<typeof setTimeout> | null = null;

    function armWaitTimer() {
      if (waitTimer) clearTimeout(waitTimer);
      const ms = msUntilNextOrderGift();
      if (ms == null) return;
      waitTimer = setTimeout(() => {
        tryShowNext();
        armWaitTimer();
      }, ms + 50);
    }

    async function boot() {
      const { data } = await supabase
        .from("team_live_events")
        .select("id, kind, actor_name, summary, created_at")
        .eq("kind", "order")
        .order("created_at", { ascending: false })
        .limit(15);

      if (cancelled) return;

      const now = Date.now();
      for (const row of (data as TeamLiveEvent[]) ?? []) {
        const age = now - new Date(row.created_at).getTime();
        if (age <= ORDER_GIFT_ELIGIBLE_MS) {
          enqueueOrderGift({
            id: row.id,
            actorName: row.actor_name,
            createdAt: row.created_at,
          });
        }
      }

      tryShowNext();
      armWaitTimer();
    }

    boot();

    const channel = supabase
      .channel("order-gift-broadcast")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_live_events" },
        (payload) => {
          const row = payload.new as TeamLiveEvent;
          if (!row?.id || row.kind !== "order") return;
          enqueueOrderGift({
            id: row.id,
            actorName: row.actor_name,
            createdAt: row.created_at,
          });
          tryShowNext();
          armWaitTimer();
        }
      )
      .subscribe();

    const onFocus = () => {
      // Coming back to the tab/site — deliver any due (including missed) shows
      loadOrderGiftJobs();
      tryShowNext();
      armWaitTimer();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    const interval = setInterval(() => {
      tryShowNext();
    }, 12_000);

    return () => {
      cancelled = true;
      if (waitTimer) clearTimeout(waitTimer);
      clearInterval(interval);
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [supabase, tryShowNext]);

  if (phase === "idle" || !active) return null;

  const showConfetti = phase === "explode" || phase === "reveal";
  const showReveal = phase === "reveal";

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={finishShow} />

      {showConfetti && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {pieces.map((p) => (
            <span
              key={p.id}
              className="order-confetti absolute top-[-12px] rounded-sm"
              style={{
                left: p.left,
                width: p.size,
                height: p.size * 1.35,
                background: p.color,
                animationDelay: p.delay,
                animationDuration: p.duration,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center">
        {(phase === "box" || phase === "explode") && (
          <div
            className={`relative ${phase === "box" ? "order-gift-shake" : "order-gift-explode"}`}
            aria-hidden={phase === "explode"}
          >
            <div className="relative h-36 w-36 sm:h-44 sm:w-44">
              <div className="absolute inset-x-4 bottom-2 top-14 rounded-2xl bg-gradient-to-b from-brand-orange to-brand-orange-dark shadow-2xl" />
              <div className="absolute inset-x-2 top-10 h-10 rounded-xl bg-brand-orange-dark/90 shadow-md" />
              <div className="absolute left-1/2 top-8 h-[72%] w-7 -translate-x-1/2 bg-brand-green shadow-sm" />
              <div className="absolute left-1/2 top-6 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-green text-white shadow-lg">
                <Gift className="h-6 w-6" />
              </div>
              <div className="absolute -right-1 top-16 h-8 w-8 rounded-full bg-brand-green-light/80 blur-[1px]" />
              <div className="absolute -left-2 bottom-8 h-6 w-6 rounded-full bg-white/40" />
            </div>
            {phase === "box" && (
              <p className="mt-5 text-center text-sm font-semibold text-white drop-shadow">
                New team gift…
              </p>
            )}
          </div>
        )}

        {showReveal && (
          <div className="w-full max-w-sm rounded-3xl border border-white/20 bg-gradient-to-br from-[#5c1228] via-[#7b1e3a] to-[#3d0c1c] p-7 text-center text-white shadow-2xl order-win-pop">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-100">
              <Sparkles className="h-3.5 w-3.5 text-rose-200" />
              Team order win
              {active.shownCount === 1 ? " · encore" : ""}
            </p>
            <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              {active.actorName} got an order!
            </h2>
            <p className="mt-2 text-sm text-rose-50/90">
              The gift opened — celebrate this win with the team.
            </p>
            <Button
              onClick={finishShow}
              className="mt-5 bg-white text-[#5c1228] hover:bg-rose-50 font-semibold gap-2"
            >
              <PartyPopper className="h-4 w-4" />
              Awesome
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
