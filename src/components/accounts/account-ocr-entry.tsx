"use client";

import { useState } from "react";
import { CheckCircle2, FileSearch, Loader2, PenLine, ScanLine, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ACCEPTED_OCR_TYPES, MAX_OCR_FILE_BYTES } from "@/lib/forecast/ocr-extract";
import type { ParsedAccountFromOcr } from "@/lib/forecast/account-ocr-parse";

export type AccountFillMode = "choose" | "ocr" | "manual";

interface AccountOcrEntryProps {
  fillMode: AccountFillMode;
  onFillModeChange: (mode: AccountFillMode) => void;
  onApplyOcr: (parsed: ParsedAccountFromOcr) => void;
  disabled?: boolean;
}

function formatExtractedValue(label: string, value: string | number | null | undefined) {
  if (value == null || value === "") return null;
  return { label, value: String(value) };
}

export function AccountOcrEntry({
  fillMode,
  onFillModeChange,
  onApplyOcr,
  disabled,
}: AccountOcrEntryProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [rawText, setRawText] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedAccountFromOcr | null>(null);

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
      toast.error("Upload your account sheet photo first");
      return;
    }
    setExtracting(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/accounts/ocr", { method: "POST", body: formData });
    const data = await res.json();
    setExtracting(false);

    if (!res.ok) {
      toast.error(
        data.error ??
          "OCR failed. Wait a minute and retry, or choose Enter manually.",
        { duration: 8000 }
      );
      return;
    }

    setRawText(data.rawText);
    setParsed(data.parsed);
    toast.success("Text extracted — review below, then apply to the form");
  }

  function handleApply() {
    if (!parsed) return;
    onApplyOcr(parsed);
    toast.success("Form filled — review every field, then save");
  }

  const extractedFields = parsed
    ? ([
        formatExtractedValue("Username", parsed.username ? `@${parsed.username}` : null),
        formatExtractedValue("Display name", parsed.display_name),
        formatExtractedValue("Email", parsed.email),
        formatExtractedValue("Phone", parsed.phone),
        formatExtractedValue("Country", parsed.country_name ?? parsed.country_code),
        formatExtractedValue("Opening date", parsed.opening_date),
        formatExtractedValue("Opening time", parsed.opening_time),
        formatExtractedValue("Secret question", parsed.secret_question),
        formatExtractedValue("Secret answer", parsed.secret_answer),
        formatExtractedValue("Code", parsed.verification_code),
        formatExtractedValue(
          "Rate",
          parsed.rate_amount != null
            ? `${parsed.rate_currency ?? ""} ${parsed.rate_amount}`.trim()
            : null
        ),
        formatExtractedValue("Supplied by", parsed.info_supplied_by),
      ].filter(Boolean) as { label: string; value: string }[])
    : [];

  if (disabled) return null;

  return (
    <section className="rounded-2xl border-2 border-brand-green/30 bg-gradient-to-br from-brand-green-light/20 to-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 md:px-6 border-b border-brand-green/10 bg-brand-green-light/30">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-green-dark">
          Step 0 — Fill the form faster
        </p>
        <p className="text-sm text-neutral-600 mt-1">
          Upload a photo of the account details you wrote — we read it and put each value in the
          correct field. Review before saving.
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
              Photo of handwritten or printed account details.
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
            <p className="text-xs text-neutral-500 mt-1">Type the account fields yourself.</p>
          </button>
        </div>

        {fillMode === "ocr" && (
          <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5 space-y-4">
            <p className="text-sm font-medium text-neutral-900">Upload account details photo</p>
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
                <img src={preview} alt="Account sheet" className="w-full h-full object-contain" />
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
                    Extract into fields
                  </>
                )}
              </Button>
              {parsed && (
                <Button type="button" onClick={handleApply}>
                  Apply to form (review first)
                </Button>
              )}
            </div>

            {parsed && extractedFields.length > 0 && (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-sm font-semibold text-neutral-900 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-green" />
                  Values we extracted
                </p>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {extractedFields.map((f) => (
                    <div key={f.label} className="rounded-lg bg-white border px-2 py-1.5">
                      <dt className="text-neutral-500">{f.label}</dt>
                      <dd className="font-semibold text-neutral-900 break-all">{f.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-[11px] text-neutral-400 mt-2">
                  Always double-check — handwriting OCR is not perfect.
                </p>
              </div>
            )}

            {parsed && extractedFields.length === 0 && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                No clear fields found. Try a clearer photo, or enter manually.
              </p>
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
