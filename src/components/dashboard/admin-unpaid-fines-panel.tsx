"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, BellRing, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { formatFineMoney, obligationLabel } from "@/lib/members/fine-on-ground";
import { formatDateTime } from "@/lib/utils";
import type { FineOnGroundEntry } from "@/types/database";

export interface FineEarningAlert {
  id: string;
  team_member_id: string;
  earned_amount: number;
  earned_currency: string;
  fine_amount: number;
  fine_currency: string;
  year_month: string | null;
  week_number: number | null;
  message: string | null;
  admin_seen_at: string | null;
  created_at: string;
  team_member?: { id: string; full_name: string } | null;
}

interface AdminUnpaidFinesPanelProps {
  /** Compact for dashboard; full for /fines page */
  variant?: "dashboard" | "page";
}

export function AdminUnpaidFinesPanel({ variant = "dashboard" }: AdminUnpaidFinesPanelProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [unpaid, setUnpaid] = useState<FineOnGroundEntry[]>([]);
  const [alerts, setAlerts] = useState<FineEarningAlert[]>([]);
  const [popupAlert, setPopupAlert] = useState<FineEarningAlert | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: fines }, { data: earningAlerts }] = await Promise.all([
      supabase
        .from("fine_on_ground_entries")
        .select("*, team_member:team_members(id, full_name), fiverr_account:fiverr_accounts(id, username)")
        .eq("is_active", true)
        .is("paid_at", null)
        .not("team_member_id", "is", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("fine_earning_alerts")
        .select("*, team_member:team_members(id, full_name)")
        .is("admin_seen_at", null)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    setUnpaid((fines as FineOnGroundEntry[]) ?? []);
    const alertList = (earningAlerts as FineEarningAlert[]) ?? [];
    setAlerts(alertList);
    if (alertList.length > 0) setPopupAlert(alertList[0]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function markPaid(id: string) {
    setMarkingId(id);
    const { error } = await supabase
      .from("fine_on_ground_entries")
      .update({ paid_at: new Date().toISOString(), is_active: false })
      .eq("id", id);

    if (error) toast.error(error.message);
    else {
      toast.success("Marked as paid");
      await load();
    }
    setMarkingId(null);
  }

  async function dismissAlert(id: string) {
    await supabase
      .from("fine_earning_alerts")
      .update({ admin_seen_at: new Date().toISOString() })
      .eq("id", id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setPopupAlert((prev) => (prev?.id === id ? null : prev));
  }

  async function dismissAllAlerts() {
    const ids = alerts.map((a) => a.id);
    if (ids.length === 0) return;
    await supabase
      .from("fine_earning_alerts")
      .update({ admin_seen_at: new Date().toISOString() })
      .in("id", ids);
    setAlerts([]);
    setPopupAlert(null);
  }

  const totalOwed = unpaid.reduce((sum, f) => sum + Number(f.amount ?? 0), 0);
  const currency = unpaid[0]?.currency ?? "NGN";
  const limit = variant === "dashboard" ? 8 : 50;
  const shown = unpaid.slice(0, limit);

  return (
    <>
      {popupAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-amber-200 overflow-hidden">
            <div className="bg-amber-500 px-4 py-3 flex items-center justify-between text-white">
              <p className="font-semibold flex items-center gap-2">
                <BellRing className="h-5 w-5" />
                Member made money — remind about fine
              </p>
              <button type="button" onClick={() => dismissAlert(popupAlert.id)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-lg font-bold text-neutral-900">
                {(popupAlert.team_member as { full_name?: string } | null)?.full_name ?? "A member"} recorded earnings
              </p>
              <p className="text-sm text-neutral-600">
                Earned{" "}
                <strong>
                  {formatFineMoney(Number(popupAlert.earned_amount), popupAlert.earned_currency)}
                </strong>
                {popupAlert.week_number != null && (
                  <> (week {popupAlert.week_number}{popupAlert.year_month ? ` · ${popupAlert.year_month}` : ""})</>
                )}
              </p>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                They still owe a fine of{" "}
                <strong>
                  {formatFineMoney(Number(popupAlert.fine_amount), popupAlert.fine_currency)}
                </strong>
                . Remind them: <em>you have fine on ground</em>.
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={() => dismissAlert(popupAlert.id)}>Got it — I&apos;ll remind them</Button>
                {alerts.length > 1 && (
                  <Button variant="outline" onClick={dismissAllAlerts}>
                    Dismiss all ({alerts.length})
                  </Button>
                )}
                <Link href="/fines">
                  <Button variant="secondary">Open unpaid fines</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <Card className="border-amber-200/80 bg-gradient-to-r from-white to-amber-50/40">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-neutral-900">Unpaid fines &amp; debts</h2>
                <p className="text-sm text-neutral-500 mt-0.5">
                  People who still owe a fine or debt. When they record earnings online, you get an alert
                  to remind them.
                </p>
              </div>
            </div>
            {variant === "dashboard" && (
              <Link href="/fines">
                <Button variant="outline" size="sm">
                  View all
                </Button>
              </Link>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border bg-white p-3">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide">Unpaid people</p>
                  <p className="text-2xl font-bold text-neutral-900 mt-1">
                    {new Set(unpaid.map((f) => f.team_member_id)).size}
                  </p>
                </div>
                <div className="rounded-xl border bg-white p-3">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide">Total owed</p>
                  <p className="text-2xl font-bold text-amber-800 mt-1">
                    {formatFineMoney(totalOwed, currency)}
                  </p>
                </div>
                <div className="rounded-xl border bg-white p-3 col-span-2 sm:col-span-1">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide">New earning alerts</p>
                  <p className="text-2xl font-bold text-neutral-900 mt-1">{alerts.length}</p>
                </div>
              </div>

              {alerts.length > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 space-y-2">
                  <p className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                    <BellRing className="h-4 w-4" />
                    Recent: members with unpaid fines who recorded money
                  </p>
                  <ul className="space-y-2 text-sm">
                    {alerts.slice(0, variant === "dashboard" ? 3 : 10).map((a) => (
                      <li
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white border px-3 py-2"
                      >
                        <span>
                          <strong>
                            {(a.team_member as { full_name?: string } | null)?.full_name ?? "Member"}
                          </strong>{" "}
                          earned {formatFineMoney(Number(a.earned_amount), a.earned_currency)} · owes{" "}
                          {formatFineMoney(Number(a.fine_amount), a.fine_currency)}
                          <span className="block text-xs text-neutral-400">{formatDateTime(a.created_at)}</span>
                        </span>
                        <Button size="sm" variant="outline" onClick={() => dismissAlert(a.id)}>
                          Seen
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {shown.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-6">
                  No unpaid fines right now. Everyone is clear.
                </p>
              ) : (
                <div className="responsive-table rounded-xl border bg-white overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-neutral-500 bg-neutral-50">
                        <th className="p-3 font-medium">Member</th>
                        <th className="p-3 font-medium">Type</th>
                        <th className="p-3 font-medium">Amount</th>
                        <th className="p-3 font-medium">Reason</th>
                        <th className="p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((f) => (
                        <tr key={f.id} className="border-b hover:bg-neutral-50">
                          <td className="p-3 font-medium text-neutral-900">
                            {(f.team_member as { full_name?: string } | null)?.full_name ?? f.input_name}
                          </td>
                          <td className="p-3">
                            <span
                              className={
                                f.obligation_type === "debt"
                                  ? "text-sky-700 font-medium"
                                  : "text-amber-700 font-medium"
                              }
                            >
                              {obligationLabel(f.obligation_type ?? "fine")}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-amber-800">
                            {formatFineMoney(Number(f.amount), f.currency ?? "NGN")}
                          </td>
                          <td className="p-3 text-neutral-600">{f.reason ?? "—"}</td>
                          <td className="p-3">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={markingId === f.id}
                              onClick={() => markPaid(f.id)}
                            >
                              {markingId === f.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Mark paid
                                </>
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {variant === "dashboard" && unpaid.length > limit && (
                <p className="text-xs text-neutral-500 text-center">
                  Showing {limit} of {unpaid.length}.{" "}
                  <Link href="/fines" className="text-brand-green hover:underline">
                    See all unpaid fines
                  </Link>
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
