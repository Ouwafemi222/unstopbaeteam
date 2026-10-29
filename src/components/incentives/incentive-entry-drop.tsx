"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Gift, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Incentive } from "@/types/database";

const SESSION_KEY = "incentive-entry-seen";

export function IncentiveEntryDrop({ teamMemberId }: { teamMemberId?: string | null }) {
  const [items, setItems] = useState<Incentive[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    let cancelled = false;
    supabase
      .from("incentives")
      .select("id, title, detail, team_member_id, is_active")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        const rows = ((data ?? []) as Incentive[]).filter(
          (item) => !item.team_member_id || item.team_member_id === teamMemberId
        );
        setItems(rows);
        setHidden(rows.length === 0);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, teamMemberId]);

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setHidden(true);
  }

  if (!ready || hidden) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center px-3 pt-3">
      <div className="incentive-drop pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-[#7b1e3a]/20 bg-white shadow-2xl">
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex w-full items-center gap-3 px-4 py-4 text-left"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#7b1e3a] text-white">
              <Gift className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold uppercase tracking-[0.22em] text-[#7b1e3a]">
                Incentive
              </span>
              <span className="block text-lg font-extrabold text-neutral-900">Tap to open</span>
            </span>
            <ChevronDown className="h-5 w-5 text-[#7b1e3a]" />
          </button>
        ) : (
          <div className="px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-black uppercase tracking-wide text-[#7b1e3a]">Incentive</p>
                <p className="text-2xl font-black uppercase tracking-wide text-[#7b1e3a]">Incentive</p>
                <p className="text-2xl font-black uppercase tracking-wide text-[#7b1e3a]">Incentive</p>
                <p className="mt-2 text-lg font-bold text-neutral-900">Qualify and win</p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                aria-label="Close incentive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="mt-4 space-y-2">
              {items.map((item) => (
                <li key={item.id} className="rounded-xl bg-[#f6e8ec] px-3 py-2">
                  <p className="font-semibold text-neutral-900">{item.title}</p>
                  {item.detail && <p className="text-sm text-neutral-600">{item.detail}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
