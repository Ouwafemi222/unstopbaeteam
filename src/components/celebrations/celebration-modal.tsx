"use client";

import { useEffect, useMemo } from "react";
import { PartyPopper, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Celebration } from "@/lib/celebrations/calendar";

export function CelebrationModal({
  celebration,
  onClose,
}: {
  celebration: Celebration;
  onClose: () => void;
}) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        id: i,
        left: `${(i * 23) % 100}%`,
        delay: `${(i % 12) * 0.09}s`,
        duration: `${2.4 + (i % 5) * 0.3}s`,
        color: ["#7b1e3a", "#16a34a", "#f59e0b", "#ffffff", "#a33b5c", "#c4a484"][i % 6],
        size: 6 + (i % 5) * 2,
      })),
    []
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[78] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#2a0a14]/70 backdrop-blur-sm" onClick={onClose} />
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
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full bg-white/10 p-1.5 hover:bg-white/20"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-4 text-7xl leading-none order-win-bounce" aria-hidden>
          {celebration.emoji}
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
          {celebration.title}
        </h2>
        <p className="mt-3 text-rose-50/90 text-sm sm:text-base leading-relaxed">{celebration.body}</p>
        <div className="mt-6 flex justify-center">
          <Button
            onClick={onClose}
            className="bg-white text-[#5c1228] hover:bg-rose-50 font-semibold gap-2"
          >
            <PartyPopper className="h-4 w-4" />
            Thank you!
          </Button>
        </div>
      </div>
    </div>
  );
}
