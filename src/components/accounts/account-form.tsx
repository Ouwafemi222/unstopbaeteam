"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, KeyRound, Loader2, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { CountrySelect } from "@/components/shared/country-select";
import { DateInput } from "@/components/shared/date-input";
import {
  AccountVerificationCapture,
  uploadVerificationScreenshots,
} from "@/components/accounts/account-verification-capture";
import {
  AccountOcrEntry,
  type AccountFillMode,
} from "@/components/accounts/account-ocr-entry";
import { toast } from "sonner";
import { publishLiveEvent } from "@/lib/live/publish-live-event";
import type { ParsedAccountFromOcr } from "@/lib/forecast/account-ocr-parse";
import type { TeamMember, Country, FiverrAccount } from "@/types/database";

interface AccountFormProps {
  mode: "create" | "edit";
  account?: FiverrAccount;
  /** When set, account is always owned by this member (self-service). */
  lockedTeamMemberId?: string;
  lockedTeamMemberName?: string;
  returnTo?: string;
}

interface FormValues {
  team_member_id: string;
  display_name: string;
  username: string;
  email: string;
  phone: string;
  country_id: string;
  status: string;
  opening_date: string;
  opening_time: string;
  rate_amount: string;
  rate_currency: string;
  info_supplied_by: string;
  notes: string;
  secret_question: string;
  secret_answer: string;
  phone_verified: string;
  email_verified: string;
  verification_notes: string;
}

function valuesFromAccount(account?: FiverrAccount, lockedTeamMemberId?: string): FormValues {
  return {
    team_member_id: lockedTeamMemberId ?? account?.team_member_id ?? "",
    display_name: account?.display_name ?? "",
    username: account?.username ?? "",
    email: account?.email ?? "",
    phone: account?.phone ?? "",
    country_id: account?.country_id ?? "",
    status: account?.status ?? "new",
    opening_date: account?.opening_date ?? "",
    opening_time: account?.opening_time?.slice(0, 5) ?? "",
    rate_amount: account?.rate_amount != null ? String(account.rate_amount) : "",
    rate_currency: account?.rate_currency ?? "USD",
    info_supplied_by: account?.info_supplied_by ?? "",
    notes: account?.notes ?? "",
    secret_question: account?.secret_question ?? "",
    secret_answer: account?.secret_answer ?? "",
    phone_verified: String(account?.phone_verified ?? false),
    email_verified: String(account?.email_verified ?? false),
    verification_notes: account?.verification_notes ?? "",
  };
}

export function AccountForm({
  mode,
  account,
  lockedTeamMemberId,
  lockedTeamMemberName,
  returnTo,
}: AccountFormProps) {
  const isSelfService = !!lockedTeamMemberId;
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState(account?.verification_code ?? "");
  const [pendingScreenshots, setPendingScreenshots] = useState<File[]>([]);
  const [removedScreenshotPaths, setRemovedScreenshotPaths] = useState<string[]>([]);
  const [fillMode, setFillMode] = useState<AccountFillMode>(mode === "create" ? "choose" : "manual");
  const [formValues, setFormValues] = useState<FormValues>(() =>
    valuesFromAccount(account, lockedTeamMemberId)
  );
  const [formKey, setFormKey] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [{ data: m }, { data: c }] = await Promise.all([
        isSelfService
          ? Promise.resolve({ data: null })
          : supabase.from("team_members").select("*").eq("status", "active").order("full_name"),
        supabase.from("countries").select("*").eq("is_active", true).order("name"),
      ]);
      if (m) setMembers(m ?? []);
      setCountries(c ?? []);
    }
    load();
  }, [supabase, isSelfService]);

  function applyOcr(parsed: ParsedAccountFromOcr) {
    let countryId = formValues.country_id;
    if (parsed.country_code || parsed.country_name) {
      const match = countries.find(
        (c) =>
          (parsed.country_code && c.code.toUpperCase() === parsed.country_code.toUpperCase()) ||
          (parsed.country_name && c.name.toLowerCase() === parsed.country_name.toLowerCase())
      );
      if (match) countryId = match.id;
    }

    setFormValues((prev) => ({
      ...prev,
      display_name: parsed.display_name ?? prev.display_name,
      username: parsed.username ?? prev.username,
      email: parsed.email ?? prev.email,
      phone: parsed.phone ?? prev.phone,
      country_id: countryId,
      opening_date: parsed.opening_date ?? prev.opening_date,
      opening_time: parsed.opening_time ?? prev.opening_time,
      secret_question: parsed.secret_question ?? prev.secret_question,
      secret_answer: parsed.secret_answer ?? prev.secret_answer,
      info_supplied_by: parsed.info_supplied_by ?? prev.info_supplied_by,
      notes: parsed.notes ?? prev.notes,
      rate_amount:
        parsed.rate_amount != null ? String(parsed.rate_amount) : prev.rate_amount,
      rate_currency: parsed.rate_currency ?? prev.rate_currency,
    }));
    if (parsed.verification_code) setVerificationCode(parsed.verification_code);
    setFormKey((k) => k + 1);
    setFillMode("manual");
  }

  function resolveCountryId(parsed: ParsedAccountFromOcr): string | null {
    if (parsed.country_code || parsed.country_name) {
      const match = countries.find(
        (c) =>
          (parsed.country_code && c.code.toUpperCase() === parsed.country_code.toUpperCase()) ||
          (parsed.country_name && c.name.toLowerCase() === parsed.country_name.toLowerCase())
      );
      if (match) return match.id;
    }
    return formValues.country_id || null;
  }

  async function saveManyFromOcr(accounts: ParsedAccountFromOcr[]) {
    if (mode !== "create") return;
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const teamMemberId = lockedTeamMemberId || formValues.team_member_id;
    if (!teamMemberId) {
      toast.error("Select a team member first (or open Add Account from your profile)");
      setLoading(false);
      return;
    }

    // Final safety: skip any that still match listed username/email/phone/code
    try {
      const checkRes = await fetch("/api/accounts/ocr/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts }),
      });
      const checkData = await checkRes.json();
      if (checkRes.ok && Array.isArray(checkData.accounts)) {
        const fresh = checkData.accounts as Array<
          ParsedAccountFromOcr & { duplicate?: { alreadyListed?: boolean; label?: string } }
        >;
        const blocked = fresh.filter((a) => a.duplicate?.alreadyListed);
        accounts = fresh.filter((a) => !a.duplicate?.alreadyListed);
        if (blocked.length > 0) {
          toast.message(
            `Skipped ${blocked.length} already listed (${blocked
              .map((b) => b.username || b.email || b.verification_code || "row")
              .slice(0, 3)
              .join(", ")}${blocked.length > 3 ? "…" : ""})`
          );
        }
      }
    } catch {
      // continue with client selection
    }

    if (accounts.length === 0) {
      toast.error("Nothing new to save — all selected accounts are already listed");
      setLoading(false);
      return;
    }

    const payloads = accounts.map((parsed) => {
      const username = (parsed.username ?? "").trim();
      return {
        team_member_id: teamMemberId,
        display_name: parsed.display_name,
        username,
        email: parsed.email,
        phone: parsed.phone,
        country_id: resolveCountryId(parsed),
        opening_date: parsed.opening_date,
        opening_time: parsed.opening_time,
        status: "new",
        rate_amount: parsed.rate_amount,
        rate_currency: parsed.rate_currency ?? "USD",
        secret_question: parsed.secret_question,
        secret_answer: parsed.secret_answer,
        info_supplied_by: parsed.info_supplied_by,
        notes: parsed.notes,
        verification_code: parsed.verification_code,
        verification_screenshot_paths: [] as string[],
        phone_verified: false,
        email_verified: false,
        created_by: user?.id,
        updated_by: user?.id,
      };
    });

    const { data, error } = await supabase.from("fiverr_accounts").insert(payloads).select("id, username");
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    for (const row of data ?? []) {
      try {
        await fetch("/api/accounts/created-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: row.id, username: row.username }),
        });
      } catch {
        // ignore
      }
      const actor =
        lockedTeamMemberName ??
        members.find((m) => m.id === teamMemberId)?.full_name ??
        "A member";
      publishLiveEvent({
        kind: "account",
        actorName: actor,
        summary: `added @${row.username}`,
        href: isSelfService ? "/my-accounts" : `/accounts/${row.id}`,
      });
    }

    toast.success(`Saved ${data?.length ?? payloads.length} new accounts from OCR`);
    setLoading(false);
    router.push(returnTo ?? (isSelfService ? "/my-accounts" : "/accounts"));
    router.refresh();
  }

  async function checkDuplicate(field: string, value: string) {
    if (!value || (mode === "edit" && account && account[field as keyof FiverrAccount] === value)) {
      setDuplicateWarning(null);
      return;
    }
    const { data } = await supabase
      .from("fiverr_accounts")
      .select("username, email, phone, verification_code")
      .eq(field, value)
      .is("archived_at", null)
      .limit(1);
    if (data && data.length > 0) {
      const hit = data[0];
      const label =
        field === "verification_code"
          ? `code ${hit.verification_code}`
          : hit.username || hit.email || hit.phone;
      setDuplicateWarning(`Already listed: ${label} already exists in the system`);
    } else {
      setDuplicateWarning(null);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();

    const teamMemberId = (isSelfService
      ? lockedTeamMemberId
      : (form.get("team_member_id") as string)) as string;

    const codeRaw = verificationCode.trim();
    if (codeRaw && codeRaw.length !== 4) {
      toast.error("Verification code must be exactly 4 digits");
      setLoading(false);
      return;
    }

    const payload = {
      team_member_id: teamMemberId,
      display_name: (form.get("display_name") as string) || null,
      username: form.get("username") as string,
      email: (form.get("email") as string) || null,
      phone: (form.get("phone") as string) || null,
      country_id: (form.get("country_id") as string) || null,
      opening_date: (form.get("opening_date") as string) || null,
      opening_time: (form.get("opening_time") as string) || null,
      status: (form.get("status") as string) || "new",
      rate_amount: form.get("rate_amount") ? parseFloat(form.get("rate_amount") as string) : null,
      rate_currency: (form.get("rate_currency") as string) || "USD",
      rate_notes: (form.get("rate_notes") as string) || null,
      phone_verified: form.get("phone_verified") === "true",
      email_verified: form.get("email_verified") === "true",
      verification_code: codeRaw || null,
      verification_notes: (form.get("verification_notes") as string) || null,
      secret_question: (form.get("secret_question") as string)?.trim() || null,
      secret_answer: (form.get("secret_answer") as string)?.trim() || null,
      info_supplied_by: (form.get("info_supplied_by") as string) || null,
      notes: (form.get("notes") as string) || null,
      updated_by: user?.id,
    };

    if (mode === "create") {
      const { data, error } = await supabase.from("fiverr_accounts").insert({
        ...payload,
        verification_screenshot_paths: [],
        created_by: user?.id,
      }).select().single();

      if (error) { toast.error(error.message); setLoading(false); return; }

      if (pendingScreenshots.length > 0) {
        const paths = await uploadVerificationScreenshots(
          supabase,
          teamMemberId,
          data.id,
          pendingScreenshots,
          [],
          []
        );
        await supabase
          .from("fiverr_accounts")
          .update({ verification_screenshot_paths: paths })
          .eq("id", data.id);
      }

      try {
        await fetch("/api/accounts/created-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: data.id, username: data.username }),
        });
      } catch {
        // Non-blocking — account already saved
      }

      const actor =
        lockedTeamMemberName ??
        members.find((m) => m.id === teamMemberId)?.full_name ??
        "A member";
      publishLiveEvent({
        kind: "account",
        actorName: actor,
        summary: `added @${data.username}`,
        href: isSelfService ? "/my-accounts" : `/accounts/${data.id}`,
      });

      toast.success("Account created — team stream updated");
      router.push(returnTo ?? `/accounts/${data.id}`);
    } else if (account) {
      let screenshotPaths = account.verification_screenshot_paths ?? [];
      if (pendingScreenshots.length > 0 || removedScreenshotPaths.length > 0) {
        screenshotPaths = await uploadVerificationScreenshots(
          supabase,
          teamMemberId,
          account.id,
          pendingScreenshots,
          account.verification_screenshot_paths ?? [],
          removedScreenshotPaths
        );
      }

      const { error } = await supabase.from("fiverr_accounts").update({
        ...payload,
        verification_screenshot_paths: screenshotPaths,
      }).eq("id", account.id);
      if (error) { toast.error(error.message); setLoading(false); return; }
      toast.success("Account updated");
      router.push(returnTo ?? `/accounts/${account.id}`);
    }
    setLoading(false);
  }

  const v = formValues;
  const showForm = fillMode === "manual" || mode === "edit" || formKey > 0;

  return (
    <div className="space-y-6">
      <AccountOcrEntry
        fillMode={fillMode}
        onFillModeChange={setFillMode}
        onApplyOcr={applyOcr}
        allowBulkSave={mode === "create"}
        onSaveMany={mode === "create" ? saveManyFromOcr : undefined}
      />

      {showForm && (
        <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
          {duplicateWarning && (
            <div className="form-section-enter rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {duplicateWarning}
            </div>
          )}

          <section className="form-section-enter form-section-enter-delay-1 rounded-2xl border border-neutral-200/80 bg-white/95 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b bg-gradient-to-r from-brand-green-light/40 to-transparent flex items-center gap-2">
              <UserRound className="h-4 w-4 text-brand-green" />
              <h2 className="text-sm font-semibold text-neutral-900">Account owner</h2>
            </div>
            <div className="p-5">
              {isSelfService ? (
                <div className="space-y-2">
                  <Label>Team Member</Label>
                  <p className="text-sm font-medium text-neutral-900 rounded-xl border border-brand-green/20 bg-brand-green-light/30 px-3.5 py-2.5">
                    {lockedTeamMemberName ?? "Your profile"}
                  </p>
                  <input type="hidden" name="team_member_id" value={lockedTeamMemberId} />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="team_member_id">Team Member *</Label>
                  <Select id="team_member_id" name="team_member_id" required defaultValue={v.team_member_id}>
                    <option value="">Select team member...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
          </section>

          <section className="form-section-enter form-section-enter-delay-2 rounded-2xl border border-neutral-200/80 bg-white/95 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b bg-gradient-to-r from-brand-orange-light/50 to-transparent flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-brand-orange-dark" />
              <h2 className="text-sm font-semibold text-neutral-900">Login &amp; opening details</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Fiverr Display Name</Label>
                  <Input id="display_name" name="display_name" defaultValue={v.display_name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Fiverr Username *</Label>
                  <Input
                    id="username"
                    name="username"
                    required
                    defaultValue={v.username}
                    onBlur={(e) => checkDuplicate("username", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Account Email / Gmail</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={v.email}
                    onBlur={(e) => checkDuplicate("email", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    defaultValue={v.phone}
                    onBlur={(e) => checkDuplicate("phone", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <CountrySelect countries={countries} defaultValue={v.country_id} />
                <div className="space-y-2">
                  <Label htmlFor="status">Account Status</Label>
                  <Select id="status" name="status" defaultValue={v.status}>
                    <option value="new">New</option>
                    <option value="active">Active</option>
                    <option value="pending_setup">Pending Setup</option>
                    <option value="verification_pending">Verification Pending</option>
                    <option value="verified">Verified</option>
                    <option value="restricted">Restricted</option>
                    <option value="suspended">Suspended</option>
                  </Select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <DateInput
                  id="opening_date"
                  name="opening_date"
                  label="Opening Date"
                  defaultToday={mode === "create" && !v.opening_date}
                  value={v.opening_date || undefined}
                  showQuickButtons
                />
                <div className="space-y-2">
                  <Label htmlFor="opening_time">Opening Time</Label>
                  <Input id="opening_time" name="opening_time" type="time" defaultValue={v.opening_time} />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rate_amount">Rate Amount</Label>
                  <Input
                    id="rate_amount"
                    name="rate_amount"
                    type="number"
                    step="0.01"
                    defaultValue={v.rate_amount}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate_currency">Currency</Label>
                  <Select id="rate_currency" name="rate_currency" defaultValue={v.rate_currency}>
                    <option value="USD">USD</option>
                    <option value="NGN">NGN</option>
                    <option value="GBP">GBP</option>
                    <option value="EUR">EUR</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="info_supplied_by">Info Supplied By</Label>
                  <Input id="info_supplied_by" name="info_supplied_by" defaultValue={v.info_supplied_by} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={2} defaultValue={v.notes} />
              </div>
            </div>
          </section>

          <section className="form-section-enter form-section-enter-delay-3 rounded-2xl border border-neutral-200/80 bg-white/95 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b bg-gradient-to-r from-emerald-50 to-transparent flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-emerald-700" />
              <h2 className="text-sm font-semibold text-neutral-900">Secret question &amp; answer</h2>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-neutral-500">
                Save the security question and answer used for this Fiverr account so you can recover it later.
              </p>
              <div className="space-y-2">
                <Label htmlFor="secret_question">Secret question</Label>
                <Input
                  id="secret_question"
                  name="secret_question"
                  placeholder="e.g. What is your mother's maiden name?"
                  defaultValue={v.secret_question}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secret_answer">Secret answer</Label>
                <Input
                  id="secret_answer"
                  name="secret_answer"
                  placeholder="The answer you used"
                  defaultValue={v.secret_answer}
                  autoComplete="off"
                />
              </div>
            </div>
          </section>

          <section className="form-section-enter form-section-enter-delay-3 rounded-2xl border border-neutral-200/80 bg-white/95 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b bg-gradient-to-r from-sky-50 to-transparent flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-sky-700" />
              <h2 className="text-sm font-semibold text-neutral-900">Verification</h2>
            </div>
            <div className="p-5 space-y-4">
              <AccountVerificationCapture
                teamMemberId={
                  isSelfService
                    ? lockedTeamMemberId!
                    : (account?.team_member_id ?? lockedTeamMemberId ?? "")
                }
                accountId={account?.id}
                initialCode={verificationCode || account?.verification_code}
                initialPaths={account?.verification_screenshot_paths ?? []}
                embeddedInForm
                onCodeChange={setVerificationCode}
                onPendingFilesChange={setPendingScreenshots}
                onRemovedPathsChange={setRemovedScreenshotPaths}
              />
              <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
                <div className="space-y-2">
                  <Label htmlFor="phone_verified">Phone Verified</Label>
                  <Select id="phone_verified" name="phone_verified" defaultValue={v.phone_verified}>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email_verified">Email Verified</Label>
                  <Select id="email_verified" name="email_verified" defaultValue={v.email_verified}>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="verification_notes">Verification Notes</Label>
                <Textarea
                  id="verification_notes"
                  name="verification_notes"
                  rows={2}
                  defaultValue={v.verification_notes}
                />
              </div>
            </div>
          </section>

          <div className="sticky bottom-3 z-10 rounded-2xl border border-neutral-200 bg-white/95 backdrop-blur px-4 py-3 shadow-lg flex flex-wrap gap-3 items-center justify-between">
            <p className="text-xs text-neutral-500 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-brand-green" />
              New accounts appear on the live team stream for everyone.
            </p>
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="min-w-[140px]">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === "create" ? (
                  "Save Account"
                ) : (
                  "Update Account"
                )}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
