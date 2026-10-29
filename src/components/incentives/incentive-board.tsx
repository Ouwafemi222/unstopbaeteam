"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currentYearMonth } from "@/lib/utils/dates";
import { INCENTIVE_SLOTS, type IncentiveSlot } from "@/lib/incentives/catalog";
import type { Incentive } from "@/types/database";

interface MemberRow {
  id: string;
  full_name: string;
}

interface Standing {
  memberId: string;
  name: string;
  score: number;
}

function monthBounds(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  const last = new Date(year, month, 0).getDate();
  return {
    from: `${yearMonth}-01`,
    to: `${yearMonth}-${String(last).padStart(2, "0")}`,
  };
}

function monthLabel(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-NG", {
    month: "long",
    year: "numeric",
  });
}

export function IncentiveBoard() {
  const yearMonth = currentYearMonth();
  const bounds = monthBounds(yearMonth);
  const [prizes, setPrizes] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Incentive[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [autoScores, setAutoScores] = useState<Record<string, Record<string, number>>>({});
  const [manualScores, setManualScores] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [savingPrizes, setSavingPrizes] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [
        { data: incentiveRows },
        { data: people },
        { data: prospects },
        { data: earnings },
        { data: accounts },
        { data: messages },
        { data: scores },
      ] = await Promise.all([
        supabase.from("incentives").select("*").not("slot", "is", null),
        supabase.from("team_members").select("id, full_name").eq("status", "active").order("full_name"),
        supabase
          .from("member_prospect_entries")
          .select("team_member_id, office_prospects_count")
          .gte("logged_date", bounds.from)
          .lte("logged_date", bounds.to),
        supabase
          .from("member_weekly_earnings")
          .select("team_member_id, amount_ngn, amount")
          .eq("year_month", yearMonth),
        supabase
          .from("fiverr_accounts")
          .select("team_member_id")
          .gte("opening_date", bounds.from)
          .lte("opening_date", bounds.to)
          .is("archived_at", null)
          .neq("status", "reserved"),
        supabase
          .from("messages")
          .select("team_member_id")
          .gte("received_date", bounds.from)
          .lte("received_date", bounds.to),
        supabase.from("incentive_scores").select("slot, team_member_id, score").eq("year_month", yearMonth),
      ]);

      if (cancelled) return;

      const rows = (incentiveRows ?? []) as Incentive[];
      const nextPrizes: Record<string, string> = {};
      for (const slot of INCENTIVE_SLOTS) {
        nextPrizes[slot.slot] = rows.find((row) => row.slot === slot.slot)?.prize ?? "";
      }

      const add = (bucket: Record<string, number>, id: string | null, amount: number) => {
        if (!id) return;
        bucket[id] = (bucket[id] ?? 0) + amount;
      };

      const office: Record<string, number> = {};
      for (const row of prospects ?? []) {
        add(office, row.team_member_id, Number(row.office_prospects_count ?? 0));
      }
      const earn: Record<string, number> = {};
      for (const row of earnings ?? []) {
        const value = row.amount_ngn != null ? Number(row.amount_ngn) : Number(row.amount ?? 0);
        add(earn, row.team_member_id, value);
      }
      const opened: Record<string, number> = {};
      for (const row of accounts ?? []) add(opened, row.team_member_id, 1);
      const received: Record<string, number> = {};
      for (const row of messages ?? []) add(received, row.team_member_id, 1);

      const typed: Record<string, Record<string, string>> = {};
      for (const slot of INCENTIVE_SLOTS) {
        if (slot.source === "manual") typed[slot.slot] = {};
      }
      for (const row of scores ?? []) {
        if (!typed[row.slot]) typed[row.slot] = {};
        typed[row.slot][row.team_member_id] = String(row.score ?? 0);
      }

      setSaved(rows);
      setPrizes(nextPrizes);
      setMembers((people ?? []) as MemberRow[]);
      setAutoScores({
        office_prospects: office,
        top_earner: earn,
        top_accounts: opened,
        top_messages: received,
      });
      setManualScores(typed);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase, yearMonth, bounds.from, bounds.to]);

  function standings(slot: IncentiveSlot, source: "auto" | "manual"): Standing[] {
    const scores =
      source === "auto"
        ? autoScores[slot] ?? {}
        : Object.fromEntries(
            Object.entries(manualScores[slot] ?? {}).map(([id, value]) => [id, Number(value) || 0])
          );
    return members
      .map((member) => ({
        memberId: member.id,
        name: member.full_name,
        score: scores[member.id] ?? 0,
      }))
      .filter((row) => source === "manual" || row.score > 0)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }

  async function savePrizes() {
    setSavingPrizes(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    for (const slot of INCENTIVE_SLOTS) {
      const prize = (prizes[slot.slot] ?? "").trim();
      const existing = saved.find((row) => row.slot === slot.slot);
      const payload = {
        title: slot.label,
        prize: prize || null,
        slot: slot.slot,
        is_active: prize.length > 0,
        detail: null,
        team_member_id: null,
        updated_at: new Date().toISOString(),
      };
      const query = existing
        ? supabase.from("incentives").update(payload).eq("id", existing.id)
        : supabase.from("incentives").insert({ ...payload, created_by: user?.id ?? null });
      const { error } = await query;
      if (error) {
        toast.error(error.message);
        setSavingPrizes(false);
        return;
      }
    }

    toast.success("Prizes saved. They will stream on the billboard.");
    const { data } = await supabase.from("incentives").select("*").not("slot", "is", null);
    setSaved((data ?? []) as Incentive[]);
    setSavingPrizes(false);
  }

  async function saveScore(slot: string, memberId: string, raw: string) {
    const score = Number(raw);
    if (!Number.isFinite(score) || score < 0) {
      toast.error("Use a number, 0 or higher.");
      return;
    }
    const { error } = await supabase.from("incentive_scores").upsert(
      {
        slot,
        team_member_id: memberId,
        year_month: yearMonth,
        score,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slot,team_member_id,year_month" }
    );
    if (error) toast.error(error.message);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#7b1e3a]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Prize for each space</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Put the prize at the front. Leave it blank to keep that space off the billboard.
            </p>
          </div>
          <Button type="button" onClick={savePrizes} disabled={savingPrizes}>
            {savingPrizes ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save prizes
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          {INCENTIVE_SLOTS.map((slot, index) => (
            <div
              key={slot.slot}
              className={`grid gap-3 p-4 sm:grid-cols-[180px_1fr] sm:items-center ${
                index > 0 ? "border-t border-neutral-100" : ""
              }`}
            >
              <Input
                value={prizes[slot.slot] ?? ""}
                onChange={(event) =>
                  setPrizes((current) => ({ ...current, [slot.slot]: event.target.value }))
                }
                placeholder="Prize, e.g. ₦20,000"
                aria-label={`Prize for ${slot.label}`}
              />
              <div>
                <p className="font-semibold text-neutral-900">{slot.label}</p>
                <p className="text-xs text-neutral-500">
                  {slot.source === "auto"
                    ? "Counted from what members record this month"
                    : "You type each member’s score below"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Who is winning · {monthLabel(yearMonth)}</h2>
          <p className="mt-1 text-sm text-neutral-500">
            The longest bar is in front. Recorded work fills the counted spaces. You score the rest.
          </p>
        </div>

        {INCENTIVE_SLOTS.map((slot) => {
          const rows = standings(slot.slot, slot.source);
          const leader = rows.find((row) => row.score > 0);
          const top = leader?.score ?? 0;
          return (
            <article key={slot.slot} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold text-neutral-900">{slot.label}</h3>
                <p className="text-sm font-medium text-[#7b1e3a]">
                  {prizes[slot.slot]?.trim() || "No prize yet"}
                  {leader ? ` · ${leader.name} is ahead` : ""}
                </p>
              </div>

              {slot.source === "auto" && rows.length === 0 ? (
                <p className="mt-3 text-sm text-neutral-500">Nobody has recorded this yet this month.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {(slot.source === "manual"
                    ? members.map((member) => ({
                        memberId: member.id,
                        name: member.full_name,
                        score: Number(manualScores[slot.slot]?.[member.id] ?? 0) || 0,
                      }))
                    : rows
                  ).map((row) => {
                    const width = top > 0 ? Math.max(4, Math.round((row.score / top) * 100)) : 0;
                    const ahead = leader?.memberId === row.memberId && row.score > 0;
                    return (
                      <li key={row.memberId} className="grid items-center gap-2 sm:grid-cols-[160px_1fr_88px]">
                        <p className={`truncate text-sm ${ahead ? "font-semibold text-[#7b1e3a]" : "text-neutral-700"}`}>
                          {row.name}
                        </p>
                        <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className={`h-full rounded-full ${ahead ? "bg-[#7b1e3a]" : "bg-[#a33b5c]/70"}`}
                            style={{ width: row.score > 0 ? `${width}%` : "0%" }}
                          />
                        </div>
                        {slot.source === "manual" ? (
                          <Input
                            inputMode="decimal"
                            value={manualScores[slot.slot]?.[row.memberId] ?? ""}
                            placeholder="0"
                            className="h-8 text-right"
                            onChange={(event) =>
                              setManualScores((current) => ({
                                ...current,
                                [slot.slot]: { ...current[slot.slot], [row.memberId]: event.target.value },
                              }))
                            }
                            onBlur={(event) => saveScore(slot.slot, row.memberId, event.target.value || "0")}
                          />
                        ) : (
                          <p className="text-right text-xs tabular-nums text-neutral-500">
                            {slot.unit === "₦"
                              ? `₦${Math.round(row.score).toLocaleString()}`
                              : `${row.score} ${slot.unit}`}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
