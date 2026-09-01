"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DollarSign, Loader2, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { formatYearMonthLabel } from "@/lib/utils/dates";
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
    <Card className="border-brand-green/20">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-brand-green" />
          Daily Earnings — {formatYearMonthLabel(yearMonth)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-brand-green-light/30 border border-brand-green/20 p-4">
            <p className="text-xs text-neutral-500">Month total</p>
            <p className="text-2xl font-bold text-brand-green-dark">{formatMoney(monthTotal)}</p>
          </div>
          {incomeGoal != null && incomeGoal > 0 && (
            <div className="rounded-xl bg-neutral-50 border p-4">
              <p className="text-xs text-neutral-500">Income goal</p>
              <p className="text-2xl font-bold">{formatMoney(incomeGoal)}</p>
            </div>
          )}
          {goalProgress != null && (
            <div className="rounded-xl bg-neutral-50 border p-4">
              <p className="text-xs text-neutral-500">Progress</p>
              <p className="text-2xl font-bold">{goalProgress}%</p>
            </div>
          )}
        </div>

        {!readOnly && (
          <form onSubmit={handleAdd} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end border rounded-xl p-4 bg-neutral-50/80">
            <div className="space-y-1.5">
              <Label htmlFor="earn-date">Date</Label>
              <Input id="earn-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="earn-amount">Amount (USD)</Label>
              <Input
                id="earn-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="earn-notes">Notes (optional)</Label>
              <Input
                id="earn-notes"
                placeholder="e.g. 2 orders completed"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Add / Update Day</>}
            </Button>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-brand-green" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-6">
            No daily earnings logged for this month yet.
          </p>
        ) : (
          <div className="responsive-table">
            <table className="w-full text-sm bg-white rounded-xl border">
              <thead>
                <tr className="border-b text-left text-neutral-500 bg-neutral-50">
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Amount</th>
                  <th className="p-3 font-medium">Notes</th>
                  {!readOnly && <th className="p-3 font-medium w-16" />}
                </tr>
              </thead>
              <tbody>
                {entries.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-neutral-50">
                    <td className="p-3">{formatDate(row.earned_date)}</td>
                    <td className="p-3 font-semibold text-brand-green-dark">
                      {formatMoney(Number(row.amount), row.currency)}
                    </td>
                    <td className="p-3 text-neutral-600">{row.notes ?? "—"}</td>
                    {!readOnly && (
                      <td className="p-3">
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-50 font-semibold">
                  <td className="p-3">Total</td>
                  <td className="p-3 text-brand-green-dark">{formatMoney(monthTotal)}</td>
                  <td colSpan={readOnly ? 1 : 2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
