"use client";

import { useEffect, useMemo } from "react";
import { PartyPopper, Sparkles, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderCelebrationProps {
  open: boolean;
  memberName: string;
  gigName?: string | null;
  amountLabel?: string | null;
  onClose: () => void;
}

/** Full-screen win celebration when a member records an order. */
export function OrderCelebration({
  open,
  memberName,
  gigName,
  amountLabel,
  onClose,
}: OrderCelebrationProps) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        id: i,
        left: `${(i * 17) % 100}%`,
        delay: `${(i % 12) * 0.08}s`,
        duration: `${2.4 + (i % 5) * 0.35}s`,
        color: ["#16a34a", "#f59e0b", "#22c55e", "#ea580c", "#fbbf24", "#ffffff"][i % 6],
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

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-emerald-900 via-brand-green-dark to-emerald-800 p-8 text-center text-white shadow-2xl order-win-pop">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full bg-white/10 p-1.5 hover:bg-white/20"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-orange text-white shadow-lg shadow-brand-orange/40 order-win-bounce">
          <Trophy className="h-8 w-8" />
        </div>
        <p className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-100">
          <Sparkles className="h-3.5 w-3.5 text-brand-orange" />
          Order win
        </p>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight">You got an order!</h2>
        <p className="mt-2 text-emerald-50/90 text-base">
          <strong className="text-white">{memberName}</strong> just locked in a win for the team.
        </p>
        {(gigName || amountLabel) && (
          <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-sm">
            {gigName && <p className="font-semibold text-white">{gigName}</p>}
            {amountLabel && <p className="text-brand-orange font-bold mt-1">{amountLabel}</p>}
          </div>
        )}
        <div className="mt-6 flex justify-center">
          <Button
            onClick={onClose}
            className="bg-white text-brand-green-dark hover:bg-emerald-50 font-semibold gap-2"
          >
            <PartyPopper className="h-4 w-4" />
            Keep the momentum
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Compact toast-style celebration for other members' dashboards. */
export function OrderTeamCheer({
  open,
  actorName,
  onClose,
}: {
  open: boolean;
  actorName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[70] w-[min(100%-1.5rem,22rem)] order-win-pop">
      <div className="rounded-2xl border border-brand-orange/30 bg-gradient-to-r from-brand-green to-emerald-800 p-4 text-white shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-orange">
            <Trophy className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">Team win</p>
            <p className="text-sm font-semibold mt-0.5">
              {actorName} got an order!
            </p>
            <p className="text-xs text-emerald-100/80 mt-1">Celebrate with them — keep converting.</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
