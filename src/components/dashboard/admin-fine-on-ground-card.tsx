"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  matchFineOnGroundName,
  parseFineOnGroundLines,
  type FineMatchResult,
} from "@/lib/members/fine-on-ground";

interface MemberRow {
  id: string;
  full_name: string;
  preferred_name: string | null;
  user_id: string | null;
}

interface AccountRow {
  id: string;
  team_member_id: string;
  username: string;
  display_name: string | null;
}

export function AdminFineOnGroundCard() {
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [rawList, setRawList] = useState("");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSummary, setLastSummary] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: m }, { data: a }] = await Promise.all([
        supabase
          .from("team_members")
          .select("id, full_name, preferred_name, user_id")
          .eq("status", "active")
          .order("full_name"),
        supabase
          .from("fiverr_accounts")
          .select("id, team_member_id, username, display_name")
          .is("archived_at", null),
      ]);
      setMembers((m as MemberRow[]) ?? []);
      setAccounts((a as AccountRow[]) ?? []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const preview: FineMatchResult[] = useMemo(() => {
    const lines = parseFineOnGroundLines(rawList);
    return lines.map((line) => matchFineOnGroundName(line, members, accounts));
  }, [rawList, members, accounts]);

  const matchedCount = preview.filter((p) => p.matched).length;
  const unmatchedCount = preview.length - matchedCount;

  async function handlePublish() {
    if (preview.length === 0) {
      toast.error("Paste at least one name or Fiverr username");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: batch, error: batchError } = await supabase
        .from("fine_on_ground_batches")
        .insert({
          title: title.trim() || `Fine on ground — ${new Date().toLocaleDateString()}`,
          notes: notes.trim() || null,
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();

      if (batchError || !batch) throw new Error(batchError?.message ?? "Failed to create batch");

      const rows = preview.map((p) => ({
        batch_id: batch.id,
        input_name: p.inputName,
        team_member_id: p.candidate?.teamMemberId ?? null,
        fiverr_account_id: p.candidate?.accountId ?? null,
        match_label: p.candidate?.matchLabel ?? null,
        is_active: true,
      }));

      const { error: entriesError } = await supabase.from("fine_on_ground_entries").insert(rows);
      if (entriesError) throw new Error(entriesError.message);

      // Notify linked login users so it also shows in the bell if present
      const notifyUserIds = [
        ...new Set(
          preview
            .filter((p) => p.matched)
            .map((p) => members.find((m) => m.id === p.candidate?.teamMemberId)?.user_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      if (notifyUserIds.length > 0) {
        await supabase.from("user_notifications").insert(
          notifyUserIds.map((userId) => ({
            user_id: userId,
            title: "You're fine on ground",
            message:
              "Admin confirmed you are fine on ground. Open your dashboard to see the clearance notice.",
            link: "/dashboard",
          }))
        );
      }

      setLastSummary(
        `Published ${preview.length} names — ${matchedCount} matched to owners, ${unmatchedCount} unmatched.`
      );
      toast.success(
        `Saved. ${matchedCount} member dashboard${matchedCount === 1 ? "" : "s"} will show “fine on ground”.`
      );
      setRawList("");
      setTitle("");
      setNotes("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-emerald-200/80 bg-gradient-to-r from-white to-emerald-50/60">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-neutral-900">Fine on Ground</h2>
            <p className="text-sm text-neutral-500 mt-0.5 max-w-2xl">
              Paste names or Fiverr usernames of people who are fine. When a name matches an account
              owner, it pops up on <strong>their</strong> dashboard so they know they are fine on ground.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fine-title">List title (optional)</Label>
                <Input
                  id="fine-title"
                  placeholder="e.g. September 2 clearance"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fine-notes">Notes (optional)</Label>
                <Input
                  id="fine-notes"
                  placeholder="Short note for your records"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fine-list">Names / usernames (one per line)</Label>
              <Textarea
                id="fine-list"
                rows={5}
                placeholder={"Mr Femi\nMr Samuel\n@someusername\nMiss Ope"}
                value={rawList}
                onChange={(e) => setRawList(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            {preview.length > 0 && (
              <div className="rounded-xl border border-emerald-100 bg-white p-3 space-y-2">
                <p className="text-sm font-medium text-neutral-800">
                  Preview — {matchedCount} matched, {unmatchedCount} not found
                </p>
                <ul className="max-h-40 overflow-y-auto space-y-1.5 text-xs">
                  {preview.map((p) => (
                    <li
                      key={p.inputName}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5"
                    >
                      <span className="font-medium text-neutral-900">{p.inputName}</span>
                      {p.matched ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {p.candidate?.matchLabel}
                        </span>
                      ) : (
                        <span className="text-amber-700">No matching owner — still saved for records</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handlePublish} disabled={saving || preview.length === 0}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Publish to member dashboards
                  </>
                )}
              </Button>
              {lastSummary && <p className="text-xs text-neutral-500">{lastSummary}</p>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
