"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currentYearMonth } from "@/lib/utils/dates";
import {
  INCENTIVE_SLOTS,
  PICK_REASONS,
  placeLabel,
  placeScore,
  type IncentiveSlot,
  type PickPlace,
} from "@/lib/incentives/catalog";
import { EvidencePreview } from "@/components/shared/evidence-preview";
import {
  fetchAll,
  loadMonthPack,
  monthLabel,
  shiftMonth,
  type ManualPick,
  type MonthPack,
  type ProgressMember,
} from "@/lib/incentives/progress";
import type { Incentive } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

interface Standing {
  memberId: string;
  name: string;
  score: number;
  note: string;
  reasons: string[];
  place: PickPlace | null;
  picked: boolean;
}

interface PlaceDraft {
  slot: IncentiveSlot;
  label: string;
  memberId: string;
  memberName: string;
  yearMonth: string;
  place: PickPlace | null;
  reasons: string[];
}

async function fetchProgress(month: string) {
  const response = await fetch(`/api/incentives/progress?month=${month}`);
  const body = (await response.json()) as {
    members?: ProgressMember[];
    prizes?: Record<string, string>;
    pack?: MonthPack;
    error?: string;
  };
  if (!response.ok || !body.pack) {
    throw new Error(body.error || "Could not read incentive progress");
  }
  return {
    members: body.members ?? [],
    prizes: body.prizes ?? {},
    pack: body.pack,
  };
}

export function IncentiveBoard({ readOnly = false }: { readOnly?: boolean }) {
  const nowMonth = currentYearMonth();
  const lastMonth = shiftMonth(nowMonth, -1);
  const [sectionMonth, setSectionMonth] = useState<Record<string, string>>(() =>
    Object.fromEntries(INCENTIVE_SLOTS.map((slot) => [slot.slot, nowMonth]))
  );
  const [packs, setPacks] = useState<Record<string, MonthPack>>({});
  const [prizes, setPrizes] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Incentive[]>([]);
  const [members, setMembers] = useState<ProgressMember[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPrizes, setSavingPrizes] = useState(false);
  const [draft, setDraft] = useState<PlaceDraft | null>(null);
  const [savingPlace, setSavingPlace] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const inflight = useMemo(() => new Set<string>(), []);

  useEffect(() => {
    let cancelled = false;
    const db = supabase as SupabaseClient;

    async function loadBase() {
      try {
        if (readOnly) {
          const body = await fetchProgress(nowMonth);
          if (cancelled) return;
          setPrizes(body.prizes);
          setMembers(body.members);
          setPacks({ [nowMonth]: body.pack });
          setLoadError(null);
          return;
        }

        const [incentiveRows, people, pack] = await Promise.all([
          fetchAll<Incentive>((from, to) =>
            db.from("incentives").select("*").not("slot", "is", null).range(from, to)
          ),
          fetchAll<ProgressMember>((from, to) =>
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
  }, [supabase, nowMonth, readOnly]);

  useEffect(() => {
    const db = supabase as SupabaseClient;
    let alive = true;

    async function refreshOpenMonths() {
      const months = [...new Set([nowMonth, ...Object.values(sectionMonth)])];
      const next: Record<string, MonthPack> = {};
      for (const month of months) {
        try {
          next[month] = readOnly ? (await fetchProgress(month)).pack : await loadMonthPack(db, month);
        } catch {
          // Keep the bars already on screen if a refresh misses.
        }
      }
      if (alive) setPacks((current) => ({ ...current, ...next }));
    }

    function onShow() {
      if (document.visibilityState === "visible") void refreshOpenMonths();
    }

    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
    };
  }, [supabase, nowMonth, sectionMonth, readOnly]);

  useEffect(() => {
    const db = supabase as SupabaseClient;
    const needed = [
      ...new Set(Object.values(sectionMonth).flatMap((month) => [month, shiftMonth(month, -1)])),
    ].filter(
      (month) => !packs[month] && !inflight.has(month)
    );
    if (needed.length === 0) return;
    let cancelled = false;
    for (const month of needed) inflight.add(month);

    Promise.all(
      needed.map(async (month) => {
        try {
          const pack = readOnly ? (await fetchProgress(month)).pack : await loadMonthPack(db, month);
          if (!cancelled && pack) setPacks((current) => ({ ...current, [month]: pack }));
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
  }, [sectionMonth, packs, supabase, inflight, readOnly]);

  function standings(slot: IncentiveSlot, source: "auto" | "manual", yearMonth: string): Standing[] {
    const pack = packs[yearMonth];
    if (source === "manual") {
      const picks = pack?.manual[slot] ?? {};
      return members
        .map((member) => {
          const pick = picks[member.id];
          return {
            memberId: member.id,
            name: member.full_name,
            score: pick ? placeScore(pick.place) : 0,
            note: pick?.note ?? "",
            reasons: pick?.reasons ?? [],
            place: pick?.place ?? null,
            picked: Boolean(pick?.picked),
          };
        })
        .sort((a, b) => (a.place ?? 9) - (b.place ?? 9) || a.name.localeCompare(b.name));
    }
    const scores = pack?.auto[slot] ?? {};
    return members
      .map((member) => ({
        memberId: member.id,
        name: member.full_name,
        score: scores[member.id] ?? 0,
        note: "",
        reasons: [],
        place: null,
        picked: (scores[member.id] ?? 0) > 0,
      }))
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

  function writePick(yearMonth: string, slot: string, memberId: string, pick: ManualPick | null) {
    setPacks((current) => {
      const monthPack = current[yearMonth];
      if (!monthPack) return current;
      const slotPicks = { ...(monthPack.manual[slot] ?? {}) };
      if (pick) slotPicks[memberId] = pick;
      else delete slotPicks[memberId];
      return {
        ...current,
        [yearMonth]: {
          ...monthPack,
          manual: { ...monthPack.manual, [slot]: slotPicks },
        },
      };
    });
  }

  function toggleReason(reason: string) {
    setDraft((current) => {
      if (!current) return current;
      const reasons = current.reasons.includes(reason)
        ? current.reasons.filter((item) => item !== reason)
        : [...current.reasons, reason];
      return { ...current, reasons };
    });
  }

  async function savePlace() {
    if (!draft?.place) return;
    const reasons = draft.reasons.filter((reason) => (PICK_REASONS as readonly string[]).includes(reason));
    if (reasons.length === 0) {
      toast.error("Tick why this person is in that place.");
      return;
    }
    const place = draft.place;
    const note = reasons.join("|");
    const score = placeScore(place);
    setSavingPlace(true);
    const holders = Object.entries(packs[draft.yearMonth]?.manual[draft.slot] ?? {}).filter(
      ([memberId, pick]) => memberId !== draft.memberId && pick.place === place
    );
    for (const [memberId] of holders) {
      const { error } = await supabase
        .from("incentive_scores")
        .delete()
        .eq("slot", draft.slot)
        .eq("team_member_id", memberId)
        .eq("year_month", draft.yearMonth);
      if (error) {
        setSavingPlace(false);
        toast.error(error.message);
        return;
      }
    }
    const { error } = await supabase.from("incentive_scores").upsert(
      {
        slot: draft.slot,
        team_member_id: draft.memberId,
        year_month: draft.yearMonth,
        score,
        note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slot,team_member_id,year_month" }
    );
    setSavingPlace(false);
    if (error) {
      toast.error(
        /note/i.test(error.message)
          ? "The place note is not ready yet. Run the incentive area SQL, then tick again."
          : error.message
      );
      return;
    }
    setPacks((current) => {
      const monthPack = current[draft.yearMonth];
      if (!monthPack) return current;
      const slotPicks = { ...(monthPack.manual[draft.slot] ?? {}) };
      for (const [memberId] of holders) delete slotPicks[memberId];
      slotPicks[draft.memberId] = { picked: true, place, reasons, note };
      return {
        ...current,
        [draft.yearMonth]: {
          ...monthPack,
          manual: { ...monthPack.manual, [draft.slot]: slotPicks },
        },
      };
    });
    setDraft(null);
  }

  async function clearPick(slot: string, memberId: string, yearMonth: string) {
    const { error } = await supabase
      .from("incentive_scores")
      .delete()
      .eq("slot", slot)
      .eq("team_member_id", memberId)
      .eq("year_month", yearMonth);
    if (error) {
      toast.error(error.message);
      return;
    }
    writePick(yearMonth, slot, memberId, null);
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
      {!readOnly && (
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
                placeholder="Prize, e.g. $200"
                aria-label={`Prize for ${slot.label}`}
              />
              <div>
                <p className="font-semibold text-neutral-900">{slot.label}</p>
                <p className="text-xs text-neutral-500">
                  {slot.slot === "top_accounts"
                    ? "Opening date decides the month. This month and last month are counted apart."
                    : slot.slot === "top_earner"
                      ? "Dollars members keep. Fiverr’s 20% is already removed. Outside payments stay as recorded."
                    : slot.slot === "five_stars"
                      ? "Counted from the 5-star screenshots members save"
                      : slot.source === "auto"
                        ? "Counted from what members record in the month you pick"
                        : "Tick a member, choose 1st, 2nd, or 3rd, then tick why."}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Who is winning</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {readOnly
              ? "Open any month on each space to see how the team is moving."
              : "Pick the month on each space. Last month still shows, even when that space has no prize."}
          </p>
        </div>

        {INCENTIVE_SLOTS.map((slot) => {
          const chosenMonth = sectionMonth[slot.slot] ?? nowMonth;
          const pack = packs[chosenMonth];
          const rows = standings(slot.slot, slot.source, chosenMonth);
          const picks = rows.filter((row) => row.picked);
          const leader = rows.find((row) => row.score > 0);
          const top = leader?.score ?? 0;
          const leaderPick = picks.find((row) => row.place === 1) ?? picks[0];
          const summary =
            slot.source === "manual"
              ? leaderPick?.place
                ? ` · ${placeLabel(leaderPick.place)} ${leaderPick.name}`
                : ""
              : leader
                ? ` · ${leader.name} is ahead`
                : "";
          const starEvidence = pack?.stars ?? [];
          return (
            <article key={slot.slot} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-neutral-900">{slot.label}</h3>
                  <p className="text-sm font-medium text-[#7b1e3a]">
                    {prizes[slot.slot]?.trim() || "No prize yet"}
                    {summary}
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

              {pack && top === 0 ? (
                <p className="mt-3 text-sm text-neutral-500">
                  {slot.source === "manual"
                    ? `No places chosen in ${monthLabel(chosenMonth)} yet.`
                    : slot.slot === "five_stars"
                      ? `No 5-star screenshots saved in ${monthLabel(chosenMonth)} yet.`
                      : `No score recorded in ${monthLabel(chosenMonth)} yet.`}
                </p>
              ) : null}

              {pack ? (
                <ul className="mt-3 space-y-2">
                  {(slot.source === "manual" && readOnly ? rows.filter((row) => row.picked) : rows).map((row) => {
                    if (slot.source === "manual") {
                      return (
                        <li key={row.memberId} className="rounded-lg px-1 py-1.5">
                          <div className="flex items-start gap-3">
                            {readOnly ? (
                              <span className="mt-1 h-4 w-4 shrink-0 rounded-sm bg-[#7b1e3a]" aria-hidden />
                            ) : (
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 shrink-0 accent-[#7b1e3a]"
                                checked={row.picked}
                                aria-label={`Pick ${row.name} for ${slot.label}`}
                                onChange={(event) => {
                                  if (event.target.checked) {
                                    setDraft({
                                      slot: slot.slot,
                                      label: slot.label,
                                      memberId: row.memberId,
                                      memberName: row.name,
                                      yearMonth: chosenMonth,
                                      place: null,
                                      reasons: [],
                                    });
                                    return;
                                  }
                                  void clearPick(slot.slot, row.memberId, chosenMonth);
                                }}
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm ${row.picked ? "font-semibold text-[#7b1e3a]" : "text-neutral-700"}`}>
                                {row.place ? `${placeLabel(row.place)} · ` : ""}
                                {row.name}
                              </p>
                              {row.reasons.length > 0 ? (
                                <p className="mt-0.5 text-sm text-neutral-600">{row.reasons.join(" · ")}</p>
                              ) : null}
                            </div>
                            {!readOnly && row.picked ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setDraft({
                                    slot: slot.slot,
                                    label: slot.label,
                                    memberId: row.memberId,
                                    memberName: row.name,
                                    yearMonth: chosenMonth,
                                    place: row.place,
                                    reasons: row.reasons.filter((reason) =>
                                      (PICK_REASONS as readonly string[]).includes(reason)
                                    ),
                                  })
                                }
                              >
                                Edit
                              </Button>
                            ) : null}
                          </div>
                          {row.place ? (
                            <div className="ml-7 mt-2 h-2.5 overflow-hidden rounded-full bg-neutral-100">
                              <div
                                className="h-full rounded-full bg-[#7b1e3a]"
                                style={{ width: row.place === 1 ? "100%" : row.place === 2 ? "66%" : "33%" }}
                              />
                            </div>
                          ) : null}
                        </li>
                      );
                    }
                    const width = top > 0 ? Math.max(4, Math.round((row.score / top) * 100)) : 0;
                    const ahead = leader?.memberId === row.memberId && row.score > 0;
                    return (
                      <li
                        key={row.memberId}
                        className="grid items-center gap-2 sm:grid-cols-[minmax(0,10rem)_minmax(4rem,1fr)_9rem]"
                      >
                        <p className={`truncate text-sm ${ahead ? "font-semibold text-[#7b1e3a]" : "text-neutral-700"}`}>
                          {row.name}
                        </p>
                        <div className="h-2.5 min-w-[4rem] overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className={`h-full rounded-full ${ahead ? "bg-[#7b1e3a]" : "bg-[#a33b5c]/70"}`}
                            style={{ width: row.score > 0 ? `${width}%` : "0%" }}
                          />
                        </div>
                        <p className="whitespace-nowrap text-right text-xs tabular-nums text-neutral-500">
                          {slot.unit === "$"
                            ? `$${row.score.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                            : slot.slot === "top_accounts"
                              ? `${row.score} this month · ${
                                  standings(slot.slot, slot.source, shiftMonth(chosenMonth, -1)).find(
                                    (item) => item.memberId === row.memberId
                                  )?.score ?? 0
                                } last month`
                              : `${row.score} ${slot.unit}`}
                        </p>
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
                          <EvidencePreview
                            src={review.url}
                            alt={`${name} 5-star evidence`}
                            className="h-36 w-full object-cover"
                          />
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
      {draft ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            if (!savingPlace) setDraft(null);
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="place-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !savingPlace) setDraft(null);
            }}
            onSubmit={(event) => {
              event.preventDefault();
              void savePlace();
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7b1e3a]">{draft.label}</p>
            <h3 id="place-title" className="mt-1 text-lg font-semibold text-neutral-900">
              Where does {draft.memberName} stand?
            </h3>
            <p className="mt-1 text-sm text-neutral-500">{monthLabel(draft.yearMonth)}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {([1, 2, 3] as PickPlace[]).map((place) => (
                <button
                  key={place}
                  type="button"
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold ${
                    draft.place === place
                      ? "border-[#7b1e3a] bg-[#f6e8ec] text-[#7b1e3a]"
                      : "border-neutral-200 text-neutral-700"
                  }`}
                  onClick={() => setDraft((current) => (current ? { ...current, place } : current))}
                >
                  {placeLabel(place)}
                </button>
              ))}
            </div>
            <p className="mt-4 text-sm font-medium text-neutral-800">Why</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {PICK_REASONS.map((reason) => (
                <label key={reason} className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#7b1e3a]"
                    checked={draft.reasons.includes(reason)}
                    onChange={() => toggleReason(reason)}
                  />
                  {reason}
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={savingPlace} onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingPlace || !draft.place || draft.reasons.length === 0}>
                {savingPlace ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
