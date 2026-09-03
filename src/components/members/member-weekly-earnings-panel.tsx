"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, DollarSign, GraduationCap, Leaf, Loader2, Phone, Target, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getWeeksInMonth } from "@/lib/members/week-utils";
import { formatYearMonthLabel } from "@/lib/utils/dates";
import type { MemberWeeklyEarning } from "@/types/database";

function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function parseOptionalNonNegativeInt(value: string): number {
  if (value.trim() === "") return 0;
  const n = parseInt(value, 10);
  return Number.isNaN(n) || n < 0 ? NaN : n;
}

function parseOptionalNonNegativeMoney(value: string): number {
  if (value.trim() === "") return 0;
  const n = parseFloat(value);
  return Number.isNaN(n) || n < 0 ? NaN : n;
}

function progressPct(actual: number, target: number | null | undefined): number | null {
  if (target == null || target <= 0) return null;
  return Math.min(100, Math.round((actual / target) * 100));
}

export interface MonthlyGoalsSnapshot {
  incomeGoal?: number | null;
  weeklyIncomeGoal?: number | null;
  prospectsTarget?: number | null;
  officeProspectsExpected?: number | null;
  contactsExpected?: number | null;
  personalPvTarget?: number | null;
  groupPvTarget?: number | null;
  skillsToLearn?: string | null;
  writtenGoals?: string | null;
}

interface WeekDraft {
  amount: string;
  prospects: string;
  officeProspects: string;
  contacts: string;
  personalPv: string;
  groupPv: string;
  activitiesDone: string;
  skillsProgress: string;
}

const emptyDraft = (): WeekDraft => ({
  amount: "",
  prospects: "",
  officeProspects: "",
  contacts: "",
  personalPv: "",
  groupPv: "",
  activitiesDone: "",
  skillsProgress: "",
});

interface MemberWeeklyEarningsPanelProps {
  teamMemberId: string;
  yearMonth: string;
  /** @deprecated Pass monthlyGoals instead */
  incomeGoal?: number | null;
  monthlyGoals?: MonthlyGoalsSnapshot;
  readOnly?: boolean;
}

export function MemberWeeklyEarningsPanel({
  teamMemberId,
  yearMonth,
  incomeGoal,
  monthlyGoals,
  readOnly,
}: MemberWeeklyEarningsPanelProps) {
  const goals: MonthlyGoalsSnapshot = monthlyGoals ?? { incomeGoal };
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [savingWeek, setSavingWeek] = useState<number | null>(null);
  const [entries, setEntries] = useState<MemberWeeklyEarning[]>([]);
  const [draft, setDraft] = useState<Record<number, WeekDraft>>({});

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

    const nextDraft: Record<number, WeekDraft> = {};
    weeks.forEach((w) => {
      const row = list.find((e) => e.week_number === w.week);
      nextDraft[w.week] = row
        ? {
            amount: row.amount != null ? String(row.amount) : "",
            prospects: row.prospects_count != null ? String(row.prospects_count) : "",
            officeProspects:
              row.office_prospects_count != null ? String(row.office_prospects_count) : "",
            contacts: row.contacts_count != null ? String(row.contacts_count) : "",
            personalPv: row.personal_pv != null ? String(row.personal_pv) : "",
            groupPv: row.group_pv != null ? String(row.group_pv) : "",
            activitiesDone: row.activities_done ?? "",
            skillsProgress: row.skills_progress ?? "",
          }
        : emptyDraft();
    });
    setDraft(nextDraft);
    setLoading(false);
  }, [supabase, teamMemberId, yearMonth, weeks]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const totals = useMemo(
    () => ({
      income: entries.reduce((sum, e) => sum + Number(e.amount), 0),
      prospects: entries.reduce((sum, e) => sum + Number(e.prospects_count ?? 0), 0),
      officeProspects: entries.reduce((sum, e) => sum + Number(e.office_prospects_count ?? 0), 0),
      contacts: entries.reduce((sum, e) => sum + Number(e.contacts_count ?? 0), 0),
      personalPv: entries.reduce((sum, e) => sum + Number(e.personal_pv ?? 0), 0),
      groupPv: entries.reduce((sum, e) => sum + Number(e.group_pv ?? 0), 0),
    }),
    [entries]
  );

  function updateDraft(week: number, patch: Partial<WeekDraft>) {
    setDraft((prev) => ({
      ...prev,
      [week]: { ...(prev[week] ?? emptyDraft()), ...patch },
    }));
  }

  async function saveWeek(weekNumber: number) {
    if (readOnly) return;
    const d = draft[weekNumber] ?? emptyDraft();

    const amount = parseOptionalNonNegativeMoney(d.amount);
    const prospects = parseOptionalNonNegativeInt(d.prospects);
    const officeProspects = parseOptionalNonNegativeInt(d.officeProspects);
    const contacts = parseOptionalNonNegativeInt(d.contacts);
    const personalPv = parseOptionalNonNegativeInt(d.personalPv);
    const groupPv = parseOptionalNonNegativeInt(d.groupPv);

    if (
      Number.isNaN(amount) ||
      Number.isNaN(prospects) ||
      Number.isNaN(officeProspects) ||
      Number.isNaN(contacts) ||
      Number.isNaN(personalPv) ||
      Number.isNaN(groupPv)
    ) {
      toast.error("Enter valid numbers (0 or higher) for all count and amount fields");
      return;
    }

    setSavingWeek(weekNumber);
    const payload = {
      team_member_id: teamMemberId,
      year_month: yearMonth,
      week_number: weekNumber,
      amount,
      currency: "USD",
      prospects_count: prospects,
      office_prospects_count: officeProspects,
      contacts_count: contacts,
      personal_pv: personalPv,
      group_pv: groupPv,
      activities_done: d.activitiesDone.trim() || null,
      skills_progress: d.skillsProgress.trim() || null,
      notes: null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("member_weekly_earnings").upsert(payload, {
      onConflict: "team_member_id,year_month,week_number",
    });

    if (error) toast.error(error.message);
    else {
      toast.success(`Week ${weekNumber} saved`);
      if (amount > 0) {
        try {
          const res = await fetch("/api/fines/earning-alert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              earnedAmount: amount,
              earnedCurrency: "USD",
              yearMonth,
              weekNumber,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (data.alerted && data.unpaidFineTotal > 0) {
            toast.warning(
              `Reminder: you still have an unpaid fine of ${new Intl.NumberFormat(
                data.fineCurrency === "NGN" ? "en-NG" : "en-US",
                { style: "currency", currency: data.fineCurrency ?? "NGN" }
              ).format(data.unpaidFineTotal)}`,
              { duration: 8000 }
            );
          }
        } catch {
          // Non-blocking — earnings already saved
        }
      }
      await loadEntries();
    }
    setSavingWeek(null);
  }

  const hasWrittenGoals = Boolean(goals.writtenGoals?.trim());
  const hasSkillsGoal = Boolean(goals.skillsToLearn?.trim());

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-500 leading-relaxed">
        Each week, log what you <strong>actually did and earned</strong> toward your locked monthly
        goals for {formatYearMonthLabel(yearMonth)}. This is your weekly breakdown — numbers and
        notes add up across the month. Click <strong>Save week</strong> on each row; only saved
        weeks count toward your progress.
      </p>

      {(goals.writtenGoals?.trim() || goals.skillsToLearn?.trim()) && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 space-y-2 text-sm">
          {goals.writtenGoals?.trim() && (
            <div>
              <p className="font-medium text-neutral-800 flex items-center gap-1.5">
                <Target className="h-4 w-4 text-brand-green" />
                Your written goals this month
              </p>
              <p className="text-neutral-600 mt-1 whitespace-pre-wrap">{goals.writtenGoals}</p>
            </div>
          )}
          {goals.skillsToLearn?.trim() && (
            <div className={goals.writtenGoals?.trim() ? "pt-2 border-t border-neutral-200" : ""}>
              <p className="font-medium text-neutral-800 flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-violet-600" />
                Skills to learn this month
              </p>
              <p className="text-neutral-600 mt-1 whitespace-pre-wrap">{goals.skillsToLearn}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {goals.incomeGoal != null && goals.incomeGoal > 0 && (
          <GoalProgressCard
            icon={<DollarSign className="h-4 w-4" />}
            iconBg="bg-emerald-100 text-emerald-700"
            label="Income earned"
            actual={formatMoney(totals.income)}
            target={formatMoney(goals.incomeGoal)}
            pct={progressPct(totals.income, goals.incomeGoal)}
            highlight
          />
        )}
        {goals.prospectsTarget != null && goals.prospectsTarget > 0 && (
          <GoalProgressCard
            icon={<Users className="h-4 w-4" />}
            iconBg="bg-blue-100 text-blue-700"
            label="Prospects"
            actual={String(totals.prospects)}
            target={String(goals.prospectsTarget)}
            pct={progressPct(totals.prospects, goals.prospectsTarget)}
          />
        )}
        {goals.officeProspectsExpected != null && goals.officeProspectsExpected > 0 && (
          <GoalProgressCard
            icon={<Building2 className="h-4 w-4" />}
            iconBg="bg-violet-100 text-violet-700"
            label="Office prospects"
            actual={String(totals.officeProspects)}
            target={String(goals.officeProspectsExpected)}
            pct={progressPct(totals.officeProspects, goals.officeProspectsExpected)}
          />
        )}
        {goals.contactsExpected != null && goals.contactsExpected > 0 && (
          <GoalProgressCard
            icon={<Phone className="h-4 w-4" />}
            iconBg="bg-orange-100 text-orange-700"
            label="Contacts"
            actual={String(totals.contacts)}
            target={String(goals.contactsExpected)}
            pct={progressPct(totals.contacts, goals.contactsExpected)}
          />
        )}
        {goals.personalPvTarget != null && goals.personalPvTarget > 0 && (
          <GoalProgressCard
            icon={<Leaf className="h-4 w-4" />}
            iconBg="bg-lime-100 text-lime-800"
            label="Personal PV"
            actual={`${totals.personalPv} PV`}
            target={`${goals.personalPvTarget} PV`}
            pct={progressPct(totals.personalPv, goals.personalPvTarget)}
          />
        )}
        {goals.groupPvTarget != null && goals.groupPvTarget > 0 && (
          <GoalProgressCard
            icon={<Users className="h-4 w-4" />}
            iconBg="bg-green-100 text-green-800"
            label="Group PV (GPV)"
            actual={`${totals.groupPv} GPV`}
            target={`${goals.groupPvTarget} GPV`}
            pct={progressPct(totals.groupPv, goals.groupPvTarget)}
          />
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-green" />
        </div>
      ) : (
        <div className="space-y-4">
          {weeks.map((w) => (
            <div
              key={w.week}
              className="rounded-xl border border-neutral-200 bg-white overflow-hidden"
            >
              <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-neutral-900">{w.label}</p>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => saveWeek(w.week)}
                    disabled={savingWeek === w.week}
                    className="shrink-0 h-9 px-4 rounded-lg bg-brand-green text-white text-sm font-medium hover:bg-brand-green-dark disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {savingWeek === w.week ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save week"
                    )}
                  </button>
                )}
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(goals.incomeGoal == null || goals.incomeGoal > 0) && (
                    <Field
                      label="Earned this week (USD)"
                      hint={goals.incomeGoal ? `Goal: ${formatMoney(goals.incomeGoal)} / month` : undefined}
                    >
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={draft[w.week]?.amount ?? ""}
                        onChange={(e) => updateDraft(w.week, { amount: e.target.value })}
                        disabled={readOnly}
                        className="h-10"
                      />
                    </Field>
                  )}
                  {(goals.prospectsTarget == null || goals.prospectsTarget > 0) && (
                    <Field
                      label="Prospects this week"
                      hint={
                        goals.prospectsTarget
                          ? `Goal: ${goals.prospectsTarget} / month`
                          : undefined
                      }
                    >
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={draft[w.week]?.prospects ?? ""}
                        onChange={(e) => updateDraft(w.week, { prospects: e.target.value })}
                        disabled={readOnly}
                        className="h-10"
                      />
                    </Field>
                  )}
                  {(goals.officeProspectsExpected == null ||
                    goals.officeProspectsExpected > 0) && (
                    <Field
                      label="Office prospects"
                      hint={
                        goals.officeProspectsExpected
                          ? `Goal: ${goals.officeProspectsExpected} / month`
                          : undefined
                      }
                    >
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={draft[w.week]?.officeProspects ?? ""}
                        onChange={(e) => updateDraft(w.week, { officeProspects: e.target.value })}
                        disabled={readOnly}
                        className="h-10"
                      />
                    </Field>
                  )}
                  {(goals.contactsExpected == null || goals.contactsExpected > 0) && (
                    <Field
                      label="Contacts this week"
                      hint={
                        goals.contactsExpected
                          ? `Goal: ${goals.contactsExpected} / month`
                          : undefined
                      }
                    >
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={draft[w.week]?.contacts ?? ""}
                        onChange={(e) => updateDraft(w.week, { contacts: e.target.value })}
                        disabled={readOnly}
                        className="h-10"
                      />
                    </Field>
                  )}
                  {(goals.personalPvTarget == null || goals.personalPvTarget > 0) && (
                    <Field
                      label="Personal PV this week"
                      hint={
                        goals.personalPvTarget
                          ? `Goal: ${goals.personalPvTarget} PV / month`
                          : undefined
                      }
                    >
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={draft[w.week]?.personalPv ?? ""}
                        onChange={(e) => updateDraft(w.week, { personalPv: e.target.value })}
                        disabled={readOnly}
                        className="h-10"
                      />
                    </Field>
                  )}
                  {(goals.groupPvTarget == null || goals.groupPvTarget > 0) && (
                    <Field
                      label="Group PV (GPV) this week"
                      hint={
                        goals.groupPvTarget
                          ? `Goal: ${goals.groupPvTarget} GPV / month`
                          : undefined
                      }
                    >
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={draft[w.week]?.groupPv ?? ""}
                        onChange={(e) => updateDraft(w.week, { groupPv: e.target.value })}
                        disabled={readOnly}
                        className="h-10"
                      />
                    </Field>
                  )}
                </div>

                {(hasWrittenGoals || hasSkillsGoal) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {hasWrittenGoals && (
                      <Field label="Activities done toward your goals">
                        <Textarea
                          placeholder="What did you do this week? (accounts opened, gigs applied, outreach, meetings…)"
                          value={draft[w.week]?.activitiesDone ?? ""}
                          onChange={(e) => updateDraft(w.week, { activitiesDone: e.target.value })}
                          disabled={readOnly}
                          rows={3}
                          className="resize-none text-sm"
                        />
                      </Field>
                    )}
                    {hasSkillsGoal && (
                      <Field label="Skills practiced this week">
                        <Textarea
                          placeholder="What skills did you work on or learn this week?"
                          value={draft[w.week]?.skillsProgress ?? ""}
                          onChange={(e) => updateDraft(w.week, { skillsProgress: e.target.value })}
                          disabled={readOnly}
                          rows={3}
                          className="resize-none text-sm"
                        />
                      </Field>
                    )}
                  </div>
                )}

                {!hasWrittenGoals && !hasSkillsGoal && (
                  <Field label="Weekly activities & notes">
                    <Textarea
                      placeholder="What did you accomplish this week toward your monthly goals?"
                      value={draft[w.week]?.activitiesDone ?? ""}
                      onChange={(e) => updateDraft(w.week, { activitiesDone: e.target.value })}
                      disabled={readOnly}
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </Field>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-neutral-600 font-medium">{label}</Label>
      {hint && <p className="text-[11px] text-neutral-400">{hint}</p>}
      {children}
    </div>
  );
}

function GoalProgressCard({
  icon,
  iconBg,
  label,
  actual,
  target,
  pct,
  highlight,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  actual: string;
  target: string;
  pct: number | null;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 flex flex-col gap-2",
        highlight
          ? "border-brand-green/25 bg-gradient-to-br from-brand-green-light/40 to-white"
          : "border-neutral-200 bg-white"
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg", iconBg)}>
          {icon}
        </span>
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      </div>
      <p className="text-lg font-bold text-neutral-900 tabular-nums">
        {actual}
        <span className="text-sm font-normal text-neutral-400"> / {target}</span>
      </p>
      {pct != null && (
        <div>
          <p className="text-xs text-neutral-500 mb-1">{pct}% of monthly goal</p>
          <div className="h-1.5 w-full rounded-full bg-neutral-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-green transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
