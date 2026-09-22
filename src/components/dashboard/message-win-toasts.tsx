"use client";

import { useCallback, useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { playMessageNotificationSound, setStoredNotificationSound, isNotificationSoundId } from "@/lib/audio/message-notification-sound";
import type { TeamLiveEvent } from "@/types/database";

const ROTATE_MS = 40_000;
const RECENT_LIMIT = 25;

function formatMessageToast(event: TeamLiveEvent): { title: string; description: string } {
  const summary = event.summary?.trim() || "got a message";
  const gigMatch = summary.match(/·\s*(.+)$/);
  const gig = gigMatch?.[1]?.trim();
  const baseSummary = gig ? summary.replace(/\s*·\s*.+$/, "").trim() : summary;

  return {
    title: `${event.actor_name} ${baseSummary}`,
    description: gig
      ? `Gig: ${gig} · Tap to see all their messages`
      : "Tap to see all messages this member received",
  };
}

function activityHref(event: TeamLiveEvent): string | null {
  if (event.team_member_id) {
    return `/message-activity/${event.team_member_id}?period=this_week`;
  }
  if (event.href?.includes("/message-activity/")) {
    return event.href;
  }
  return event.href || null;
}

/**
 * Member dashboard: toast every 40s rotating who got a message,
 * with a Fiverr-style notification sound from the bottom-right.
 * Click opens that member's full message activity list.
 */
export function MessageWinToasts() {
  const supabase = createClient();
  const queueRef = useRef<TeamLiveEvent[]>([]);
  const indexRef = useRef(0);
  const seenIds = useRef(new Set<string>());
  const unlockedAudio = useRef(false);

  const showToast = useCallback((event: TeamLiveEvent) => {
    const { title, description } = formatMessageToast(event);
    const href = activityHref(event);
    playMessageNotificationSound();
    toast.custom(
      (id) => (
        <button
          type="button"
          onClick={() => {
            toast.dismiss(id);
            if (href) window.location.assign(href);
          }}
          className="w-[356px] max-w-[calc(100vw-2rem)] rounded-xl border border-[#7b1e3a]/20 bg-white p-3.5 text-left shadow-lg shadow-black/10 transition hover:border-[#7b1e3a]/40 hover:bg-[#fceef2]/40"
        >
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7b1e3a]/10 text-[#7b1e3a]">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-neutral-900 leading-snug">{title}</p>
              <p className="mt-1 text-xs text-neutral-500 leading-snug">{description}</p>
              {href ? (
                <p className="mt-2 text-xs font-semibold text-[#7b1e3a]">View all messages →</p>
              ) : null}
            </div>
          </div>
        </button>
      ),
      { duration: 8_000 }
    );
  }, []);

  const showNextFromQueue = useCallback(() => {
    const queue = queueRef.current;
    if (queue.length === 0) return;
    const event = queue[indexRef.current % queue.length];
    indexRef.current = (indexRef.current + 1) % queue.length;
    if (event) showToast(event);
  }, [showToast]);

  useEffect(() => {
    function unlock() {
      if (unlockedAudio.current) return;
      unlockedAudio.current = true;
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        void ctx.resume().then(() => void ctx.close());
      } catch {
        // ignore
      }
    }
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && !cancelled) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("notification_sound_id")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.notification_sound_id) {
          if (isNotificationSoundId(profile.notification_sound_id)) {
            setStoredNotificationSound(profile.notification_sound_id);
          }
        }
      }

      const { data } = await supabase
        .from("team_live_events")
        .select("id, kind, actor_name, summary, href, team_member_id, created_by, created_at")
        .eq("kind", "message")
        .order("created_at", { ascending: false })
        .limit(RECENT_LIMIT);

      if (cancelled) return;

      const rows = ((data as TeamLiveEvent[]) ?? []).filter((r) => r?.id);
      queueRef.current = rows;
      rows.forEach((r) => seenIds.current.add(r.id));

      if (rows.length > 0) {
        setTimeout(() => {
          if (!cancelled) showNextFromQueue();
        }, 2_500);
      }
    }

    boot();

    const channel = supabase
      .channel("member-message-win-toasts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_live_events" },
        (payload) => {
          const row = payload.new as TeamLiveEvent;
          if (!row?.id || row.kind !== "message") return;
          if (seenIds.current.has(row.id)) return;
          seenIds.current.add(row.id);
          queueRef.current = [row, ...queueRef.current.filter((e) => e.id !== row.id)].slice(
            0,
            RECENT_LIMIT
          );
          showToast(row);
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      showNextFromQueue();
    }, ROTATE_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [supabase, showNextFromQueue, showToast]);

  return null;
}
