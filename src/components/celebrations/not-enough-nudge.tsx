"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Briefcase, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotEnoughNudge({
  firstName,
  noMessages,
  noAccounts,
  onClose,
}: {
  firstName: string;
  noMessages: boolean;
  noAccounts: boolean;
  onClose: () => void;
}) {
  const rain = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        emoji: ["😴", "🐢", "😤", "⏰"][i % 4],
        left: `${(i * 37) % 100}%`,
        delay: `${(i % 10) * 0.15}s`,
        duration: `${3 + (i % 4) * 0.5}s`,
        size: 22 + (i % 4) * 8,
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
    <div className="fixed inset-0 z-[79] flex items-center justify-center overflow-hidden p-4">
      <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-sm" onClick={onClose} />

      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
        aria-hidden
      >
        <span className="nudge-emoji-in leading-none text-[min(85vw,85vh)] opacity-90">😤</span>
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {rain.map((r) => (
          <span
            key={r.id}
            className="order-confetti absolute top-[-40px]"
            style={{
              left: r.left,
              fontSize: r.size,
              animationDelay: r.delay,
              animationDuration: r.duration,
            }}
          >
            {r.emoji}
          </span>
        ))}
      </div>

      <div className="relative w-full max-w-md rounded-3xl border border-red-300/30 bg-neutral-950/80 p-7 text-center text-white shadow-2xl backdrop-blur-md order-win-pop">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full bg-white/10 p-1.5 hover:bg-white/20"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-300">Reality check</p>
        <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
          {firstName}, you aren&apos;t doing enough!
        </h2>
        <ul className="mt-4 space-y-2 text-left text-sm text-neutral-200">
          {noMessages && (
            <li className="flex gap-2 rounded-xl bg-white/5 px-3 py-2.5">
              <MessageSquare className="h-4 w-4 shrink-0 text-red-300 mt-0.5" />
              You haven&apos;t recorded a single message in the last 7 days.
            </li>
          )}
          {noAccounts && (
            <li className="flex gap-2 rounded-xl bg-white/5 px-3 py-2.5">
              <Briefcase className="h-4 w-4 shrink-0 text-red-300 mt-0.5" />
              You haven&apos;t added a new Fiverr account in the last 7 days.
            </li>
          )}
        </ul>
        <p className="mt-4 text-sm text-neutral-300">
          Orders don&apos;t come to people who stand still. Get back in motion today.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          {noMessages && (
            <Button asChild className="bg-white text-neutral-900 hover:bg-neutral-100 font-semibold">
              <Link href="/my-messages/new" onClick={onClose}>
                Record a message
              </Link>
            </Button>
          )}
          {noAccounts && (
            <Button asChild className="bg-white text-neutral-900 hover:bg-neutral-100 font-semibold">
              <Link href="/my-accounts/new" onClick={onClose}>
                Add an account
              </Link>
            </Button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 text-xs text-neutral-400 hover:text-white underline-offset-2 hover:underline"
        >
          I&apos;ll do better
        </button>
      </div>
    </div>
  );
}
