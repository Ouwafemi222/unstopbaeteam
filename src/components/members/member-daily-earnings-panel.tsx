"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DollarSign, Loader2, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { MemberDailyEarning } from "@/types/database";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function monthBounds(yearMonth: string) {
  const [y, m] = yearMonth.split("-").map(Number);
  const from = `${yearMonth}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

interface MemberDailyEarningsPanelProps {
  teamMemberId: string;
  yearMonth: string;
  incomeGoal?: number | null;
  readOnly?: boolean;
}

export function MemberDailyEarningsPanel({
  teamMemberId,
  yearMonth,
  incomeGoal,
  readOnly,
}: MemberDailyEarningsPanelProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<MemberDailyEarning[]>([]);
  const [date, setDate] = useState(todayIso());
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const { from, to } = monthBounds(yearMonth);
    const { data, error } = await supabase
      .from("member_daily_earnings")
      .select("*")
      .eq("team_member_id", teamMemberId)
      .gte("earned_date", from)
      .lte("earned_date", to)
      .order("earned_date", { ascending: false });

    if (error) toast.error(error.message);
    setEntries((data as MemberDailyEarning[]) ?? []);
    setLoading(false);
  }, [supabase, teamMemberId, yearMonth]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const monthTotal = useMemo(
    () => entries.reduce((sum, e) => sum + Number(e.amount), 0),
    [entries]
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    const parsed = parseFloat(amount);
    if (!date || Number.isNaN(parsed) || parsed < 0) {
      toast.error("Enter a valid date and amount");
      return;
    }

    setSaving(true);
    const payload = {
      team_member_id: teamMemberId,
      earned_date: date,
      amount: parsed,
      currency: "USD",
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("member_daily_earnings").upsert(payload, {
      onConflict: "team_member_id,earned_date",
    });

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    toast.success("Daily earnings saved");
    setAmount("");
    setNotes("");
    setDate(todayIso());
    await loadEntries();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (readOnly) return;
    const { error } = await supabase.from("member_daily_earnings").delete().eq("id", id);
    if (error) toast.error(error.message);
    else await loadEntries();
  }

  const goalProgress =
    incomeGoal && incomeGoal > 0 ? Math.min(100, Math.round((monthTotal / incomeGoal) * 100)) : null;

  return (
    <div className="space-y-6">
      {/* Stats row — equal columns, aligned */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Month total"
          value={formatMoney(monthTotal)}
          highlight
        />
        <StatCard
          label="Income goal"
          value={incomeGoal != null && incomeGoal > 0 ? formatMoney(incomeGoal) : "—"}
        />
        <StatCard
          label="Progress"
          value={goalProgress != null ? `${goalProgress}%` : "—"}
          sub={
            goalProgress != null ? (
              <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-green transition-all"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
            ) : undefined
          }
        />
      </div>

      {!readOnly && (
        <form
          onSubmit={handleAdd}
          className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 md:p-5"
        >
          <p className="text-sm font-semibold text-neutral-900 mb-4">Log today&apos;s earnings</p>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-3 space-y-1.5">
              <Label htmlFor="earn-date" className="text-xs text-neutral-500 uppercase tracking-wide">
                Date
              </Label>
              <Input
                id="earn-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 bg-white"
                required
              />
            </div>
            <div className="md:col-span-3 space-y-1.5">
              <Label htmlFor="earn-amount" className="text-xs text-neutral-500 uppercase tracking-wide">
                Amount (USD)
              </Label>
              <Input
                id="earn-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 bg-white"
                required
              />
            </div>
            <div className="md:col-span-4 space-y-1.5">
              <Label htmlFor="earn-notes" className="text-xs text-neutral-500 uppercase tracking-wide">
                Notes
              </Label>
              <Input
                id="earn-notes"
                placeholder="e.g. 2 orders completed"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-11 bg-white"
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={saving} className="w-full h-11">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-green" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-12 text-center">
          <DollarSign className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm text-neutral-500">No daily earnings logged this month yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Notes</th>
                {!readOnly && <th className="px-4 py-3 w-12" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {entries.map((row) => (
                <tr key={row.id} className="hover:bg-neutral-50/80">
                  <td className="px-4 py-3 text-neutral-700">{formatDate(row.earned_date)}</td>
                  <td className="px-4 py-3 font-semibold text-brand-green-dark">
                    {formatMoney(Number(row.amount), row.currency)}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{row.notes ?? "—"}</td>
                  {!readOnly && (
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDelete(row.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-neutral-50 font-semibold text-neutral-900">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-brand-green-dark">{formatMoney(monthTotal)}</td>
                <td colSpan={readOnly ? 1 : 2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
  sub,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  sub?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 md:p-5 flex flex-col justify-center min-h-[5.5rem]",
        highlight
          ? "border-brand-green/25 bg-gradient-to-br from-brand-green-light/50 to-white"
          : "border-neutral-200 bg-white"
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p
        className={cn(
          "text-2xl md:text-3xl font-bold mt-1 tabular-nums",
          highlight ? "text-brand-green-dark" : "text-neutral-900"
        )}
      >
        {value}
      </p>
      {sub}
    </div>
  );
}
