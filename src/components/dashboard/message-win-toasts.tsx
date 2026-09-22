"use client";

import { useCallback, useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { playMessageNotificationSound } from "@/lib/audio/message-notification-sound";
import type { TeamLiveEvent } from "@/types/database";

const ROTATE_MS = 40_000;
const RECENT_LIMIT = 25;

function formatMessageToast(event: TeamLiveEvent): { title: string; description: string } {
  const summary = event.summary?.trim() || "got a message";
  // Prefer "Mr Samuel got a message — check it out" + gig in description if present
  const gigMatch = summary.match(/·\s*(.+)$/);
  const gig = gigMatch?.[1]?.trim();
  const baseSummary = gig ? summary.replace(/\s*·\s*.+$/, "").trim() : summary;

  return {
    title: `${event.actor_name} ${baseSummary}`,
    description: gig
      ? `Gig: ${gig} · Check it out`
      : "Check it out — new Fiverr message on the team",
  };
}

/**
 * Member dashboard: toast every 40s rotating who got a message,
 * with a Fiverr-style notification sound. Also fires instantly on new messages.
 */
export function MessageWinToasts() {
  const supabase = createClient();
  const queueRef = useRef<TeamLiveEvent[]>([]);
  const indexRef = useRef(0);
  const seenIds = useRef(new Set<string>());
  const unlockedAudio = useRef(false);

  const showToast = useCallback((event: TeamLiveEvent) => {
    const { title, description } = formatMessageToast(event);
    playMessageNotificationSound();
    toast(title, {
      description,
      duration: 8_000,
      icon: <MessageSquare className="h-4 w-4 text-[#7b1e3a]" />,
      className: "border-[#7b1e3a]/20",
    });
  }, []);

  const showNextFromQueue = useCallback(() => {
    const queue = queueRef.current;
    if (queue.length === 0) return;
    const event = queue[indexRef.current % queue.length];
    indexRef.current = (indexRef.current + 1) % queue.length;
    if (event) showToast(event);
  }, [showToast]);

  // Unlock audio after first user gesture (browser autoplay policy)
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
      const { data } = await supabase
        .from("team_live_events")
        .select("id, kind, actor_name, summary, href, created_by, created_at")
        .eq("kind", "message")
        .order("created_at", { ascending: false })
        .limit(RECENT_LIMIT);

      if (cancelled) return;

      const rows = ((data as TeamLiveEvent[]) ?? []).filter((r) => r?.id);
      queueRef.current = rows;
      rows.forEach((r) => seenIds.current.add(r.id));

      // First toast shortly after landing (after audio unlock chance)
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
          // Instant announce for brand-new messages
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
