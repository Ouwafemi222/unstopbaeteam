"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  formatFineMoney,
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
  const [reason, setReason] = useState("");
  const [defaultAmount, setDefaultAmount] = useState("");
  const [currency, setCurrency] = useState("NGN");
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

  const parsedDefault = useMemo(() => {
    if (!defaultAmount.trim()) return null;
    const n = parseFloat(defaultAmount);
    return Number.isNaN(n) || n < 0 ? null : n;
  }, [defaultAmount]);

  const preview: FineMatchResult[] = useMemo(() => {
    const lines = parseFineOnGroundLines(rawList, parsedDefault);
    return lines.map((line) => {
      const match = matchFineOnGroundName(line.inputName, members, accounts);
      return {
        ...match,
        amount: line.amount,
        rawLine: line.rawLine,
      };
    });
  }, [rawList, members, accounts, parsedDefault]);

  const matchedCount = preview.filter((p) => p.matched).length;
  const unmatchedCount = preview.length - matchedCount;
  const missingAmount = preview.some((p) => p.amount == null || p.amount <= 0);
  const totalAmount = preview.reduce((sum, p) => sum + (p.amount ?? 0), 0);

  async function handlePublish() {
    if (preview.length === 0) {
      toast.error("Add at least one name (and fine amount)");
      return;
    }
    if (missingAmount) {
      toast.error("Every person needs a fine amount — set Default amount, or put amount on each line");
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
          title: title.trim() || `Disciplinary fines — ${new Date().toLocaleDateString()}`,
          notes: reason.trim() || null,
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
        amount: p.amount ?? 0,
        currency,
        reason: reason.trim() || null,
        is_active: true,
      }));

      const { error: entriesError } = await supabase.from("fine_on_ground_entries").insert(rows);
      if (entriesError) throw new Error(entriesError.message);

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
          notifyUserIds.map((userId) => {
            const entry = preview.find(
              (p) => members.find((m) => m.id === p.candidate?.teamMemberId)?.user_id === userId
            );
            const money = formatFineMoney(entry?.amount ?? 0, currency);
            return {
              user_id: userId,
              title: "Disciplinary fine assigned",
              message: `You have a fine of ${money}. Open your dashboard for details.`,
              link: "/dashboard",
            };
          })
        );
      }

      setLastSummary(
        `Published ${preview.length} fine${preview.length === 1 ? "" : "s"} totaling ${formatFineMoney(totalAmount, currency)} — ${matchedCount} on member dashboards, ${unmatchedCount} unmatched.`
      );
      toast.success(
        `${matchedCount} member dashboard${matchedCount === 1 ? "" : "s"} will show the fine amount.`
      );
      setRawList("");
      setTitle("");
      setReason("");
      setDefaultAmount("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-amber-200/80 bg-gradient-to-r from-white to-amber-50/50">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-neutral-900">Disciplinary Fines</h2>
            <p className="text-sm text-neutral-500 mt-0.5 max-w-2xl">
              Enter people who owe a <strong>fine</strong> (money discipline). When the name matches an
              account owner, the <strong>amount</strong> pops up on <strong>their</strong> dashboard.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="fine-title">List title (optional)</Label>
                <Input
                  id="fine-title"
                  placeholder="e.g. Sept discipline fines"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fine-default-amount">Default amount *</Label>
                <Input
                  id="fine-default-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="50"
                  value={defaultAmount}
                  onChange={(e) => setDefaultAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fine-currency">Currency</Label>
                <Select
                  id="fine-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="NGN">NGN (₦ Naira)</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="fine-reason">Reason (optional)</Label>
                <Input
                  id="fine-reason"
                  placeholder="e.g. Late report / missed target"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fine-list">Names (one per line) — optional amount on the line</Label>
              <Textarea
                id="fine-list"
                rows={5}
                placeholder={"Mr Femi, 5000\nMr Samuel\n@username | 2500\nMiss Ope 10000"}
                value={rawList}
                onChange={(e) => setRawList(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-neutral-500">
                If a line has no amount, the <strong>Default amount</strong> above is used. Examples:{" "}
                <code className="bg-neutral-100 px-1 rounded">Mr Femi, 50</code> or just{" "}
                <code className="bg-neutral-100 px-1 rounded">Mr Femi</code>.
              </p>
            </div>

            {preview.length > 0 && (
              <div className="rounded-xl border border-amber-100 bg-white p-3 space-y-2">
                <p className="text-sm font-medium text-neutral-800">
                  Preview — {matchedCount} matched, {unmatchedCount} not found · Total{" "}
                  {formatFineMoney(totalAmount, currency)}
                </p>
                <ul className="max-h-48 overflow-y-auto space-y-1.5 text-xs">
                  {preview.map((p) => (
                    <li
                      key={p.inputName}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5"
                    >
                      <span className="font-medium text-neutral-900">
                        {p.inputName}{" "}
                        <span className="text-amber-800 font-semibold">
                          {p.amount != null && p.amount > 0
                            ? formatFineMoney(p.amount, currency)
                            : "(no amount)"}
                        </span>
                      </span>
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
              <Button
                onClick={handlePublish}
                disabled={saving || preview.length === 0 || missingAmount}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Publish fines to dashboards
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
