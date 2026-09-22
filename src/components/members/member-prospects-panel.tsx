"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Target, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { weekForCalendarDate } from "@/lib/members/week-utils";
import { currentYearMonthLagos } from "@/lib/members/progress-metrics";
import { formatDate } from "@/lib/utils";
import type { MemberProspectEntry } from "@/types/database";

function todayLagos(): string {
  // Approximate Lagos calendar date from local ISO with offset handled via toLocale
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

interface MemberProspectsPanelProps {
  teamMemberId: string;
  prospectsGoal?: number | null;
  officeProspectsGoal?: number | null;
}

export function MemberProspectsPanel({
  teamMemberId,
  prospectsGoal,
  officeProspectsGoal,
}: MemberProspectsPanelProps) {
  const supabase = createClient();
  const yearMonth = currentYearMonthLagos();
  const monthStart = `${yearMonth}-01`;
  const [y, m] = yearMonth.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const monthEnd = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<MemberProspectEntry[]>([]);
  const [loggedDate, setLoggedDate] = useState(todayLagos);
  const [prospects, setProspects] = useState("");
  const [officeProspects, setOfficeProspects] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("member_prospect_entries")
      .select("*")
      .eq("team_member_id", teamMemberId)
      .gte("logged_date", monthStart)
      .lte("logged_date", monthEnd)
      .order("logged_date", { ascending: false });

    if (error) toast.error(error.message);
    setEntries((data as MemberProspectEntry[]) ?? []);
    setLoading(false);
  }, [supabase, teamMemberId, monthStart, monthEnd]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(
    () => ({
      prospects: entries.reduce((s, e) => s + Number(e.prospects_count ?? 0), 0),
      office: entries.reduce((s, e) => s + Number(e.office_prospects_count ?? 0), 0),
    }),
    [entries]
  );

  async function syncWeekTotals(date: string) {
    const mapped = weekForCalendarDate(date);
    if (!mapped) return;

    const weekStartDay = (mapped.week - 1) * 7 + 1;
    const weekEndDay = Math.min(weekStartDay + 6, lastDay);
    const from = `${mapped.yearMonth}-${String(weekStartDay).padStart(2, "0")}`;
    const to = `${mapped.yearMonth}-${String(weekEndDay).padStart(2, "0")}`;

    const { data: weekRows } = await supabase
      .from("member_prospect_entries")
      .select("prospects_count, office_prospects_count")
      .eq("team_member_id", teamMemberId)
      .gte("logged_date", from)
      .lte("logged_date", to);

    const prospectsSum = (weekRows ?? []).reduce((s, r) => s + Number(r.prospects_count ?? 0), 0);
    const officeSum = (weekRows ?? []).reduce(
      (s, r) => s + Number(r.office_prospects_count ?? 0),
      0
    );

    const { data: existing } = await supabase
      .from("member_weekly_earnings")
      .select("id, is_locked")
      .eq("team_member_id", teamMemberId)
      .eq("year_month", mapped.yearMonth)
      .eq("week_number", mapped.week)
      .maybeSingle();

    if (existing?.is_locked) return;

    const now = new Date().toISOString();
    if (existing?.id) {
      await supabase
        .from("member_weekly_earnings")
        .update({
          prospects_count: prospectsSum,
          office_prospects_count: officeSum,
          updated_at: now,
        })
        .eq("id", existing.id);
    } else if (prospectsSum > 0 || officeSum > 0) {
      await supabase.from("member_weekly_earnings").insert({
        team_member_id: teamMemberId,
        year_month: mapped.yearMonth,
        week_number: mapped.week,
        amount: 0,
        currency: "USD",
        prospects_count: prospectsSum,
        office_prospects_count: officeSum,
        contacts_count: 0,
        personal_pv: 0,
        group_pv: 0,
        is_locked: false,
        updated_at: now,
      });
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const p = prospects.trim() === "" ? 0 : parseInt(prospects, 10);
    const o = officeProspects.trim() === "" ? 0 : parseInt(officeProspects, 10);
    if (Number.isNaN(p) || p < 0 || Number.isNaN(o) || o < 0) {
      toast.error("Enter valid numbers (0 or higher)");
      return;
    }
    if (!loggedDate) {
      toast.error("Pick a date");
      return;
    }
    if (p === 0 && o === 0 && !notes.trim()) {
      toast.error("Enter at least one prospect number");
      return;
    }

    setSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from("member_prospect_entries").upsert(
      {
        team_member_id: teamMemberId,
        logged_date: loggedDate,
        prospects_count: p,
        office_prospects_count: o,
        notes: notes.trim() || null,
        updated_at: now,
      },
      { onConflict: "team_member_id,logged_date" }
    );

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    await syncWeekTotals(loggedDate);
    toast.success("Prospects saved");
    setProspects("");
    setOfficeProspects("");
    setNotes("");
    setLoggedDate(todayLagos());
    await load();
    setSaving(false);
  }

  async function handleDelete(id: string, date: string) {
    if (!window.confirm("Remove this prospect log?")) return;
    const { error } = await supabase.from("member_prospect_entries").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await syncWeekTotals(date);
    toast.success("Removed");
    await load();
  }

  function editEntry(entry: MemberProspectEntry) {
    setLoggedDate(entry.logged_date);
    setProspects(String(entry.prospects_count ?? 0));
    setOfficeProspects(String(entry.office_prospects_count ?? 0));
    setNotes(entry.notes ?? "");
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-brand-green/20 bg-gradient-to-br from-brand-green-light/30 to-white">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Prospects this month
            </p>
            <p className="text-3xl font-extrabold text-neutral-900 mt-1 tabular-nums">
              {totals.prospects}
              {prospectsGoal != null && prospectsGoal > 0 && (
                <span className="text-base font-normal text-neutral-400">
                  {" "}
                  / {prospectsGoal}
                </span>
              )}
            </p>
          </CardContent>
        </Card>
        <Card className="border-violet-100 bg-gradient-to-br from-violet-50 to-white">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Office prospects
            </p>
            <p className="text-3xl font-extrabold text-neutral-900 mt-1 tabular-nums">
              {totals.office}
              {officeProspectsGoal != null && officeProspectsGoal > 0 && (
                <span className="text-base font-normal text-neutral-400">
                  {" "}
                  / {officeProspectsGoal}
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-brand-green" />
            Log prospects
          </CardTitle>
          <p className="text-sm text-neutral-500">
            Enter how many prospects you got for a day. You can update the same day later.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="loggedDate">Date</Label>
                <Input
                  id="loggedDate"
                  type="date"
                  value={loggedDate}
                  max={todayLagos()}
                  onChange={(e) => setLoggedDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prospects">Prospects</Label>
                <Input
                  id="prospects"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={prospects}
                  onChange={(e) => setProspects(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="officeProspects">Office prospects</Label>
                <Input
                  id="officeProspects"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={officeProspects}
                  onChange={(e) => setOfficeProspects(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="Where did these prospects come from?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
              />
            </div>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
              Save prospects
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-sky-600" />
            This month&apos;s log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-brand-green" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-8">
              No prospect numbers logged yet this month.
            </p>
          ) : (
            <div className="responsive-table rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-neutral-50 text-left text-neutral-500">
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium text-right">Prospects</th>
                    <th className="p-3 font-medium text-right">Office</th>
                    <th className="p-3 font-medium">Notes</th>
                    <th className="p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b hover:bg-neutral-50">
                      <td className="p-3 font-medium">{formatDate(e.logged_date)}</td>
                      <td className="p-3 text-right tabular-nums">{e.prospects_count}</td>
                      <td className="p-3 text-right tabular-nums">{e.office_prospects_count}</td>
                      <td className="p-3 text-neutral-500 max-w-[200px] truncate">
                        {e.notes || "—"}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => editEntry(e)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(e.id, e.logged_date)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
