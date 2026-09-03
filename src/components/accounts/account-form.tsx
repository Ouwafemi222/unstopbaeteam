"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CountrySelect } from "@/components/shared/country-select";
import { DateInput } from "@/components/shared/date-input";
import {
  AccountVerificationCapture,
  uploadVerificationScreenshots,
} from "@/components/accounts/account-verification-capture";
import { toast } from "sonner";
import type { TeamMember, Country, FiverrAccount } from "@/types/database";

interface AccountFormProps {
  mode: "create" | "edit";
  account?: FiverrAccount;
  /** When set, account is always owned by this member (self-service). */
  lockedTeamMemberId?: string;
  lockedTeamMemberName?: string;
  returnTo?: string;
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

  async function checkDuplicate(field: string, value: string) {
    if (!value || (mode === "edit" && account && account[field as keyof FiverrAccount] === value)) {
      setDuplicateWarning(null);
      return;
    }
    const { data } = await supabase.from("fiverr_accounts").select("username, email").eq(field, value).limit(1);
    if (data && data.length > 0) {
      setDuplicateWarning(`Possible duplicate: ${data[0].username || data[0].email} already exists`);
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

      toast.success("Account created");
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

  const a = account;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {duplicateWarning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">{duplicateWarning}</div>
      )}

      <Card>
        <CardHeader><CardTitle>Account Owner</CardTitle></CardHeader>
        <CardContent>
          {isSelfService ? (
            <div className="space-y-2">
              <Label>Team Member</Label>
              <p className="text-sm font-medium text-neutral-900 rounded-lg border bg-neutral-50 px-3 py-2.5">
                {lockedTeamMemberName ?? "Your profile"}
              </p>
              <input type="hidden" name="team_member_id" value={lockedTeamMemberId} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="team_member_id">Team Member *</Label>
              <Select id="team_member_id" name="team_member_id" required defaultValue={a?.team_member_id ?? ""}>
                <option value="">Select team member...</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Account Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Fiverr Display Name</Label>
              <Input id="display_name" name="display_name" defaultValue={a?.display_name ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Fiverr Username *</Label>
              <Input id="username" name="username" required defaultValue={a?.username ?? ""} onBlur={(e) => checkDuplicate("username", e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Account Email / Gmail</Label>
              <Input id="email" name="email" type="email" defaultValue={a?.email ?? ""} onBlur={(e) => checkDuplicate("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" name="phone" defaultValue={a?.phone ?? ""} onBlur={(e) => checkDuplicate("phone", e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <CountrySelect countries={countries} defaultValue={a?.country_id ?? ""} />
            <div className="space-y-2">
              <Label htmlFor="status">Account Status</Label>
              <Select id="status" name="status" defaultValue={a?.status ?? "new"}>
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
            <DateInput id="opening_date" name="opening_date" label="Opening Date" defaultToday={mode === "create"} value={a?.opening_date ?? undefined} showQuickButtons />
            <div className="space-y-2">
              <Label htmlFor="opening_time">Opening Time</Label>
              <Input id="opening_time" name="opening_time" type="time" defaultValue={a?.opening_time?.slice(0, 5) ?? ""} />
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate_amount">Rate Amount</Label>
              <Input id="rate_amount" name="rate_amount" type="number" step="0.01" defaultValue={a?.rate_amount ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate_currency">Currency</Label>
              <Select id="rate_currency" name="rate_currency" defaultValue={a?.rate_currency ?? "USD"}>
                <option value="USD">USD</option>
                <option value="NGN">NGN</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="info_supplied_by">Info Supplied By</Label>
              <Input id="info_supplied_by" name="info_supplied_by" defaultValue={a?.info_supplied_by ?? ""} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={a?.notes ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Secret Question &amp; Answer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-neutral-500">
            Save the security question and answer used for this Fiverr account so you can recover it later.
          </p>
          <div className="space-y-2">
            <Label htmlFor="secret_question">Secret question</Label>
            <Input
              id="secret_question"
              name="secret_question"
              placeholder="e.g. What is your mother's maiden name?"
              defaultValue={a?.secret_question ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secret_answer">Secret answer</Label>
            <Input
              id="secret_answer"
              name="secret_answer"
              placeholder="The answer you used"
              defaultValue={a?.secret_answer ?? ""}
              autoComplete="off"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Verification Status</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <AccountVerificationCapture
            teamMemberId={
              isSelfService
                ? lockedTeamMemberId!
                : (account?.team_member_id ?? lockedTeamMemberId ?? "")
            }
            accountId={account?.id}
            initialCode={account?.verification_code}
            initialPaths={account?.verification_screenshot_paths ?? []}
            embeddedInForm
            onCodeChange={setVerificationCode}
            onPendingFilesChange={setPendingScreenshots}
            onRemovedPathsChange={setRemovedScreenshotPaths}
          />
          <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
            <div className="space-y-2">
              <Label htmlFor="phone_verified">Phone Verified</Label>
              <Select id="phone_verified" name="phone_verified" defaultValue={String(a?.phone_verified ?? false)}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email_verified">Email Verified</Label>
              <Select id="email_verified" name="email_verified" defaultValue={String(a?.email_verified ?? false)}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="verification_notes">Verification Notes</Label>
            <Textarea id="verification_notes" name="verification_notes" rows={2} defaultValue={a?.verification_notes ?? ""} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "create" ? "Save Account" : "Update Account"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
