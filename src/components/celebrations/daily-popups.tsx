"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  celebrationsFor,
  lagosDateDaysAgo,
  lagosToday,
  markPopupShownToday,
  popupShownToday,
  type Celebration,
  type LagosToday,
  type LiveHoliday,
} from "@/lib/celebrations/calendar";
import { CelebrationModal } from "@/components/celebrations/celebration-modal";
import { NotEnoughNudge } from "@/components/celebrations/not-enough-nudge";
import {
  DailyGingerMotivation,
  gingerShownToday,
} from "@/components/dashboard/daily-ginger-motivation";

const NUDGE_ID = "not-enough";

type Step =
  | { kind: "celebration"; celebration: Celebration }
  | { kind: "nudge"; noMessages: boolean; noAccounts: boolean }
  | { kind: "ginger" };

/** Shows today's popups one at a time: celebrations → inactivity nudge → daily ginger. */
export function DailyPopups({
  displayName,
  teamMemberId,
}: {
  displayName?: string;
  teamMemberId: string | null;
}) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [index, setIndex] = useState(0);
  const todayRef = useRef<LagosToday | null>(null);
  const firstName = displayName?.split(" ")[0] || "champ";

  useEffect(() => {
    let cancelled = false;

    async function build() {
      const today = lagosToday();
      todayRef.current = today;

      let liveHolidays: LiveHoliday[] | null = null;
      try {
        const res = await fetch("/api/holidays/today");
        const data = (await res.json()) as { holidays: LiveHoliday[]; live: boolean };
        if (data.live) liveHolidays = data.holidays;
      } catch {
        // fall back to built-in holidays
      }

      const list: Step[] = celebrationsFor(today, firstName, liveHolidays)
        .filter((c) => !popupShownToday(c.id, today))
        .map((celebration) => ({ kind: "celebration", celebration }));

      if (teamMemberId && !popupShownToday(NUDGE_ID, today)) {
        const supabase = createClient();
        const sinceDate = lagosDateDaysAgo(6);
        const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const [messages, accounts] = await Promise.all([
          supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("team_member_id", teamMemberId)
            .gte("received_date", sinceDate),
          supabase
            .from("fiverr_accounts")
            .select("id", { count: "exact", head: true })
            .eq("team_member_id", teamMemberId)
            .gte("created_at", sinceIso),
        ]);
        if (!messages.error && !accounts.error) {
          const noMessages = (messages.count ?? 0) === 0;
          const noAccounts = (accounts.count ?? 0) === 0;
          if (noMessages || noAccounts) list.push({ kind: "nudge", noMessages, noAccounts });
        }
      }

      if (!gingerShownToday()) list.push({ kind: "ginger" });

      await new Promise((r) => setTimeout(r, 900));
      if (!cancelled) setSteps(list);
    }

    void build();
    return () => {
      cancelled = true;
    };
  }, [teamMemberId, firstName]);

  function next() {
    const step = steps[index];
    const today = todayRef.current;
    if (step && today) {
      if (step.kind === "celebration") markPopupShownToday(step.celebration.id, today);
      if (step.kind === "nudge") markPopupShownToday(NUDGE_ID, today);
    }
    setIndex((i) => i + 1);
  }

  const step = steps[index];
  if (!step) return null;

  if (step.kind === "celebration") {
    return <CelebrationModal key={step.celebration.id} celebration={step.celebration} onClose={next} />;
  }
  if (step.kind === "nudge") {
    return (
      <NotEnoughNudge
        firstName={firstName}
        noMessages={step.noMessages}
        noAccounts={step.noAccounts}
        onClose={next}
      />
    );
  }
  return <DailyGingerMotivation displayName={displayName} onClose={next} />;
}
