"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currentYearMonth } from "@/lib/utils/dates";
import { lagosDayEndIso, lagosDayStartIso } from "@/lib/weekly-evaluation/week";
import { getMemberImageUrl } from "@/lib/storage/member-uploads";
import { INCENTIVE_SLOTS, type IncentiveSlot } from "@/lib/incentives/catalog";
import type { Incentive } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

interface MemberRow {
  id: string;
  full_name: string;
}

interface Standing {
  memberId: string;
  name: string;
  score: number;
}

interface StarEvidence {
  id: string;
  team_member_id: string;
  buyer_name: string | null;
  received_date: string;
  screenshot_path: string;
  url: string | null;
}

async function fetchAll<T>(
  run: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
) {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await run(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) return rows;
  }
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

function shiftMonth(yearMonth: string, delta: number) {
  const [year, month] = yearMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

interface MonthPack {
  auto: Record<string, Record<string, number>>;
  manual: Record<string, Record<string, string>>;
  stars: StarEvidence[];
}

async function loadMonthPack(db: SupabaseClient, yearMonth: string): Promise<MonthPack> {
  const bounds = monthBounds(yearMonth);
  const createdFrom = lagosDayStartIso(bounds.from);
  const createdTo = lagosDayEndIso(bounds.to);

  const [prospects, earnings, openedAccounts, createdAccounts, messages, scores, starPage] =
    await Promise.all([
      fetchAll<{ team_member_id: string; office_prospects_count: number | null }>((from, to) =>
        db
          .from("member_prospect_entries")
          .select("team_member_id, office_prospects_count")
          .gte("logged_date", bounds.from)
          .lte("logged_date", bounds.to)
          .range(from, to)
      ),
      fetchAll<{ team_member_id: string; amount_ngn: number | null; amount: number | null }>((from, to) =>
        db
          .from("member_weekly_earnings")
          .select("team_member_id, amount_ngn, amount")
          .eq("year_month", yearMonth)
          .range(from, to)
      ),
      fetchAll<{ id: string; team_member_id: string }>((from, to) =>
        db
          .from("fiverr_accounts")
          .select("id, team_member_id")
          .gte("opening_date", bounds.from)
          .lte("opening_date", bounds.to)
          .is("archived_at", null)
          .neq("status", "reserved")
          .range(from, to)
      ),
      fetchAll<{ id: string; team_member_id: string }>((from, to) =>
        db
          .from("fiverr_accounts")
          .select("id, team_member_id")
          .gte("created_at", createdFrom)
          .lte("created_at", createdTo)
          .is("archived_at", null)
          .neq("status", "reserved")
          .range(from, to)
      ),
      fetchAll<{ team_member_id: string }>((from, to) =>
        db
          .from("messages")
          .select("team_member_id")
          .gte("received_date", bounds.from)
          .lte("received_date", bounds.to)
          .range(from, to)
      ),
      fetchAll<{ slot: string; team_member_id: string; score: number | null }>((from, to) =>
        db
          .from("incentive_scores")
          .select("slot, team_member_id, score")
          .eq("year_month", yearMonth)
          .range(from, to)
      ),
      fetchAll<Omit<StarEvidence, "url">>((from, to) =>
        db
          .from("five_star_reviews")
          .select("id, team_member_id, buyer_name, received_date, screenshot_path")
          .gte("received_date", bounds.from)
          .lte("received_date", bounds.to)
          .order("received_date", { ascending: false })
          .range(from, to)
      ),
    ]);

  const add = (bucket: Record<string, number>, id: string | null, amount: number) => {
    if (!id) return;
    bucket[id] = (bucket[id] ?? 0) + amount;
  };
  const office: Record<string, number> = {};
  for (const row of prospects) add(office, row.team_member_id, Number(row.office_prospects_count ?? 0));
  const earn: Record<string, number> = {};
  for (const row of earnings) {
    const value = row.amount_ngn != null ? Number(row.amount_ngn) : Number(row.amount ?? 0);
    add(earn, row.team_member_id, value);
  }
  const opened: Record<string, number> = {};
  const seenAccounts = new Set<string>();
  for (const row of [...openedAccounts, ...createdAccounts]) {
    if (seenAccounts.has(row.id)) continue;
    seenAccounts.add(row.id);
    add(opened, row.team_member_id, 1);
  }
  const received: Record<string, number> = {};
  for (const row of messages) add(received, row.team_member_id, 1);
  const stars = await Promise.all(
    starPage.map(async (review) => ({
      ...review,
      url: await getMemberImageUrl(db, review.screenshot_path),
    }))
  );
  const starCounts: Record<string, number> = {};
  for (const row of stars) add(starCounts, row.team_member_id, 1);

  const manual: Record<string, Record<string, string>> = {};
  for (const slot of INCENTIVE_SLOTS) {
    if (slot.source === "manual") manual[slot.slot] = {};
  }
  for (const row of scores) {
    if (!manual[row.slot]) manual[row.slot] = {};
    manual[row.slot][row.team_member_id] = String(row.score ?? 0);
  }

  return {
    auto: {
      office_prospects: office,
      top_earner: earn,
      top_accounts: opened,
      top_messages: received,
      five_stars: starCounts,
    },
    manual,
    stars,
  };
}

export function IncentiveBoard() {
  const nowMonth = currentYearMonth();
  const lastMonth = shiftMonth(nowMonth, -1);
  const [sectionMonth, setSectionMonth] = useState<Record<string, string>>(() =>
    Object.fromEntries(INCENTIVE_SLOTS.map((slot) => [slot.slot, nowMonth]))
  );
  const [packs, setPacks] = useState<Record<string, MonthPack>>({});
  const [prizes, setPrizes] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Incentive[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPrizes, setSavingPrizes] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const inflight = useMemo(() => new Set<string>(), []);

  useEffect(() => {
    let cancelled = false;
    const db = supabase as SupabaseClient;

    async function loadBase() {
      try {
        const [incentiveRows, people, pack] = await Promise.all([
          fetchAll<Incentive>((from, to) =>
            db.from("incentives").select("*").not("slot", "is", null).range(from, to)
          ),
          fetchAll<MemberRow>((from, to) =>
            db
              .from("team_members")
              .select("id, full_name")
              .eq("status", "active")
              .order("full_name")
              .range(from, to)
          ),
          loadMonthPack(db, nowMonth),
        ]);
        if (cancelled) return;
        const nextPrizes: Record<string, string> = {};
        for (const slot of INCENTIVE_SLOTS) {
          nextPrizes[slot.slot] = incentiveRows.find((row) => row.slot === slot.slot)?.prize ?? "";
        }
        setSaved(incentiveRows);
        setPrizes(nextPrizes);
        setMembers(people);
        setPacks({ [nowMonth]: pack });
        setLoadError(null);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not read the live records");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBase();
    return () => {
      cancelled = true;
    };
  }, [supabase, nowMonth]);

  useEffect(() => {
    const db = supabase as SupabaseClient;
    const needed = [...new Set(Object.values(sectionMonth))].filter(
      (month) => !packs[month] && !inflight.has(month)
    );
    if (needed.length === 0) return;
    let cancelled = false;
    for (const month of needed) inflight.add(month);

    Promise.all(
      needed.map(async (month) => {
        try {
          const pack = await loadMonthPack(db, month);
          if (!cancelled) setPacks((current) => ({ ...current, [month]: pack }));
        } catch (error) {
          if (!cancelled) {
            toast.error(error instanceof Error ? error.message : "Could not read that month");
          }
        } finally {
          inflight.delete(month);
        }
      })
    );

    return () => {
      cancelled = true;
    };
  }, [sectionMonth, packs, supabase, inflight]);

  function standings(slot: IncentiveSlot, source: "auto" | "manual", yearMonth: string): Standing[] {
    const pack = packs[yearMonth];
    const scores =
      source === "auto"
        ? pack?.auto[slot] ?? {}
        : Object.fromEntries(
            Object.entries(pack?.manual[slot] ?? {}).map(([id, value]) => [id, Number(value) || 0])
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

  async function saveScore(slot: string, memberId: string, raw: string, yearMonth: string) {
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

  if (loadError) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        The live records could not be read: {loadError}
      </p>
    );
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
                  {slot.slot === "five_stars"
                    ? "Counted from the 5-star screenshots members save"
                    : slot.source === "auto"
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
          <h2 className="text-lg font-semibold text-neutral-900">Who is winning</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Pick the month on each space. Last month still shows, even when that space has no prize.
          </p>
        </div>

        {INCENTIVE_SLOTS.map((slot) => {
          const chosenMonth = sectionMonth[slot.slot] ?? nowMonth;
          const pack = packs[chosenMonth];
          const rows = standings(slot.slot, slot.source, chosenMonth);
          const leader = rows.find((row) => row.score > 0);
          const top = leader?.score ?? 0;
          const starEvidence = pack?.stars ?? [];
          return (
            <article key={slot.slot} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-neutral-900">{slot.label}</h3>
                  <p className="text-sm font-medium text-[#7b1e3a]">
                    {prizes[slot.slot]?.trim() || "No prize yet"}
                    {leader ? ` · ${leader.name} is ahead` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs font-medium text-neutral-500" htmlFor={`month-${slot.slot}`}>
                    Month
                  </label>
                  <Input
                    id={`month-${slot.slot}`}
                    type="month"
                    value={chosenMonth}
                    max={nowMonth}
                    className="h-9 w-[160px]"
                    onChange={(event) => {
                      const value = event.target.value;
                      if (!value || value > nowMonth) return;
                      setSectionMonth((current) => ({ ...current, [slot.slot]: value }));
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSectionMonth((current) => ({ ...current, [slot.slot]: lastMonth }))
                    }
                  >
                    Last month
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSectionMonth((current) => ({ ...current, [slot.slot]: nowMonth }))
                    }
                  >
                    This month
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-xs text-neutral-500">Showing {monthLabel(chosenMonth)}</p>
              {!pack ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-neutral-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reading {monthLabel(chosenMonth)}
                </div>
              ) : null}

              {pack && slot.source === "auto" && rows.length === 0 ? (
                <p className="mt-3 text-sm text-neutral-500">
                  {slot.slot === "five_stars"
                    ? `No 5-star screenshots saved in ${monthLabel(chosenMonth)}. Members record them under My 5 Stars.`
                    : `Nobody recorded this in ${monthLabel(chosenMonth)}.`}
                </p>
              ) : pack ? (
                <ul className="mt-3 space-y-2">
                  {(slot.source === "manual"
                    ? members.map((member) => ({
                        memberId: member.id,
                        name: member.full_name,
                        score: Number(pack.manual[slot.slot]?.[member.id] ?? 0) || 0,
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
                            value={pack.manual[slot.slot]?.[row.memberId] ?? ""}
                            placeholder="0"
                            className="h-8 text-right"
                            onChange={(event) => {
                              const value = event.target.value;
                              setPacks((current) => {
                                const monthPack = current[chosenMonth];
                                if (!monthPack) return current;
                                return {
                                  ...current,
                                  [chosenMonth]: {
                                    ...monthPack,
                                    manual: {
                                      ...monthPack.manual,
                                      [slot.slot]: {
                                        ...monthPack.manual[slot.slot],
                                        [row.memberId]: value,
                                      },
                                    },
                                  },
                                };
                              });
                            }}
                            onBlur={(event) =>
                              saveScore(slot.slot, row.memberId, event.target.value || "0", chosenMonth)
                            }
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
              ) : null}
              {slot.slot === "five_stars" && pack && starEvidence.length > 0 && (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {starEvidence.map((review) => {
                    const name = members.find((member) => member.id === review.team_member_id)?.full_name ?? "Member";
                    return (
                      <li key={review.id} className="overflow-hidden rounded-xl border border-neutral-200">
                        {review.url && (
                          <a href={review.url} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={review.url} alt={`${name} 5-star evidence`} className="h-36 w-full object-cover" />
                          </a>
                        )}
                        <p className="px-3 py-2 text-sm text-neutral-700">
                          <span className="font-medium text-neutral-900">{name}</span>
                          {review.buyer_name ? ` · ${review.buyer_name}` : ""} · {review.received_date}
                        </p>
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
