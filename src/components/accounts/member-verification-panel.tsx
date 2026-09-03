"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import {
  AccountVerificationCapture,
  uploadVerificationScreenshots,
} from "@/components/accounts/account-verification-capture";
import type { FiverrAccount } from "@/types/database";

interface MemberVerificationPanelProps {
  teamMemberId: string;
}

export function MemberVerificationPanel({ teamMemberId }: MemberVerificationPanelProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<FiverrAccount[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [code, setCode] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);

  const selected = accounts.find((a) => a.id === selectedId);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("fiverr_accounts")
      .select("*")
      .eq("team_member_id", teamMemberId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) toast.error(error.message);
    const list = (data as FiverrAccount[]) ?? [];
    setAccounts(list);
    setSelectedId((prev) => (prev && list.some((a) => a.id === prev) ? prev : list[0]?.id ?? ""));
    setLoading(false);
  }, [supabase, teamMemberId]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    setCode(selected?.verification_code ?? "");
    setPendingFiles([]);
    setRemovedPaths([]);
  }, [selectedId, selected?.verification_code]);

  async function handleSave() {
    if (!selected) {
      toast.error("Select an account first");
      return;
    }
    if (code && code.length !== 4) {
      toast.error("Verification code must be exactly 4 digits");
      return;
    }

    setSaving(true);
    try {
      const paths = await uploadVerificationScreenshots(
        supabase,
        teamMemberId,
        selected.id,
        pendingFiles,
        selected.verification_screenshot_paths ?? [],
        removedPaths
      );

      const { error } = await supabase
        .from("fiverr_accounts")
        .update({
          verification_code: code || null,
          verification_screenshot_paths: paths,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selected.id)
        .eq("team_member_id", teamMemberId);

      if (error) throw error;

      toast.success("Verification saved");
      setPendingFiles([]);
      setRemovedPaths([]);
      await loadAccounts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-brand-green/20 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand-green" />
          Account Verification
        </CardTitle>
        <p className="text-sm text-neutral-500 font-normal">
          Paste verification screenshots and enter the 4-digit code for each Fiverr account.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-brand-green" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center">
            <p className="text-sm text-neutral-600">Record a Fiverr account first, then add verification here.</p>
            <Link href="/my-accounts/new" className="inline-block mt-3">
              <Button size="sm">Add Fiverr Account</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="verification-account">Which account?</Label>
              <Select
                id="verification-account"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    @{a.username}
                    {a.verification_code ? ` · code ${a.verification_code}` : ""}
                  </option>
                ))}
              </Select>
            </div>

            {selected && (
              <AccountVerificationCapture
                key={selected.id}
                teamMemberId={teamMemberId}
                accountId={selected.id}
                initialCode={selected.verification_code}
                initialPaths={selected.verification_screenshot_paths ?? []}
                onCodeChange={setCode}
                onPendingFilesChange={setPendingFiles}
                onRemovedPathsChange={setRemovedPaths}
              />
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={saving || !selected}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save verification"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
