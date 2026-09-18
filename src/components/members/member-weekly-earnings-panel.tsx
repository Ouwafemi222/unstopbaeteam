"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  DollarSign,
  GraduationCap,
  Leaf,
  Loader2,
  Lock,
  Phone,
  Target,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getWeeksInMonth } from "@/lib/members/week-utils";
import { formatYearMonthLabel } from "@/lib/utils/dates";
import { formatDateTime } from "@/lib/utils";
import {
  applyFiverrFee,
  convertWithGbpBaseRates,
  EARNING_CURRENCIES,
  FIVERR_SERVICE_FEE_PERCENT,
  formatMoney,
  formatNgn,
  type EarningCurrency,
  type PaymentSource,
} from "@/lib/money/earnings";
import type { ExchangeRates } from "@/app/api/currency/rates/route";
import type { MemberWeeklyEarning } from "@/types/database";

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
  paymentSource: PaymentSource;
  currency: EarningCurrency;
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
  paymentSource: "fiverr",
  currency: "USD",
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
  const [rates, setRates] = useState<ExchangeRates | null>(null);

  const weeks = useMemo(() => getWeeksInMonth(yearMonth), [yearMonth]);

  useEffect(() => {
    fetch("/api/currency/rates")
      .then((r) => r.json())
      .then((data) => {
        if (data?.rates) setRates(data);
      })
      .catch(() => {});
  }, []);

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
      const source = (row?.payment_source as PaymentSource) || "fiverr";
      const currency = (row?.currency as EarningCurrency) || "USD";
      const displayAmount =
        source === "fiverr" && row?.gross_amount != null
          ? row.gross_amount
          : row?.amount;
      nextDraft[w.week] = row
        ? {
            paymentSource: source,
            currency: EARNING_CURRENCIES.includes(currency) ? currency : "USD",
            amount: displayAmount != null ? String(displayAmount) : "",
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
      incomeNgn: entries.reduce((sum, e) => sum + Number(e.amount_ngn ?? 0), 0),
      fees: entries.reduce((sum, e) => sum + Number(e.fee_amount ?? 0), 0),
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

  function previewForWeek(week: number) {
    const d = draft[week] ?? emptyDraft();
    const entered = parseOptionalNonNegativeMoney(d.amount);
    if (Number.isNaN(entered) || entered <= 0) return null;

    if (d.paymentSource === "fiverr") {
      const fee = applyFiverrFee(entered);
      const ngn =
        rates?.rates
          ? convertWithGbpBaseRates(fee.net, "USD", "NGN", rates.rates)
          : NaN;
      return {
        source: "fiverr" as const,
        currency: "USD" as const,
        gross: fee.gross,
        feeAmount: fee.feeAmount,
        feePercent: fee.feePercent,
        net: fee.net,
        ngn: Number.isFinite(ngn) ? ngn : null,
      };
    }

    const currency = d.currency;
    const ngn =
      rates?.rates
        ? convertWithGbpBaseRates(entered, currency, "NGN", rates.rates)
        : NaN;
    return {
      source: "outside" as const,
      currency,
      gross: entered,
      feeAmount: 0,
      feePercent: 0,
      net: entered,
      ngn: Number.isFinite(ngn) ? ngn : null,
    };
  }

  async function saveWeek(weekNumber: number) {
    if (readOnly) return;
    const existing = entries.find((e) => e.week_number === weekNumber);
    if (existing?.is_locked) {
      toast.error("This week is locked and cannot be edited");
      return;
    }

    const d = draft[weekNumber] ?? emptyDraft();

    const entered = parseOptionalNonNegativeMoney(d.amount);
    const prospects = parseOptionalNonNegativeInt(d.prospects);
    const officeProspects = parseOptionalNonNegativeInt(d.officeProspects);
    const contacts = parseOptionalNonNegativeInt(d.contacts);
    const personalPv = parseOptionalNonNegativeInt(d.personalPv);
    const groupPv = parseOptionalNonNegativeInt(d.groupPv);

    if (
      Number.isNaN(entered) ||
      Number.isNaN(prospects) ||
      Number.isNaN(officeProspects) ||
      Number.isNaN(contacts) ||
      Number.isNaN(personalPv) ||
      Number.isNaN(groupPv)
    ) {
      toast.error("Enter valid numbers (0 or higher) for all count and amount fields");
      return;
    }

    if (d.paymentSource === "outside" && entered > 0 && !d.currency) {
      toast.error("Select the currency for this outside payment");
      return;
    }

    let currency: EarningCurrency = d.paymentSource === "fiverr" ? "USD" : d.currency;
    let grossAmount = entered;
    let feePercent = 0;
    let feeAmount = 0;
    let netAmount = entered;

    if (d.paymentSource === "fiverr" && entered > 0) {
      const fee = applyFiverrFee(entered);
      grossAmount = fee.gross;
      feePercent = fee.feePercent;
      feeAmount = fee.feeAmount;
      netAmount = fee.net;
      currency = "USD";
    }

    let amountNgn: number | null = null;
    let fxRate: number | null = null;
    let fxFetchedAt: string | null = null;

    if (netAmount > 0) {
      let ratesPayload = rates;
      if (!ratesPayload?.rates) {
        try {
          const res = await fetch("/api/currency/rates");
          const data = await res.json();
          if (data?.rates) {
            ratesPayload = data;
            setRates(data);
          }
        } catch {
          // continue without NGN
        }
      }
      if (ratesPayload?.rates) {
        const ngn = convertWithGbpBaseRates(netAmount, currency, "NGN", ratesPayload.rates);
        if (Number.isFinite(ngn)) {
          amountNgn = ngn;
          fxRate =
            currency === "NGN"
              ? 1
              : convertWithGbpBaseRates(1, currency, "NGN", ratesPayload.rates);
          fxFetchedAt = ratesPayload.fetched_at ?? new Date().toISOString();
        }
      }
    }

    setSavingWeek(weekNumber);
    const nowIso = new Date().toISOString();
    const payload = {
      team_member_id: teamMemberId,
      year_month: yearMonth,
      week_number: weekNumber,
      amount: netAmount,
      currency,
      payment_source: d.paymentSource,
      gross_amount: d.paymentSource === "fiverr" ? grossAmount : netAmount,
      fee_amount: feeAmount,
      fee_percent: feePercent,
      amount_ngn: amountNgn,
      fx_rate: fxRate,
      fx_fetched_at: fxFetchedAt,
      prospects_count: prospects,
      office_prospects_count: officeProspects,
      contacts_count: contacts,
      personal_pv: personalPv,
      group_pv: groupPv,
      activities_done: d.activitiesDone.trim() || null,
      skills_progress: d.skillsProgress.trim() || null,
      notes: null,
      is_locked: true,
      locked_at: nowIso,
      updated_at: nowIso,
    };

    const { error } = await supabase.from("member_weekly_earnings").upsert(payload, {
      onConflict: "team_member_id,year_month,week_number",
    });

    if (error) {
      toast.error(
        error.message.includes("locked")
          ? "This week is locked and cannot be edited"
          : error.message
      );
    } else {
      const feeNote =
        feeAmount > 0
          ? ` (Fiverr fee ${formatMoney(feeAmount)} deducted — net ${formatMoney(netAmount)})`
          : "";
      toast.success(`Week ${weekNumber} saved and locked${feeNote}`);
      if (netAmount > 0) {
        try {
          const res = await fetch("/api/fines/earning-alert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              earnedAmount: netAmount,
              earnedCurrency: currency,
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
          // Non-blocking
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
        goals for {formatYearMonthLabel(yearMonth)}. Choose{" "}
        <strong>Fiverr</strong> (we auto-remove the {FIVERR_SERVICE_FEE_PERCENT}% service fee) or{" "}
        <strong>Outside payment</strong> (pick currency — we convert to Naira). Then click{" "}
        <strong>Save &amp; lock week</strong>.
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
            label="Income earned (net)"
            actual={formatMoney(totals.income)}
            target={formatMoney(goals.incomeGoal)}
            pct={progressPct(totals.income, goals.incomeGoal)}
            highlight
            sub={
              totals.incomeNgn > 0
                ? `≈ ${formatNgn(totals.incomeNgn)}${
                    totals.fees > 0 ? ` · fees ${formatMoney(totals.fees)}` : ""
                  }`
                : totals.fees > 0
                  ? `Fiverr fees deducted: ${formatMoney(totals.fees)}`
                  : undefined
            }
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
          {weeks.map((w) => {
            const row = entries.find((e) => e.week_number === w.week);
            const weekLocked = Boolean(row?.is_locked) || Boolean(readOnly);
            const canEdit = !readOnly && !row?.is_locked;
            const d = draft[w.week] ?? emptyDraft();
            const preview = previewForWeek(w.week);

            return (
              <div
                key={w.week}
                className={cn(
                  "rounded-xl border bg-white overflow-hidden",
                  row?.is_locked ? "border-brand-green/30" : "border-neutral-200"
                )}
              >
                <div
                  className={cn(
                    "px-4 py-3 border-b flex items-center justify-between gap-3",
                    row?.is_locked
                      ? "bg-brand-green-light/40 border-brand-green/20"
                      : "bg-neutral-50 border-neutral-200"
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900">{w.label}</p>
                    {row?.is_locked && (
                      <p className="text-xs text-brand-green-dark mt-0.5 flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Locked
                        {row.locked_at ? ` · ${formatDateTime(row.locked_at)}` : ""} — view only
                      </p>
                    )}
                  </div>
                  {canEdit ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => saveWeek(w.week)}
                      disabled={savingWeek === w.week}
                      className="shrink-0"
                    >
                      {savingWeek === w.week ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5" />
                          Save &amp; lock week
                        </>
                      )}
                    </Button>
                  ) : row?.is_locked ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-green text-white text-xs font-semibold px-3 py-1.5">
                      <Lock className="h-3 w-3" />
                      Locked
                    </span>
                  ) : null}
                </div>

                <div className="p-4 space-y-4">
                  {(goals.incomeGoal == null || goals.incomeGoal > 0) && (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={weekLocked}
                          onClick={() =>
                            updateDraft(w.week, { paymentSource: "fiverr", currency: "USD" })
                          }
                          className={cn(
                            "rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors",
                            d.paymentSource === "fiverr"
                              ? "bg-brand-green text-white border-brand-green"
                              : "bg-white text-neutral-600 border-neutral-200 hover:border-brand-green/40"
                          )}
                        >
                          From Fiverr
                        </button>
                        <button
                          type="button"
                          disabled={weekLocked}
                          onClick={() => updateDraft(w.week, { paymentSource: "outside" })}
                          className={cn(
                            "rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors",
                            d.paymentSource === "outside"
                              ? "bg-brand-orange text-white border-brand-orange"
                              : "bg-white text-neutral-600 border-neutral-200 hover:border-brand-orange/40"
                          )}
                        >
                          Outside payment
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {d.paymentSource === "outside" && (
                          <Field label="Currency">
                            <select
                              disabled={weekLocked}
                              value={d.currency}
                              onChange={(e) =>
                                updateDraft(w.week, {
                                  currency: e.target.value as EarningCurrency,
                                })
                              }
                              className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm"
                            >
                              {EARNING_CURRENCIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </Field>
                        )}
                        <Field
                          label={
                            d.paymentSource === "fiverr"
                              ? "Gross from Fiverr (USD)"
                              : `Amount received (${d.currency})`
                          }
                          hint={
                            d.paymentSource === "fiverr"
                              ? `${FIVERR_SERVICE_FEE_PERCENT}% service fee removed automatically`
                              : "We'll convert this to Naira using live rates"
                          }
                        >
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={d.amount}
                            onChange={(e) => updateDraft(w.week, { amount: e.target.value })}
                            disabled={weekLocked}
                            className="h-10"
                          />
                        </Field>
                      </div>

                      {preview && preview.net > 0 && (
                        <div className="text-sm space-y-1 rounded-lg bg-white border border-emerald-100 px-3 py-2.5">
                          {preview.source === "fiverr" && (
                            <>
                              <p className="text-neutral-600">
                                Gross{" "}
                                <span className="font-semibold text-neutral-900">
                                  {formatMoney(preview.gross)}
                                </span>
                                {" · "}
                                Fee (−{preview.feePercent}%){" "}
                                <span className="font-semibold text-red-600">
                                  −{formatMoney(preview.feeAmount)}
                                </span>
                              </p>
                              <p className="text-neutral-900 font-semibold">
                                You keep {formatMoney(preview.net)}
                                {preview.ngn != null ? (
                                  <span className="text-neutral-500 font-normal">
                                    {" "}
                                    ≈ {formatNgn(preview.ngn)}
                                  </span>
                                ) : null}
                              </p>
                            </>
                          )}
                          {preview.source === "outside" && (
                            <p className="text-neutral-900 font-semibold">
                              {formatMoney(preview.net, preview.currency)}
                              {preview.ngn != null ? (
                                <span className="text-neutral-500 font-normal">
                                  {" "}
                                  ≈ {formatNgn(preview.ngn)}
                                </span>
                              ) : (
                                <span className="text-amber-600 font-normal text-xs ml-2">
                                  (Naira rate loading…)
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      )}

                      {row?.is_locked && Number(row.amount) > 0 && (
                        <div className="text-xs text-neutral-500">
                          Saved net: {formatMoney(Number(row.amount), row.currency)}
                          {row.fee_amount > 0 &&
                            ` · fee ${formatMoney(Number(row.fee_amount), row.currency)}`}
                          {row.amount_ngn != null && ` · ${formatNgn(Number(row.amount_ngn))}`}
                          {row.payment_source === "outside" ? " · outside" : " · Fiverr"}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                          disabled={weekLocked}
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
                          onChange={(e) =>
                            updateDraft(w.week, { officeProspects: e.target.value })
                          }
                          disabled={weekLocked}
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
                          disabled={weekLocked}
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
                          disabled={weekLocked}
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
                          disabled={weekLocked}
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
                            onChange={(e) =>
                              updateDraft(w.week, { activitiesDone: e.target.value })
                            }
                            disabled={weekLocked}
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
                            onChange={(e) =>
                              updateDraft(w.week, { skillsProgress: e.target.value })
                            }
                            disabled={weekLocked}
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
                        disabled={weekLocked}
                        rows={2}
                        className="resize-none text-sm"
                      />
                    </Field>
                  )}
                </div>
              </div>
            );
          })}
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
  sub,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  actual: string;
  target: string;
  pct: number | null;
  highlight?: boolean;
  sub?: string;
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
      {sub && <p className="text-[11px] text-neutral-500">{sub}</p>}
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
