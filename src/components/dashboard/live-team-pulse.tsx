"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Briefcase, MessageSquare, Radio } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { RelativeTime } from "@/components/shared/relative-time";
import type { TeamLiveEvent } from "@/types/database";
import { cn } from "@/lib/utils";

const MAX_VISIBLE = 8;
const CHIP_HOLD_MS = 14_000;

type PulseItem = TeamLiveEvent & { exiting?: boolean };

interface LiveTeamPulseProps {
  /** embedded = sits inside dark admin hero */
  variant?: "default" | "embedded";
}

export function LiveTeamPulse({ variant = "default" }: LiveTeamPulseProps) {
  const supabase = createClient();
  const [items, setItems] = useState<PulseItem[]>([]);
  const [ready, setReady] = useState(false);
  const seenIds = useRef(new Set<string>());
  const exitTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const embedded = variant === "embedded";

  const scheduleExit = useCallback((id: string) => {
    if (exitTimers.current.has(id)) return;
    const timer = setTimeout(() => {
      setItems((prev) =>
        prev.map((e) => (e.id === id ? { ...e, exiting: true } : e))
      );
      setTimeout(() => {
        setItems((prev) => prev.filter((e) => e.id !== id));
        exitTimers.current.delete(id);
      }, 450);
    }, CHIP_HOLD_MS);
    exitTimers.current.set(id, timer);
  }, []);

  const pushEvent = useCallback(
    (event: TeamLiveEvent, options?: { toast?: boolean; autoExit?: boolean }) => {
      if (seenIds.current.has(event.id)) return;
      seenIds.current.add(event.id);

      setItems((prev) => {
        const next = [event, ...prev.filter((e) => e.id !== event.id)];
        return next.slice(0, MAX_VISIBLE);
      });

      if (options?.toast) {
        toast.message(`${event.actor_name} ${event.summary}`, {
          description: "Live team activity",
          duration: 4000,
        });
      }

      if (options?.autoExit !== false) {
        scheduleExit(event.id);
      }
    },
    [scheduleExit]
  );

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const { data } = await supabase
        .from("team_live_events")
        .select("id, kind, actor_name, summary, href, created_by, created_at")
        .order("created_at", { ascending: false })
        .limit(15);

      if (cancelled) return;

      const rows = (data as TeamLiveEvent[]) ?? [];
      rows.forEach((row) => seenIds.current.add(row.id));
      setItems(rows.slice(0, MAX_VISIBLE));
      setReady(true);
    }

    boot();

    const channel = supabase
      .channel(`team-live-pulse-${variant}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_live_events" },
        (payload) => {
          const row = payload.new as TeamLiveEvent;
          if (!row?.id) return;
          pushEvent(row, { toast: true, autoExit: true });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      exitTimers.current.forEach((t) => clearTimeout(t));
      exitTimers.current.clear();
      void supabase.removeChannel(channel);
    };
  }, [supabase, pushEvent, variant]);

  if (!ready && items.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl px-4 py-3 flex items-center gap-2 text-sm",
          embedded
            ? "border border-white/15 bg-white/5 text-emerald-100/80"
            : "border border-neutral-200/80 bg-white/80 text-neutral-400"
        )}
      >
        <Radio className="h-4 w-4 animate-pulse" />
        Connecting to live team activity…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "live-pulse-empty rounded-xl border border-dashed px-4 py-3.5 flex items-center gap-3",
          embedded
            ? "border-white/25 bg-white/5"
            : "border-neutral-200 bg-gradient-to-r from-white via-brand-green-light/10 to-brand-orange-light/20"
        )}
      >
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            embedded ? "bg-white/10 text-brand-orange" : "bg-brand-green/10 text-brand-green"
          )}
        >
          <Radio className="h-4 w-4" />
        </div>
        <div>
          <p className={cn("text-sm font-semibold", embedded ? "text-white" : "text-neutral-800")}>
            Waiting for the first ping…
          </p>
          <p className={cn("text-xs mt-0.5", embedded ? "text-emerald-100/70" : "text-neutral-500")}>
            When someone records a message or account, it slides through here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        embedded
          ? "rounded-xl"
          : "rounded-2xl border border-brand-green/20 bg-gradient-to-r from-white via-brand-green-light/15 to-brand-orange-light/25 shadow-sm"
      )}
    >
      {!embedded && (
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-brand-green to-brand-orange" />
      )}
      <div className={cn("flex items-center gap-3", embedded ? "px-0 py-0" : "pl-4 pr-3 py-3")}>
        {!embedded && (
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-green" />
            </span>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-green-dark">Live</p>
          </div>
        )}

        <div className="live-pulse-track flex gap-3 overflow-x-auto pb-0.5 min-w-0 flex-1">
          {items.map((event) => {
            const Icon = event.kind === "account" ? Briefcase : MessageSquare;
            const chip = (
              <div
                className={cn(
                  "live-pulse-chip inline-flex items-center gap-2 rounded-full border px-3.5 py-2 whitespace-nowrap shadow-sm",
                  event.exiting ? "live-pulse-exit" : "live-pulse-enter",
                  embedded
                    ? event.kind === "account"
                      ? "border-emerald-300/30 bg-white text-neutral-900"
                      : "border-amber-300/40 bg-white text-neutral-900"
                    : event.kind === "account"
                      ? "border-brand-green/25 bg-white text-neutral-800"
                      : "border-brand-orange/30 bg-white text-neutral-800"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full",
                    event.kind === "account"
                      ? "bg-brand-green-light text-brand-green-dark"
                      : "bg-brand-orange-light text-brand-orange-dark"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm">
                  <strong className="font-semibold">{event.actor_name}</strong>{" "}
                  <span className="text-neutral-600">{event.summary}</span>
                </span>
                <RelativeTime
                  iso={event.created_at}
                  className="text-xs text-neutral-400 font-medium"
                />
              </div>
            );

            return event.href ? (
              <Link key={event.id} href={event.href} className="shrink-0 hover:opacity-90 transition-opacity">
                {chip}
              </Link>
            ) : (
              <div key={event.id} className="shrink-0">
                {chip}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
