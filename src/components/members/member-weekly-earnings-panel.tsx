"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DollarSign, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getWeeksInMonth } from "@/lib/members/week-utils";
import { formatYearMonthLabel } from "@/lib/utils/dates";
import type { MemberWeeklyEarning } from "@/types/database";

function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

interface MemberWeeklyEarningsPanelProps {
  teamMemberId: string;
  yearMonth: string;
  incomeGoal?: number | null;
  readOnly?: boolean;
}

export function MemberWeeklyEarningsPanel({
  teamMemberId,
  yearMonth,
  incomeGoal,
  readOnly,
}: MemberWeeklyEarningsPanelProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [savingWeek, setSavingWeek] = useState<number | null>(null);
  const [entries, setEntries] = useState<MemberWeeklyEarning[]>([]);
  const [draft, setDraft] = useState<Record<number, { amount: string; notes: string }>>({});

  const weeks = useMemo(() => getWeeksInMonth(yearMonth), [yearMonth]);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("member_weekly_earnings")
      .select("*")
      .eq("team_member_id", teamMemberId)
      .eq("year_month", yearMonth)
      .order("week_number", { ascending: true });

    if (error) toast.error(error.message);
    const list = (data as MemberWeeklyEarning[]) ?? [];
    setEntries(list);

    const nextDraft: Record<number, { amount: string; notes: string }> = {};
    weeks.forEach((w) => {
      const row = list.find((e) => e.week_number === w.week);
      nextDraft[w.week] = {
        amount: row ? String(row.amount) : "",
        notes: row?.notes ?? "",
      };
    });
    setDraft(nextDraft);
    setLoading(false);
  }, [supabase, teamMemberId, yearMonth, weeks]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const monthTotal = useMemo(
    () => entries.reduce((sum, e) => sum + Number(e.amount), 0),
    [entries]
  );

  const goalProgress =
    incomeGoal && incomeGoal > 0 ? Math.min(100, Math.round((monthTotal / incomeGoal) * 100)) : null;

  async function saveWeek(weekNumber: number) {
    if (readOnly) return;
    const d = draft[weekNumber];
    const parsed = parseFloat(d?.amount ?? "");
    if (Number.isNaN(parsed) || parsed < 0) {
      toast.error("Enter a valid amount for this week");
      return;
    }

    setSavingWeek(weekNumber);
    const payload = {
      team_member_id: teamMemberId,
      year_month: yearMonth,
      week_number: weekNumber,
      amount: parsed,
      currency: "USD",
      notes: d?.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("member_weekly_earnings").upsert(payload, {
      onConflict: "team_member_id,year_month,week_number",
    });

    if (error) toast.error(error.message);
    else {
      toast.success(`Week ${weekNumber} saved`);
      await loadEntries();
    }
    setSavingWeek(null);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Month total earned" value={formatMoney(monthTotal)} highlight />
        <StatCard
          label="Monthly income goal"
          value={incomeGoal != null && incomeGoal > 0 ? formatMoney(incomeGoal) : "Set goal above"}
        />
        <StatCard
          label="Progress toward goal"
          value={goalProgress != null ? `${goalProgress}%` : "—"}
          sub={
            goalProgress != null ? (
              <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-green transition-all"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
            ) : undefined
          }
        />
      </div>

      <p className="text-sm text-neutral-500">
        Break down what you earn each week for {formatYearMonthLabel(yearMonth)}. Weekly amounts add up to your month total.
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-green" />
        </div>
      ) : (
        <div className="space-y-3">
          {weeks.map((w) => (
            <div
              key={w.week}
              className="rounded-xl border border-neutral-200 bg-white p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
            >
              <div className="md:col-span-4">
                <p className="text-sm font-semibold text-neutral-900">{w.label}</p>
              </div>
              <div className="md:col-span-3 space-y-1">
                <Label className="text-xs text-neutral-500 uppercase tracking-wide">Amount (USD)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={draft[w.week]?.amount ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      [w.week]: { ...prev[w.week], amount: e.target.value, notes: prev[w.week]?.notes ?? "" },
                    }))
                  }
                  disabled={readOnly}
                  className="h-11"
                />
              </div>
              <div className="md:col-span-3 space-y-1">
                <Label className="text-xs text-neutral-500 uppercase tracking-wide">Notes</Label>
                <Input
                  placeholder="Optional"
                  value={draft[w.week]?.notes ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      [w.week]: { amount: prev[w.week]?.amount ?? "", notes: e.target.value },
                    }))
                  }
                  disabled={readOnly}
                  className="h-11"
                />
              </div>
              <div className="md:col-span-2">
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => saveWeek(w.week)}
                    disabled={savingWeek === w.week}
                    className="w-full h-11 rounded-lg bg-brand-green text-white text-sm font-medium hover:bg-brand-green-dark disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {savingWeek === w.week ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save week"
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-brand-green/25 bg-brand-green-light/20 px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-medium text-neutral-700">Total for {formatYearMonthLabel(yearMonth)}</span>
            <span className="text-lg font-bold text-brand-green-dark tabular-nums">{formatMoney(monthTotal)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
  sub,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  sub?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 md:p-5 flex flex-col justify-center min-h-[5.5rem]",
        highlight
          ? "border-brand-green/25 bg-gradient-to-br from-brand-green-light/50 to-white"
          : "border-neutral-200 bg-white"
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p
        className={cn(
          "text-xl md:text-2xl font-bold mt-1 tabular-nums",
          highlight ? "text-brand-green-dark" : "text-neutral-900"
        )}
      >
        {value}
      </p>
      {sub}
    </div>
  );
}
