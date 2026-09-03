"use client";

import { useState } from "react";
import { CheckCircle2, FileSearch, Loader2, PenLine, ScanLine, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ACCEPTED_OCR_TYPES, MAX_OCR_FILE_BYTES } from "@/lib/forecast/ocr-extract";
import type { ParsedGoalsFromOcr } from "@/lib/forecast/goals-ocr-parse";

export type GoalsFillMode = "choose" | "ocr" | "manual";

interface MemberGoalsOcrEntryProps {
  fillMode: GoalsFillMode;
  onFillModeChange: (mode: GoalsFillMode) => void;
  onApplyOcr: (parsed: ParsedGoalsFromOcr, imageFile: File) => void;
  disabled?: boolean;
}

function formatExtractedValue(label: string, value: string | number | null | undefined) {
  if (value == null || value === "") return null;
  return { label, value: String(value) };
}

export function MemberGoalsOcrEntry({
  fillMode,
  onFillModeChange,
  onApplyOcr,
  disabled,
}: MemberGoalsOcrEntryProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [rawText, setRawText] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedGoalsFromOcr | null>(null);

  function pickFile(selected: File | null) {
    if (!selected) return;
    if (!ACCEPTED_OCR_TYPES.includes(selected.type)) {
      toast.error("Use PNG, JPG, or WEBP");
      return;
    }
    if (selected.size > MAX_OCR_FILE_BYTES) {
      toast.error("Image must be under 1MB");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setRawText(null);
    setParsed(null);
  }

  async function handleExtract() {
    if (!file) {
      toast.error("Upload your goals sheet photo first");
      return;
    }
    setExtracting(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/member-monthly-plan/ocr", { method: "POST", body: formData });
    const data = await res.json();
    setExtracting(false);

    if (!res.ok) {
      toast.error(
        data.error ??
          "OCR failed. OCR.space may be busy — wait a minute and retry, or choose Enter manually.",
        { duration: 8000 }
      );
      return;
    }

    setRawText(data.rawText);
    setParsed(data.parsed);
    toast.success("Text extracted — review the sections below, then apply to the form");
  }

  function handleApply() {
    if (!parsed || !file) return;
    onApplyOcr(parsed, file);
    toast.success("Form filled — review every section, then save to lock your goals");
  }

  const extractedFields = parsed
    ? [
        formatExtractedValue("Monthly income", parsed.income_goal != null ? `$${parsed.income_goal}` : null),
        formatExtractedValue("Weekly income", parsed.weekly_income_goal != null ? `$${parsed.weekly_income_goal}` : null),
        formatExtractedValue("Accounts daily", parsed.accounts_daily_target),
        formatExtractedValue("Prospects", parsed.prospects_target),
        formatExtractedValue("Office prospects", parsed.office_prospects_expected),
        formatExtractedValue("Contacts", parsed.contacts_expected),
        formatExtractedValue("Personal PV", parsed.personal_pv_target != null ? `${parsed.personal_pv_target} PV` : null),
        formatExtractedValue("Group PV (GPV)", parsed.group_pv_target != null ? `${parsed.group_pv_target} GPV` : null),
      ].filter(Boolean) as { label: string; value: string }[]
    : [];

  if (disabled) return null;

  return (
    <section className="rounded-2xl border-2 border-brand-green/30 bg-gradient-to-br from-brand-green-light/20 to-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 md:px-6 border-b border-brand-green/10 bg-brand-green-light/30">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-green-dark">
          Step 0 — How do you want to enter your goals?
        </p>
        <p className="text-sm text-neutral-600 mt-1">
          Scan your handwritten sheet — we read the text, then sort it into sections (Fiverr, NeoLife PV,
          evaluation). Review before applying. Nothing saves until you press Save at the bottom.
        </p>
      </div>

      <div className="p-5 md:p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onFillModeChange("ocr")}
            className={cn(
              "rounded-xl border-2 p-4 text-left transition-all",
              fillMode === "ocr"
                ? "border-brand-green bg-brand-green-light/40 shadow-sm"
                : "border-neutral-200 hover:border-brand-green/40 bg-white"
            )}
          >
            <ScanLine className="h-6 w-6 text-brand-green mb-2" />
            <p className="font-semibold text-neutral-900">Scan with OCR</p>
            <p className="text-xs text-neutral-500 mt-1">
              Upload a photo — we extract text and map it to the right goal sections.
            </p>
          </button>
          <button
            type="button"
            onClick={() => onFillModeChange("manual")}
            className={cn(
              "rounded-xl border-2 p-4 text-left transition-all",
              fillMode === "manual"
                ? "border-brand-green bg-brand-green-light/40 shadow-sm"
                : "border-neutral-200 hover:border-brand-green/40 bg-white"
            )}
          >
            <PenLine className="h-6 w-6 text-brand-green mb-2" />
            <p className="font-semibold text-neutral-900">Enter manually</p>
            <p className="text-xs text-neutral-500 mt-1">
              Fill in Personal targets, NeoLife PV, and written goals yourself.
            </p>
          </button>
        </div>

        {fillMode === "ocr" && (
          <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5 space-y-4">
            <p className="text-sm font-medium text-neutral-900">Upload your goals sheet</p>
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50/80 px-4 py-8 cursor-pointer hover:border-brand-green/40 transition-colors">
              <Upload className="h-8 w-8 text-neutral-400" />
              <span className="text-sm text-neutral-600">Tap to upload photo (max 1MB)</span>
              <input
                type="file"
                accept={ACCEPTED_OCR_TYPES.join(",")}
                className="sr-only"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </label>

            {preview && (
              <div className="rounded-xl border overflow-hidden max-h-48 bg-neutral-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Goals sheet" className="w-full h-full object-contain" />
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleExtract}
                disabled={!file || extracting}
              >
                {extracting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <FileSearch className="h-4 w-4" />
                    Extract &amp; sort into sections
                  </>
                )}
              </Button>
              {parsed && (
                <Button type="button" onClick={handleApply}>
                  Apply to form (review first)
                </Button>
              )}
            </div>

            {parsed && parsed.sections.length > 0 && (
              <div className="rounded-xl border border-brand-green/20 bg-brand-green-light/10 p-4 space-y-3">
                <p className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-green" />
                  Sections detected on your sheet
                </p>
                <ul className="space-y-2">
                  {parsed.sections.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-lg border border-white/80 bg-white/90 px-3 py-2 text-xs"
                    >
                      <p className="font-medium text-neutral-900">{s.title}</p>
                      <p className="text-brand-green-dark mt-0.5">→ {s.mapsTo}</p>
                      {s.excerpt && (
                        <p className="text-neutral-500 mt-1 whitespace-pre-wrap font-mono">{s.excerpt}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {parsed && extractedFields.length > 0 && (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-sm font-semibold text-neutral-900 mb-2">Values we extracted</p>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {extractedFields.map((f) => (
                    <div key={f.label} className="rounded-lg bg-white border px-2 py-1.5">
                      <dt className="text-neutral-500">{f.label}</dt>
                      <dd className="font-semibold text-neutral-900">{f.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-[11px] text-neutral-400 mt-2">
                  Always double-check — handwriting OCR is not perfect. Team diagrams must be typed manually.
                </p>
              </div>
            )}

            {rawText && (
              <details className="rounded-lg border bg-neutral-50">
                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-neutral-600">
                  Raw OCR text (full)
                </summary>
                <div className="px-3 pb-3 text-xs text-neutral-600 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono border-t">
                  {rawText}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
