"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Target, ClipboardCheck, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  getMemberImageUrl,
  monthlyPlanImagePath,
  uploadMemberImage,
} from "@/lib/storage/member-uploads";
import type { MemberMonthlyPlan } from "@/types/database";

function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatYearMonth(ym: string) {
  const [y, m] = ym.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

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

    const record = (data as MemberMonthlyPlan | null) ?? null;
    setPlan(record);
    setGoals(record?.goals ?? "");
    setEvaluation(record?.evaluation ?? "");
    setGoalsFile(null);
    setEvaluationFile(null);
    await loadImageUrls(record);
    setLoading(false);
  }, [supabase, teamMemberId, yearMonth, loadImageUrls]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

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

      const saved = data as MemberMonthlyPlan;
      setPlan(saved);
      setGoalsFile(null);
      setEvaluationFile(null);
      await loadImageUrls(saved);
      toast.success("Monthly plan saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return ym;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <Target className="h-5 w-5 text-brand-green" />
            Monthly Goals &amp; Evaluation
          </h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            Set targets and review your month for {memberName}
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="plan-month">Month</Label>
          <select
            id="plan-month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
          >
            {monthOptions.map((ym) => (
              <option key={ym} value={ym}>
                {formatYearMonth(ym)}
              </option>
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
        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-brand-green" />
                Monthly Goals — {formatYearMonth(yearMonth)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="What do you want to achieve this month? (accounts opened, messages received, etc.)"
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
              {readOnly && goalsImageUrl && (
                <PlanImage src={goalsImageUrl} alt="Goals upload" />
              )}
              {!readOnly && !goalsFile && goalsImageUrl && (
                <PlanImage src={goalsImageUrl} alt="Saved goals upload" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-brand-orange" />
                Monthly Evaluation — {formatYearMonth(yearMonth)}
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
              {readOnly && evaluationImageUrl && (
                <PlanImage src={evaluationImageUrl} alt="Evaluation upload" />
              )}
              {!readOnly && !evaluationFile && evaluationImageUrl && (
                <PlanImage src={evaluationImageUrl} alt="Saved evaluation upload" />
              )}
            </CardContent>
          </Card>
        </div>
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
