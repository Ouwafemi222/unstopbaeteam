"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Target, ClipboardCheck, Upload, ListChecks } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  getMemberImageUrl,
  monthlyPlanImagePath,
  uploadMemberImage,
} from "@/lib/storage/member-uploads";
import { MemberDailyEarningsPanel } from "@/components/members/member-daily-earnings-panel";
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
}

export function MemberMonthlyPlanPanel({
  teamMemberId,
  memberName,
  readOnly,
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
    if (readOnly) return;
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
        updated_at: new Date().toISOString(),
      };

      const { data, error } = plan?.id
        ? await supabase
            .from("member_monthly_plans")
            .update(payload)
            .eq("id", plan.id)
            .select()
            .single()
        : await supabase.from("member_monthly_plans").insert(payload).select().single();

      if (error) throw error;

      await applyRecord(data as MemberMonthlyPlan);
      toast.success("Monthly plan saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const parsedIncomeGoal = parseOptionalMoney(incomeGoal);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <Target className="h-5 w-5 text-brand-green" />
            Monthly Goals &amp; Evaluation
          </h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            Plan your month, log daily earnings, and review progress for {memberName}
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="plan-month">Month</Label>
          <select
            id="plan-month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm min-w-[12rem]"
          >
            {[...monthOptionsByYear.entries()]
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([year, months]) => (
                <optgroup key={year} label={year}>
                  {months.map((ym) => (
                    <option key={ym} value={ym}>
                      {formatYearMonthLabel(ym)}
                    </option>
                  ))}
                </optgroup>
              ))}
          </select>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-green" />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-brand-orange/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-brand-orange" />
                Monthly Targets — {formatYearMonthLabel(yearMonth)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="income-goal">How much do you want to make? (USD)</Label>
                  <Input
                    id="income-goal"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 500"
                    value={incomeGoal}
                    onChange={(e) => setIncomeGoal(e.target.value)}
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prospects-target">How many prospects?</Label>
                  <Input
                    id="prospects-target"
                    type="number"
                    min="0"
                    placeholder="e.g. 20"
                    value={prospectsTarget}
                    onChange={(e) => setProspectsTarget(e.target.value)}
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="office-prospects">Prospects expected in the office</Label>
                  <Input
                    id="office-prospects"
                    type="number"
                    min="0"
                    placeholder="e.g. 5"
                    value={officeProspects}
                    onChange={(e) => setOfficeProspects(e.target.value)}
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contacts-expected">Contacts expected to get</Label>
                  <Input
                    id="contacts-expected"
                    type="number"
                    min="0"
                    placeholder="e.g. 50"
                    value={contactsExpected}
                    onChange={(e) => setContactsExpected(e.target.value)}
                    disabled={readOnly}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="skills-learn">
                  What do you plan to learn this month? (skills &amp; office training)
                </Label>
                <Textarea
                  id="skills-learn"
                  value={skillsToLearn}
                  onChange={(e) => setSkillsToLearn(e.target.value)}
                  placeholder="e.g. Better gig research, faster replies, Photoshop basics, negotiation..."
                  rows={3}
                  disabled={readOnly}
                />
              </div>
            </CardContent>
          </Card>

          <MemberDailyEarningsPanel
            teamMemberId={teamMemberId}
            yearMonth={yearMonth}
            incomeGoal={parsedIncomeGoal}
            readOnly={readOnly}
          />

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-brand-green" />
                  Written Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="Other goals for this month (accounts to open, gigs to launch, etc.)"
                  rows={5}
                  disabled={readOnly}
                />
                {!readOnly && (
                  <div className="space-y-2">
                    <Label htmlFor="goals-image" className="flex items-center gap-1.5">
                      <Upload className="h-3.5 w-3.5" />
                      Upload goals picture (optional)
                    </Label>
                    <InputImage
                      id="goals-image"
                      onChange={setGoalsFile}
                      previewUrl={goalsFile ? URL.createObjectURL(goalsFile) : goalsImageUrl}
                    />
                  </div>
                )}
                {(readOnly || !goalsFile) && goalsImageUrl && (
                  <PlanImage src={goalsImageUrl} alt="Goals upload" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-brand-orange" />
                  Monthly Evaluation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={evaluation}
                  onChange={(e) => setEvaluation(e.target.value)}
                  placeholder="How did the month go? What worked, what to improve?"
                  rows={5}
                  disabled={readOnly}
                />
                {!readOnly && (
                  <div className="space-y-2">
                    <Label htmlFor="evaluation-image" className="flex items-center gap-1.5">
                      <Upload className="h-3.5 w-3.5" />
                      Upload evaluation picture (optional)
                    </Label>
                    <InputImage
                      id="evaluation-image"
                      onChange={setEvaluationFile}
                      previewUrl={
                        evaluationFile ? URL.createObjectURL(evaluationFile) : evaluationImageUrl
                      }
                    />
                  </div>
                )}
                {(readOnly || !evaluationFile) && evaluationImageUrl && (
                  <PlanImage src={evaluationImageUrl} alt="Evaluation upload" />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {!readOnly && !loading && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Monthly Plan"}
          </Button>
        </div>
      )}
    </div>
  );
}

function InputImage({
  id,
  onChange,
  previewUrl,
}: {
  id: string;
  onChange: (file: File | null) => void;
  previewUrl: string | null;
}) {
  return (
    <div className="space-y-3">
      <input
        id={id}
        type="file"
        accept="image/*"
        className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-green-light file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-green-dark hover:file:bg-brand-green/20"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {previewUrl && <PlanImage src={previewUrl} alt="Preview" />}
    </div>
  );
}

function PlanImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative rounded-xl border overflow-hidden bg-neutral-50 aspect-video max-h-56">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="w-full h-full object-contain" />
    </div>
  );
}
