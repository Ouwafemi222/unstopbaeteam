"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Loader2,
  Target,
  ClipboardCheck,
  Upload,
  DollarSign,
  Users,
  Building2,
  Phone,
  GraduationCap,
  Calendar,
  Sparkles,
  Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getMemberImageUrl,
  monthlyPlanImagePath,
  uploadMemberImage,
} from "@/lib/storage/member-uploads";
import { MemberWeeklyEarningsPanel } from "@/components/members/member-weekly-earnings-panel";
import {
  MemberGoalsOcrEntry,
  type GoalsFillMode,
} from "@/components/members/member-goals-ocr-entry";
import type { ParsedGoalsFromOcr } from "@/lib/forecast/goals-ocr-parse";
import {
  buildYearMonthOptions,
  currentYearMonth,
  formatYearMonthLabel,
  groupYearMonthOptionsByYear,
} from "@/lib/utils/dates";
import type { MemberMonthlyPlan } from "@/types/database";

const MONTH_PICKER_YEARS_AHEAD = 5;
const monthOptions = buildYearMonthOptions(MONTH_PICKER_YEARS_AHEAD);
const monthOptionsByYear = groupYearMonthOptionsByYear(monthOptions);

interface MemberMonthlyPlanPanelProps {
  teamMemberId: string;
  memberName: string;
  readOnly?: boolean;
  /** "page" = full hero (my-monthly-plan). "embedded" = compact header (profile). */
  variant?: "page" | "embedded";
}

export function MemberMonthlyPlanPanel({
  teamMemberId,
  memberName,
  readOnly,
  variant = "embedded",
}: MemberMonthlyPlanPanelProps) {
  const supabase = createClient();
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState<MemberMonthlyPlan | null>(null);
  const [goals, setGoals] = useState("");
  const [evaluation, setEvaluation] = useState("");
  const [incomeGoal, setIncomeGoal] = useState("");
  const [prospectsTarget, setProspectsTarget] = useState("");
  const [officeProspects, setOfficeProspects] = useState("");
  const [contactsExpected, setContactsExpected] = useState("");
  const [skillsToLearn, setSkillsToLearn] = useState("");
  const [goalsImageUrl, setGoalsImageUrl] = useState<string | null>(null);
  const [evaluationImageUrl, setEvaluationImageUrl] = useState<string | null>(null);
  const [goalsFile, setGoalsFile] = useState<File | null>(null);
  const [evaluationFile, setEvaluationFile] = useState<File | null>(null);
  const [fillMode, setFillMode] = useState<GoalsFillMode>("choose");

  const isLocked = plan?.is_locked ?? false;
  const fieldsDisabled = readOnly || isLocked;

  const loadImageUrls = useCallback(
    async (record: MemberMonthlyPlan | null) => {
      if (!record) {
        setGoalsImageUrl(null);
        setEvaluationImageUrl(null);
        return;
      }
      const [goalsUrl, evalUrl] = await Promise.all([
        record.goals_image_path ? getMemberImageUrl(supabase, record.goals_image_path) : null,
        record.evaluation_image_path
          ? getMemberImageUrl(supabase, record.evaluation_image_path)
          : null,
      ]);
      setGoalsImageUrl(goalsUrl);
      setEvaluationImageUrl(evalUrl);
    },
    [supabase]
  );

  const applyRecord = useCallback(
    async (record: MemberMonthlyPlan | null) => {
      setPlan(record);
      setGoals(record?.goals ?? "");
      setEvaluation(record?.evaluation ?? "");
      setIncomeGoal(record?.income_goal != null ? String(record.income_goal) : "");
      setProspectsTarget(record?.prospects_target != null ? String(record.prospects_target) : "");
      setOfficeProspects(
        record?.office_prospects_expected != null ? String(record.office_prospects_expected) : ""
      );
      setContactsExpected(record?.contacts_expected != null ? String(record.contacts_expected) : "");
      setSkillsToLearn(record?.skills_to_learn ?? "");
      setGoalsFile(null);
      setEvaluationFile(null);
      if (record?.is_locked) setFillMode("manual");
      else if (!record) setFillMode("choose");
      await loadImageUrls(record);
    },
    [loadImageUrls]
  );

  const loadPlan = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("member_monthly_plans")
      .select("*")
      .eq("team_member_id", teamMemberId)
      .eq("year_month", yearMonth)
      .maybeSingle();

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    await applyRecord((data as MemberMonthlyPlan | null) ?? null);
    setLoading(false);
  }, [supabase, teamMemberId, yearMonth, applyRecord]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  function parseOptionalInt(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = parseInt(trimmed, 10);
    return Number.isNaN(n) ? null : n;
  }

  function parseOptionalMoney(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = parseFloat(trimmed);
    return Number.isNaN(n) ? null : n;
  }

  async function handleSave() {
    if (readOnly || isLocked) {
      toast.error("This month's goals are locked and cannot be edited");
      return;
    }
    setSaving(true);

    try {
      let goalsImagePath = plan?.goals_image_path ?? null;
      let evaluationImagePath = plan?.evaluation_image_path ?? null;

      if (goalsFile) {
        const ext = goalsFile.name.split(".").pop() ?? "jpg";
        const path = monthlyPlanImagePath(teamMemberId, yearMonth, "goals", ext);
        goalsImagePath = await uploadMemberImage(supabase, goalsFile, path);
      }

      if (evaluationFile) {
        const ext = evaluationFile.name.split(".").pop() ?? "jpg";
        const path = monthlyPlanImagePath(teamMemberId, yearMonth, "evaluation", ext);
        evaluationImagePath = await uploadMemberImage(supabase, evaluationFile, path);
      }

      const payload = {
        team_member_id: teamMemberId,
        year_month: yearMonth,
        goals: goals.trim() || null,
        evaluation: evaluation.trim() || null,
        income_goal: parseOptionalMoney(incomeGoal),
        prospects_target: parseOptionalInt(prospectsTarget),
        office_prospects_expected: parseOptionalInt(officeProspects),
        contacts_expected: parseOptionalInt(contactsExpected),
        skills_to_learn: skillsToLearn.trim() || null,
        goals_image_path: goalsImagePath,
        evaluation_image_path: evaluationImagePath,
        is_locked: true,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = plan?.id
        ? await supabase
            .from("member_monthly_plans")
            .update(payload)
            .eq("id", plan.id)
            .eq("is_locked", false)
            .select()
            .single()
        : await supabase.from("member_monthly_plans").insert(payload).select().single();

      if (error) throw error;

      await applyRecord(data as MemberMonthlyPlan);
      toast.success("Monthly goals saved and locked for this month");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const parsedIncomeGoal = parseOptionalMoney(incomeGoal);
  const monthLabel = formatYearMonthLabel(yearMonth);
  const showGoalForm = isLocked || fillMode !== "choose";

  function handleApplyOcr(parsed: ParsedGoalsFromOcr, imageFile: File) {
    setGoals(parsed.goals);
    if (parsed.income_goal != null) setIncomeGoal(String(parsed.income_goal));
    if (parsed.prospects_target != null) setProspectsTarget(String(parsed.prospects_target));
    if (parsed.office_prospects_expected != null) {
      setOfficeProspects(String(parsed.office_prospects_expected));
    }
    if (parsed.contacts_expected != null) setContactsExpected(String(parsed.contacts_expected));
    if (parsed.skills_to_learn) setSkillsToLearn(parsed.skills_to_learn);
    setGoalsFile(imageFile);
  }

  const monthSelect = (
    <div className="space-y-1.5 shrink-0">
      <Label
        htmlFor="plan-month"
        className={cn(
          "text-xs uppercase tracking-wide",
          variant === "page" ? "text-white/70" : "text-neutral-500"
        )}
      >
        Select month
      </Label>
      <div className="relative">
        <Calendar
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none",
            variant === "page" ? "text-white/60" : "text-neutral-400"
          )}
        />
        <select
          id="plan-month"
          value={yearMonth}
          onChange={(e) => setYearMonth(e.target.value)}
          className={cn(
            "h-11 w-full min-w-[11rem] rounded-lg border pl-10 pr-3 text-sm font-medium appearance-none cursor-pointer",
            variant === "page"
              ? "border-white/20 bg-white/10 text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/30"
              : "border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          )}
        >
          {[...monthOptionsByYear.entries()]
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([year, months]) => (
              <optgroup key={year} label={year}>
                {months.map((ym) => (
                  <option key={ym} value={ym} className="text-neutral-900">
                    {formatYearMonthLabel(ym)}
                  </option>
                ))}
              </optgroup>
            ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Hero / header */}
      {variant === "page" ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 via-brand-green-dark to-brand-green shadow-lg">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_80%_20%,#fff,transparent_50%)]" />
          <div className="relative p-6 md:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white/70 text-sm font-medium uppercase tracking-wider">
                <Sparkles className="h-4 w-4" />
                Monthly planning
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Goals &amp; Evaluation
              </h1>
              <p className="text-white/75 text-sm md:text-base max-w-lg">
                Plan targets, log weekly earnings, and review your month — {memberName}
              </p>
              <p className="text-white/90 text-sm font-medium pt-1">
                Viewing: <span className="text-white">{monthLabel}</span>
              </p>
            </div>
            {monthSelect}
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-neutral-200">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
              <Target className="h-5 w-5 text-brand-green" />
              Monthly Goals &amp; Evaluation
            </h2>
            <p className="text-sm text-neutral-500 mt-0.5">{monthLabel} · {memberName}</p>
          </div>
          {monthSelect}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 rounded-2xl border border-neutral-200 bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
        </div>
      ) : (
        <div className="space-y-8">
          {isLocked && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <Lock className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Goals locked for {monthLabel}</p>
                <p className="text-amber-800/80 mt-0.5">
                  Your monthly targets and written goals cannot be changed. You can still update weekly earnings below.
                </p>
              </div>
            </div>
          )}

          {!fieldsDisabled && (
            <MemberGoalsOcrEntry
              fillMode={fillMode}
              onFillModeChange={setFillMode}
              onApplyOcr={handleApplyOcr}
            />
          )}

          {showGoalForm && (
            <>
          {/* Section 1: Targets */}
          <PlanSection
            step={1}
            title="Monthly Targets"
            description="Set your numbers and learning focus for this month"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MetricField
                icon={<DollarSign className="h-5 w-5" />}
                iconBg="bg-emerald-100 text-emerald-700"
                label="Income goal"
                hint="How much do you want to make? (USD)"
              >
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="500"
                  value={incomeGoal}
                  onChange={(e) => setIncomeGoal(e.target.value)}
                  disabled={fieldsDisabled}
                  className="h-11"
                />
              </MetricField>
              <MetricField
                icon={<Users className="h-5 w-5" />}
                iconBg="bg-blue-100 text-blue-700"
                label="Prospects"
                hint="How many prospects do you want?"
              >
                <Input
                  type="number"
                  min="0"
                  placeholder="20"
                  value={prospectsTarget}
                  onChange={(e) => setProspectsTarget(e.target.value)}
                  disabled={fieldsDisabled}
                  className="h-11"
                />
              </MetricField>
              <MetricField
                icon={<Building2 className="h-5 w-5" />}
                iconBg="bg-violet-100 text-violet-700"
                label="Office prospects"
                hint="How many prospects expected in the office?"
              >
                <Input
                  type="number"
                  min="0"
                  placeholder="5"
                  value={officeProspects}
                  onChange={(e) => setOfficeProspects(e.target.value)}
                  disabled={fieldsDisabled}
                  className="h-11"
                />
              </MetricField>
              <MetricField
                icon={<Phone className="h-5 w-5" />}
                iconBg="bg-orange-100 text-orange-700"
                label="Contacts"
                hint="How many contacts do you expect to get?"
              >
                <Input
                  type="number"
                  min="0"
                  placeholder="50"
                  value={contactsExpected}
                  onChange={(e) => setContactsExpected(e.target.value)}
                  disabled={fieldsDisabled}
                  className="h-11"
                />
              </MetricField>
            </div>
            <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4 md:p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-neutral-900">Skills &amp; office training</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    What specific things do you plan to learn this month?
                  </p>
                </div>
              </div>
              <Textarea
                value={skillsToLearn}
                onChange={(e) => setSkillsToLearn(e.target.value)}
                placeholder="e.g. Better gig research, faster replies, Photoshop basics, negotiation with buyers..."
                rows={3}
                disabled={fieldsDisabled}
                className="resize-none"
              />
            </div>
          </PlanSection>

          <PlanSection
            step={2}
            title="Written Goals & Evaluation"
            description="Add notes and photos of your handwritten goals or monthly review"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WriteCard
                icon={<Target className="h-4 w-4 text-brand-green" />}
                title="Written goals"
                placeholder="Other goals for this month — accounts to open, gigs to launch, milestones..."
                value={goals}
                onChange={setGoals}
                readOnly={fieldsDisabled}
                uploadId="goals-image"
                onFileChange={setGoalsFile}
                previewUrl={goalsFile ? URL.createObjectURL(goalsFile) : goalsImageUrl}
                accent="green"
              />
              <WriteCard
                icon={<ClipboardCheck className="h-4 w-4 text-brand-orange" />}
                title="Monthly evaluation"
                placeholder="How did the month go? What worked well? What will you improve next month?"
                value={evaluation}
                onChange={setEvaluation}
                readOnly={fieldsDisabled}
                uploadId="evaluation-image"
                onFileChange={setEvaluationFile}
                previewUrl={
                  evaluationFile ? URL.createObjectURL(evaluationFile) : evaluationImageUrl
                }
                accent="orange"
              />
            </div>
          </PlanSection>
            </>
          )}

          <PlanSection
            step={3}
            title="Weekly Earnings"
            description="Log what you earn each week — amounts add up toward your monthly income goal"
          >
            <MemberWeeklyEarningsPanel
              teamMemberId={teamMemberId}
              yearMonth={yearMonth}
              incomeGoal={parsedIncomeGoal}
              readOnly={readOnly}
            />
          </PlanSection>
        </div>
      )}

      {!fieldsDisabled && !loading && showGoalForm && (
        <div className="sticky bottom-4 z-10 flex justify-end">
          <div className="rounded-xl border border-neutral-200 bg-white/95 backdrop-blur-sm shadow-lg px-4 py-3 flex items-center gap-3">
            <p className="text-sm text-neutral-500 hidden sm:block">
              Save locks goals for <strong className="text-neutral-800">{monthLabel}</strong>
            </p>
            <Button onClick={handleSave} disabled={saving} size="lg" className="min-w-[10rem]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & lock goals"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanSection({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-start gap-4 px-5 py-4 md:px-6 md:py-5 border-b border-neutral-100 bg-neutral-50/80">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green text-white text-sm font-bold">
          {step}
        </div>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
          <p className="text-sm text-neutral-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}

function MetricField({
  icon,
  iconBg,
  label,
  hint,
  children,
}: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 flex gap-3 h-full">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", iconBg)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <p className="text-sm font-semibold text-neutral-900">{label}</p>
          <p className="text-xs text-neutral-500 leading-snug">{hint}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function WriteCard({
  icon,
  title,
  placeholder,
  value,
  onChange,
  readOnly,
  uploadId,
  onFileChange,
  previewUrl,
  accent,
}: {
  icon: ReactNode;
  title: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  uploadId: string;
  onFileChange: (f: File | null) => void;
  previewUrl: string | null;
  accent: "green" | "orange";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border flex flex-col h-full",
        accent === "green" ? "border-brand-green/20" : "border-brand-orange/20"
      )}
    >
      <div
        className={cn(
          "px-4 py-3 border-b flex items-center gap-2 font-medium text-sm",
          accent === "green"
            ? "bg-brand-green-light/30 border-brand-green/10 text-brand-green-dark"
            : "bg-brand-orange-light/30 border-brand-orange/10 text-brand-orange-dark"
        )}
      >
        {icon}
        {title}
      </div>
      <div className="p-4 flex flex-col flex-1 gap-4">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={6}
          disabled={readOnly}
          className="flex-1 resize-none min-h-[8rem]"
        />
        {!readOnly && (
          <label
            htmlFor={uploadId}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 px-4 py-6 cursor-pointer hover:border-brand-green/40 hover:bg-brand-green-light/10 transition-colors"
          >
            <Upload className="h-5 w-5 text-neutral-400" />
            <span className="text-xs text-neutral-500 text-center">
              Upload a photo (optional)
            </span>
            <input
              id={uploadId}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
        {previewUrl && (
          <div className="rounded-xl border overflow-hidden bg-neutral-50 aspect-video max-h-48">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Upload preview" className="w-full h-full object-contain" />
          </div>
        )}
      </div>
    </div>
  );
}
