"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Loader2,
  PenLine,
  ScanLine,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ACCEPTED_OCR_TYPES, MAX_OCR_FILE_BYTES } from "@/lib/forecast/ocr-extract";
import {
  MAX_ACCOUNTS_PER_OCR,
  type ParsedAccountFromOcr,
} from "@/lib/forecast/account-ocr-parse";
import type { OcrDuplicateMatch } from "@/lib/accounts/ocr-duplicates";

export type AccountFillMode = "choose" | "ocr" | "manual";

interface EditableAccount extends ParsedAccountFromOcr {
  selected: boolean;
  duplicate: OcrDuplicateMatch | null;
}

interface AccountOcrEntryProps {
  fillMode: AccountFillMode;
  onFillModeChange: (mode: AccountFillMode) => void;
  onApplyOcr: (parsed: ParsedAccountFromOcr) => void;
  onSaveMany?: (accounts: ParsedAccountFromOcr[]) => Promise<void> | void;
  allowBulkSave?: boolean;
  disabled?: boolean;
}

const emptyDuplicate = (): OcrDuplicateMatch => ({
  alreadyListed: false,
  matchedOn: [],
  existingAccountId: null,
  existingUsername: null,
  ownerName: null,
  label: null,
});

function emptyEditable(): EditableAccount {
  return {
    selected: true,
    duplicate: emptyDuplicate(),
    display_name: null,
    username: null,
    email: null,
    phone: null,
    country_code: null,
    country_name: null,
    opening_date: null,
    opening_time: null,
    secret_question: null,
    secret_answer: null,
    info_supplied_by: null,
    notes: null,
    verification_code: null,
    rate_amount: null,
    rate_currency: null,
  };
}

function toParsed(row: EditableAccount): ParsedAccountFromOcr {
  const { selected: _s, duplicate: _d, ...parsed } = row;
  return parsed;
}

export function AccountOcrEntry({
  fillMode,
  onFillModeChange,
  onApplyOcr,
  onSaveMany,
  allowBulkSave = false,
  disabled,
}: AccountOcrEntryProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [savingMany, setSavingMany] = useState(false);
  const [checkingDupes, setCheckingDupes] = useState(false);
  const [rawText, setRawText] = useState<string | null>(null);
  const [rows, setRows] = useState<EditableAccount[]>([]);
  const recheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pickFile(selected: File | null) {
    if (!selected) return;
    if (!ACCEPTED_OCR_TYPES.includes(selected.type)) {
      toast.error("Use PNG, JPG, or WEBP");
      return;
    }
    if (selected.size > MAX_OCR_FILE_BYTES) {
      toast.error("Image must be under 5MB");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setRawText(null);
    setRows([]);
  }

  async function recheckDuplicates(current: EditableAccount[]) {
    if (current.length === 0) return current;
    setCheckingDupes(true);
    try {
      const res = await fetch("/api/accounts/ocr/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts: current.map(toParsed) }),
      });
      const data = await res.json();
      if (!res.ok) return current;
      const matched = (data.accounts ?? []) as Array<
        ParsedAccountFromOcr & { duplicate: OcrDuplicateMatch }
      >;
      return current.map((row, i) => {
        const dup = matched[i]?.duplicate ?? emptyDuplicate();
        return {
          ...row,
          duplicate: dup,
          // Keep user selection if they forced it; otherwise auto-unselect duplicates
          selected: dup.alreadyListed ? false : row.selected,
        };
      });
    } catch {
      return current;
    } finally {
      setCheckingDupes(false);
    }
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
        data.error ?? "OCR failed. Wait a minute and retry, or choose Enter manually.",
        { duration: 8000 }
      );
      return;
    }

    setRawText(data.rawText);
    const accounts =
      (data.accounts as Array<ParsedAccountFromOcr & { duplicate?: OcrDuplicateMatch }>) ?? [];
    const next: EditableAccount[] = accounts.slice(0, MAX_ACCOUNTS_PER_OCR).map((a) => {
      const duplicate = a.duplicate ?? emptyDuplicate();
      return {
        ...a,
        duplicate,
        selected: !duplicate.alreadyListed,
      };
    });
    setRows(next.length > 0 ? next : [{ ...emptyEditable(), selected: true }]);

    const listed = Number(data.alreadyListedCount ?? next.filter((r) => r.duplicate?.alreadyListed).length);
    if (next.length > 1) {
      toast.success(
        listed > 0
          ? `Found ${next.length} accounts — ${listed} already listed (unchecked)`
          : `Found ${next.length} accounts — review, then save selected`
      );
    } else if (listed > 0) {
      toast.message("This account looks already listed — check the badge before saving");
    } else {
      toast.success("Text extracted — review below");
    }
  }

  function scheduleRecheck(nextRows: EditableAccount[]) {
    if (recheckTimer.current) clearTimeout(recheckTimer.current);
    recheckTimer.current = setTimeout(async () => {
      const refreshed = await recheckDuplicates(nextRows);
      setRows(refreshed);
    }, 600);
  }

  function updateRow(index: number, patch: Partial<EditableAccount>) {
    setRows((prev) => {
      const next = prev.map((row, i) => (i === index ? { ...row, ...patch } : row));
      const shouldRecheck =
        "username" in patch ||
        "email" in patch ||
        "phone" in patch ||
        "verification_code" in patch;
      if (shouldRecheck) scheduleRecheck(next);
      return next;
    });
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function addBlankRow() {
    if (rows.length >= MAX_ACCOUNTS_PER_OCR) {
      toast.error(`Maximum ${MAX_ACCOUNTS_PER_OCR} accounts per upload`);
      return;
    }
    setRows((prev) => [...prev, emptyEditable()]);
  }

  function handleApplyFirst() {
    const first = rows.find((r) => r.selected && !r.duplicate?.alreadyListed) ?? rows.find((r) => r.selected) ?? rows[0];
    if (!first) return;
    if (first.duplicate?.alreadyListed) {
      toast.error(first.duplicate.label ?? "This account is already listed");
      return;
    }
    onApplyOcr(toParsed(first));
    toast.success("First selected account applied to the form — review, then save");
  }

  async function handleSaveSelected() {
    if (!onSaveMany) return;
    const selected = rows
      .filter((r) => r.selected && !r.duplicate?.alreadyListed)
      .map(toParsed)
      .filter((r) => Boolean(r.username?.trim() || r.email?.trim()));

    const blocked = rows.filter((r) => r.selected && r.duplicate?.alreadyListed).length;
    if (blocked > 0) {
      toast.message(`${blocked} already-listed account${blocked === 1 ? "" : "s"} skipped`);
    }

    if (selected.length === 0) {
      toast.error("No new accounts to save — selected rows are already listed or empty");
      return;
    }
    if (selected.length > MAX_ACCOUNTS_PER_OCR) {
      toast.error(`You can save at most ${MAX_ACCOUNTS_PER_OCR} accounts at once`);
      return;
    }

    const missingUsername = selected.filter((r) => !r.username?.trim());
    if (missingUsername.length > 0) {
      toast.error("Every selected account needs a Fiverr username — fill any blanks first");
      return;
    }

    setSavingMany(true);
    try {
      await onSaveMany(selected);
    } finally {
      setSavingMany(false);
    }
  }

  useEffect(() => {
    return () => {
      if (recheckTimer.current) clearTimeout(recheckTimer.current);
    };
  }, []);

  const selectedCount = rows.filter((r) => r.selected && !r.duplicate?.alreadyListed).length;
  const listedCount = rows.filter((r) => r.duplicate?.alreadyListed).length;

  if (disabled) return null;

  return (
    <section className="rounded-2xl border-2 border-brand-green/30 bg-gradient-to-br from-brand-green-light/20 to-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 md:px-6 border-b border-brand-green/10 bg-brand-green-light/30">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-green-dark">
          Step 0 — Fill faster with OCR
        </p>
        <p className="text-sm text-neutral-600 mt-1">
          Upload a page with many accounts (up to {MAX_ACCOUNTS_PER_OCR}). We extract them and flag
          any username, email, phone, or verification code that is already listed.
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
              Photo of 1–{MAX_ACCOUNTS_PER_OCR} accounts — duplicates are detected automatically.
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
            <p className="text-xs text-neutral-500 mt-1">Type one account at a time.</p>
          </button>
        </div>

        {fillMode === "ocr" && (
          <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5 space-y-4">
            <p className="text-sm font-medium text-neutral-900">Upload account sheet photo</p>
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50/80 px-4 py-8 cursor-pointer hover:border-brand-green/40 transition-colors">
              <Upload className="h-8 w-8 text-neutral-400" />
              <span className="text-sm text-neutral-600">Tap to upload photo (max 5MB)</span>
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
                    Extract accounts
                  </>
                )}
              </Button>
              {checkingDupes && (
                <span className="text-xs text-neutral-500 self-center flex items-center gap-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Checking already listed…
                </span>
              )}
            </div>

            {rows.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-neutral-900 flex items-center gap-2 flex-wrap">
                    <CheckCircle2 className="h-4 w-4 text-brand-green" />
                    {rows.length} account{rows.length === 1 ? "" : "s"} extracted
                    <span className="font-normal text-neutral-500">
                      ({selectedCount} new selected
                      {listedCount > 0 ? ` · ${listedCount} already listed` : ""} · max{" "}
                      {MAX_ACCOUNTS_PER_OCR})
                    </span>
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={addBlankRow}>
                    Add blank row
                  </Button>
                </div>

                {listedCount > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Orange rows are already in the system (matched by username, email, phone, or
                      verification code). They stay unchecked so you do not save duplicates.
                    </span>
                  </div>
                )}

                <div className="overflow-x-auto rounded-xl border border-neutral-200">
                  <table className="w-full text-xs min-w-[760px]">
                    <thead className="bg-neutral-50 text-neutral-500">
                      <tr>
                        <th className="p-2 text-left w-10">Save</th>
                        <th className="p-2 text-left">Username *</th>
                        <th className="p-2 text-left">Email</th>
                        <th className="p-2 text-left">Phone</th>
                        <th className="p-2 text-left">Code</th>
                        <th className="p-2 text-left">Status</th>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => {
                        const listed = Boolean(row.duplicate?.alreadyListed);
                        return (
                          <tr
                            key={i}
                            className={cn(
                              "border-t border-neutral-100",
                              listed && "bg-amber-50/70"
                            )}
                          >
                            <td className="p-2">
                              <input
                                type="checkbox"
                                checked={row.selected}
                                disabled={listed}
                                onChange={(e) => updateRow(i, { selected: e.target.checked })}
                                aria-label={`Select account ${i + 1}`}
                              />
                            </td>
                            <td className="p-1">
                              <Input
                                className="h-8 text-xs"
                                value={row.username ?? ""}
                                onChange={(e) =>
                                  updateRow(i, { username: e.target.value || null })
                                }
                                placeholder="username"
                              />
                            </td>
                            <td className="p-1">
                              <Input
                                className="h-8 text-xs"
                                value={row.email ?? ""}
                                onChange={(e) => updateRow(i, { email: e.target.value || null })}
                                placeholder="email"
                              />
                            </td>
                            <td className="p-1">
                              <Input
                                className="h-8 text-xs"
                                value={row.phone ?? ""}
                                onChange={(e) => updateRow(i, { phone: e.target.value || null })}
                                placeholder="phone"
                              />
                            </td>
                            <td className="p-1">
                              <Input
                                className="h-8 text-xs font-mono tracking-wider"
                                value={row.verification_code ?? ""}
                                onChange={(e) =>
                                  updateRow(i, {
                                    verification_code: e.target.value.replace(/\D/g, "").slice(0, 4) || null,
                                  })
                                }
                                placeholder="1234"
                                maxLength={4}
                              />
                            </td>
                            <td className="p-2 max-w-[12rem]">
                              {listed ? (
                                <span className="inline-flex items-start gap-1 rounded-md bg-amber-100 text-amber-900 px-2 py-1 text-[10px] font-semibold leading-snug">
                                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                                  {row.duplicate?.label ?? "Already listed"}
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                                  New
                                </span>
                              )}
                            </td>
                            <td className="p-1">
                              <Input
                                className="h-8 text-xs"
                                type="date"
                                value={row.opening_date ?? ""}
                                onChange={(e) =>
                                  updateRow(i, { opening_date: e.target.value || null })
                                }
                              />
                            </td>
                            <td className="p-1">
                              <button
                                type="button"
                                className="p-1.5 text-neutral-400 hover:text-red-600"
                                onClick={() => removeRow(i)}
                                aria-label="Remove row"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <p className="text-[11px] text-neutral-400">
                  Always double-check OCR. Editing username/email/phone/code re-checks for already
                  listed accounts.
                </p>

                <div className="flex flex-wrap gap-3">
                  {allowBulkSave && onSaveMany && (
                    <Button
                      type="button"
                      onClick={handleSaveSelected}
                      disabled={savingMany || selectedCount === 0}
                    >
                      {savingMany ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        `Save ${selectedCount} new account${selectedCount === 1 ? "" : "s"}`
                      )}
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={handleApplyFirst}>
                    Apply first new account to form
                  </Button>
                </div>
              </div>
            )}

            {rows.length === 0 && rawText && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                No clear accounts found. Try a clearer photo, or enter manually.
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
