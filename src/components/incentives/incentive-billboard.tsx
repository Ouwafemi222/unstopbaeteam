"use client";

import { useEffect, useMemo, useState } from "react";
import { Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Incentive } from "@/types/database";

export function IncentiveBillboard({ teamMemberId }: { teamMemberId?: string | null }) {
  const [items, setItems] = useState<Incentive[]>([]);
  const [picked, setPicked] = useState(0);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("incentives")
      .select("id, title, detail, prize, team_member_id, is_active, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        const rows = ((data ?? []) as Incentive[]).filter(
          (item) => !item.team_member_id || item.team_member_id === teamMemberId
        );
        setItems(rows);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, teamMemberId]);

  useEffect(() => {
    if (items.length < 2) return;
    const timer = setInterval(() => {
      setPicked((current) => (current + 1) % items.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;

  const feature = items[picked % items.length];
  const stream = [...items, ...items];

  return (
    <section className="overflow-hidden rounded-2xl border border-[#7b1e3a]/20 bg-[#7b1e3a] text-white shadow-lg">
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-[#f6e8ec]">
          <Gift className="h-4 w-4" />
          Incentive billboard
        </p>
        <p className="text-[11px] uppercase tracking-widest text-white/70">Qualify and win</p>
      </div>

      <div className="px-5 pb-2 pt-3">
        {feature.prize && (
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#f6e8ec]">{feature.prize}</p>
        )}
        <p className="text-3xl font-black tracking-tight sm:text-5xl">{feature.title}</p>
        {feature.detail && (
          <p className="mt-2 max-w-2xl text-sm text-white/80 sm:text-base">{feature.detail}</p>
        )}
      </div>

      <div className="mt-3 overflow-hidden border-t border-white/15 bg-black/15 py-3">
        <div className="incentive-marquee flex w-max gap-10 whitespace-nowrap px-6 text-lg font-extrabold uppercase tracking-wide">
          {stream.map((item, index) => (
            <span key={`${item.id}-${index}`} className="flex items-center gap-10">
              {item.prize ? `${item.prize} · ${item.title}` : item.title}
              <span className="text-[#f6e8ec]">★</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
