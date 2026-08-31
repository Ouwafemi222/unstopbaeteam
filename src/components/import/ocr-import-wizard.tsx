"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Upload,
  FileSearch,
  CheckCircle2,
  Save,
  Loader2,
  Trash2,
  Plus,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ACCEPTED_OCR_TYPES, MAX_OCR_FILE_BYTES } from "@/lib/forecast/ocr-extract";
import type { OcrSheetType, OcrSaveResult } from "@/lib/forecast/ocr-types";
import type { ForecastAccountRow } from "@/data/forecast-accounts";
import type { ForecastMessageRow } from "@/data/forecast-messages";

const STEPS = [
  { id: 1, label: "Sheet type", icon: Sparkles },
  { id: 2, label: "Upload", icon: Upload },
  { id: 3, label: "Extract", icon: FileSearch },
  { id: 4, label: "Review", icon: CheckCircle2 },
  { id: 5, label: "Save", icon: Save },
];

type Step = 1 | 2 | 3 | 4 | 5;

const emptyAccount = (): ForecastAccountRow => ({
  member: "",
  email: "",
  phone: "",
  country: "GB",
  opening_date: new Date().toISOString().slice(0, 10),
});

const emptyMessage = (): ForecastMessageRow => ({
  member: "",
  received_date: new Date().toISOString().slice(0, 10),
  service: "",
  count: 1,
});

export function OcrImportWizard() {
  const [step, setStep] = useState<Step>(1);
  const [sheetType, setSheetType] = useState<OcrSheetType>("accounts");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rawNotes, setRawNotes] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [accountRows, setAccountRows] = useState<ForecastAccountRow[]>([]);
  const [messageRows, setMessageRows] = useState<ForecastMessageRow[]>([]);
  const [saveResult, setSaveResult] = useState<OcrSaveResult | null>(null);

  const rowCount = sheetType === "accounts" ? accountRows.length : messageRows.length;

  const activeStep = useMemo(() => {
    if (saveResult) return 5;
    if (rowCount > 0) return 4;
    if (extracting) return 3;
    if (previewUrl) return 2;
    return step;
  }, [saveResult, rowCount, extracting, previewUrl, step]);

  const resetPreview = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
  }, [previewUrl]);

  function handleFile(selected: File | null) {
    if (!selected) return;
    if (!ACCEPTED_OCR_TYPES.includes(selected.type)) {
      toast.error("Use PNG, JPG, or WEBP images");
      return;
    }
    if (selected.size > MAX_OCR_FILE_BYTES) {
      toast.error("Image must be under 1MB (OCR.space free plan limit)");
      return;
    }
    resetPreview();
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setAccountRows([]);
    setMessageRows([]);
    setSaveResult(null);
    setRawNotes(null);
    setRawText(null);
    setStep(2);
  }

  async function handleExtract() {
    if (!file) {
      toast.error("Upload a sheet photo first");
      return;
    }
    setExtracting(true);
    setStep(3);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("sheetType", sheetType);

    const res = await fetch("/api/forecast/ocr", { method: "POST", body: formData });
    const data = await res.json();

    setExtracting(false);

    if (!res.ok) {
      toast.error(data.error ?? "Extraction failed");
      return;
    }

    if (sheetType === "accounts") {
      setAccountRows(data.rows ?? []);
    } else {
      setMessageRows(data.rows ?? []);
    }
    setRawNotes(data.rawNotes ?? null);
    setRawText(data.rawText ?? null);
    setStep(4);

    const count = (data.rows ?? []).length;
    if (count === 0) {
      toast.warning("No rows found — add rows manually or try a clearer photo");
    } else {
      toast.success(`Extracted ${count} rows — review and correct before saving`);
    }
  }

  async function handleSave() {
    const rows = sheetType === "accounts" ? accountRows : messageRows;
    if (rows.length === 0) {
      toast.error("Add at least one row to import");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/forecast/ocr/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheetType, rows }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      toast.error(data.error ?? "Save failed");
      return;
    }

    setSaveResult(data);
    setStep(5);
    toast.success("Sheet data saved to the database");
  }

  function updateAccount(index: number, field: keyof ForecastAccountRow, value: string) {
    setAccountRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function updateMessage(index: number, field: keyof ForecastMessageRow, value: string | number) {
    setMessageRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50/80 to-white shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600" />
          Screenshot OCR Import
        </CardTitle>
        <CardDescription>
          Photograph a handwritten sheet → OCR.space reads it → you review → save to team profiles.
          Uses your <code className="text-xs bg-neutral-100 px-1 rounded">OCR_SPACE_API_KEY</code> (Engine 3 for handwriting).
          Free plan: max 1MB per image.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Steps */}
        <div className="flex gap-1">
          {STEPS.map((s) => (
            <div key={s.id} className="flex-1 text-center">
              <div
                className={cn(
                  "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors",
                  activeStep >= s.id
                    ? "bg-violet-600 text-white"
                    : "bg-neutral-200 text-neutral-500"
                )}
              >
                <s.icon className="h-4 w-4" />
              </div>
              <p className="text-[10px] mt-1 text-neutral-500 hidden sm:block">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Step 1: Sheet type */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-neutral-700">1. What kind of sheet is this?</p>
          <div className="flex gap-2">
            {(["accounts", "messages"] as const).map((type) => (
              <Button
                key={type}
                type="button"
                variant={sheetType === type ? "default" : "outline"}
                className={sheetType === type ? "bg-violet-600 hover:bg-violet-700" : ""}
                onClick={() => {
                  setSheetType(type);
                  setAccountRows([]);
                  setMessageRows([]);
                  setSaveResult(null);
                  setStep(1);
                }}
              >
                {type === "accounts" ? "Fiverr Accounts" : "Team Messages"}
              </Button>
            ))}
          </div>
        </div>

        {/* Step 2: Upload */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-neutral-700">2. Upload sheet photo</p>
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
              previewUrl ? "border-violet-300 bg-violet-50/50" : "border-neutral-300 hover:border-violet-400 hover:bg-neutral-50"
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files[0] ?? null);
            }}
            onClick={() => document.getElementById("ocr-file-input")?.click()}
          >
            {previewUrl ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Sheet preview"
                  className="mx-auto max-h-64 rounded-lg border shadow-sm object-contain"
                />
                <p className="text-sm text-neutral-600">{file?.name}</p>
                <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); resetPreview(); }}>
                  Change image
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 text-neutral-400 mx-auto mb-3" />
                <p className="text-neutral-600">Drag & drop or click to upload</p>
                <p className="text-xs text-neutral-400 mt-1">PNG, JPG, WEBP — max 1MB (OCR.space free). Good lighting helps.</p>
              </>
            )}
            <input
              id="ocr-file-input"
              type="file"
              accept={ACCEPTED_OCR_TYPES.join(",")}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        {/* Step 3: Extract */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-neutral-700">3. Extract with AI vision</p>
          <Button
            type="button"
            onClick={handleExtract}
            disabled={!file || extracting}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {extracting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Reading sheet with OCR.space…
              </>
            ) : (
              <>
                <FileSearch className="h-4 w-4 mr-2" />
                Extract Data from Sheet
              </>
            )}
          </Button>
          {rawNotes && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              {rawNotes}
            </p>
          )}
          {rawText && (
            <details className="text-xs text-neutral-500">
              <summary className="cursor-pointer text-violet-600">View raw OCR text</summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-neutral-100 p-2">{rawText}</pre>
            </details>
          )}
        </div>

        {/* Step 4: Review */}
        {rowCount > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-700">4. Review & correct ({rowCount} rows)</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  sheetType === "accounts"
                    ? setAccountRows((r) => [...r, emptyAccount()])
                    : setMessageRows((r) => [...r, emptyMessage()])
                }
              >
                <Plus className="h-3 w-3 mr-1" /> Add row
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border bg-white max-h-96 overflow-y-auto">
              {sheetType === "accounts" ? (
                <table className="w-full text-xs">
                  <thead className="bg-neutral-50 sticky top-0">
                    <tr className="text-left text-neutral-500">
                      <th className="p-2">Member</th>
                      <th className="p-2">Email</th>
                      <th className="p-2">Phone</th>
                      <th className="p-2">Country</th>
                      <th className="p-2">Date</th>
                      <th className="p-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {accountRows.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-1"><Input className="h-8 text-xs" value={row.member} onChange={(e) => updateAccount(i, "member", e.target.value)} /></td>
                        <td className="p-1"><Input className="h-8 text-xs" value={row.email} onChange={(e) => updateAccount(i, "email", e.target.value)} /></td>
                        <td className="p-1"><Input className="h-8 text-xs" value={row.phone} onChange={(e) => updateAccount(i, "phone", e.target.value)} /></td>
                        <td className="p-1">
                          <Select className="h-8 text-xs" value={row.country} onChange={(e) => updateAccount(i, "country", e.target.value)}>
                            <option value="GB">GB</option>
                            <option value="US">US</option>
                            <option value="NG">NG</option>
                            <option value="DE">DE</option>
                          </Select>
                        </td>
                        <td className="p-1"><Input className="h-8 text-xs" type="date" value={row.opening_date} onChange={(e) => updateAccount(i, "opening_date", e.target.value)} /></td>
                        <td className="p-1">
                          <button type="button" className="text-red-400 hover:text-red-600" onClick={() => setAccountRows((r) => r.filter((_, j) => j !== i))}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-neutral-50 sticky top-0">
                    <tr className="text-left text-neutral-500">
                      <th className="p-2">Member</th>
                      <th className="p-2">Date</th>
                      <th className="p-2">Service / Gig</th>
                      <th className="p-2">Count</th>
                      <th className="p-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {messageRows.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-1"><Input className="h-8 text-xs" value={row.member} onChange={(e) => updateMessage(i, "member", e.target.value)} /></td>
                        <td className="p-1"><Input className="h-8 text-xs" type="date" value={row.received_date} onChange={(e) => updateMessage(i, "received_date", e.target.value)} /></td>
                        <td className="p-1"><Input className="h-8 text-xs" value={row.service} onChange={(e) => updateMessage(i, "service", e.target.value)} /></td>
                        <td className="p-1"><Input className="h-8 text-xs w-16" type="number" min={1} value={row.count ?? 1} onChange={(e) => updateMessage(i, "count", Number(e.target.value) || 1)} /></td>
                        <td className="p-1">
                          <button type="button" className="text-red-400 hover:text-red-600" onClick={() => setMessageRows((r) => r.filter((_, j) => j !== i))}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Save */}
        {rowCount > 0 && !saveResult && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-700">5. Save to database</p>
            <Button type="button" onClick={handleSave} disabled={saving} className="bg-brand-green hover:bg-brand-green-dark">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Import {rowCount} rows
            </Button>
          </div>
        )}

        {saveResult && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm space-y-1">
            <p className="font-medium text-green-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Import complete
            </p>
            {saveResult.sheetType === "accounts" ? (
              <>
                <p>{saveResult.accountsCreated} accounts created</p>
                {(saveResult.accountsSkipped ?? 0) > 0 && <p>{saveResult.accountsSkipped} duplicates skipped</p>}
              </>
            ) : (
              <>
                <p>{saveResult.messagesCreated} messages created</p>
                {(saveResult.messagesSkipped ?? 0) > 0 && <p>{saveResult.messagesSkipped} duplicates skipped</p>}
              </>
            )}
            <p>{saveResult.membersCreated} new team members · {saveResult.membersExisting} existing linked</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
